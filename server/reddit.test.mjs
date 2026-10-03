import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from './index.js';
import { createRedditClient } from './reddit.js';

const env = { REDDIT_API_APPROVED: 'true', REDDIT_CLIENT_ID: 'fixture-id', REDDIT_CLIENT_SECRET: 'fixture-secret', REDDIT_USER_AGENT: 'web:threadlight-test:v1 (by /u/test)' };
const response = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers });
const authorization = () => response({ access_token: 'fixture-access', token_type: 'bearer', expires_in: 3600 });
const listing = { data: { children: [{ kind: 't3', data: { id: 'abc', title: 'A post', author: 'reader', subreddit: 'science', permalink: '/r/science/comments/abc/a_post/', selftext: 'Body' } }] } };
const local = pathname => new URL(pathname, 'http://localhost');
const feed = '/api/reddit/r/science.json?limit=30&raw_json=1';

async function withServer(options, callback) {
  const server = createApp(options);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await callback(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

test('approval and credentials gate all provider requests; built app and API errors stay local', async () => {
  const dist = await mkdtemp(path.join(os.tmpdir(), 'threadlight-test-'));
  await writeFile(path.join(dist, 'index.html'), '<h1>Threadlight</h1>');
  let calls = 0;
  try {
    await withServer({ env: { ...env, REDDIT_API_APPROVED: 'false' }, dist, fetchImpl: async () => { calls++; throw new Error('Unexpected external request'); } }, async base => {
      const page = await fetch(base);
      assert.equal(page.status, 200);
      assert.match(page.headers.get('content-security-policy'), /connect-src 'self'/);
      assert.match(await page.text(), /Threadlight/);
      assert.deepEqual(await (await fetch(base + '/api/status')).json(), { liveAvailable: false });
      const blocked = await fetch(base + feed);
      assert.equal(blocked.status, 503);
      assert.match((await blocked.json()).error, /approved API access/);
      assert.equal((await fetch(base + '/.env')).status, 404);
      assert.equal((await fetch(base + feed, { method: 'POST' })).status, 405);
    });
    const missing = createRedditClient({ env: { ...env, REDDIT_CLIENT_SECRET: '' }, fetchImpl: async () => { calls++; } });
    await assert.rejects(missing.read(local(feed)), error => error.status === 503);
    assert.equal(calls, 0);
  } finally { await rm(dist, { recursive: true, force: true }); }
});

test('same-origin listing, search and comments use fixed OAuth hosts without exposing credentials', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).endsWith('/access_token')) return authorization();
    if (String(url).includes('/comments/')) return response([{}, { data: { children: [{ kind: 't1', data: { id: 'reply', author: 'reader', body: 'Comment', score: 2 } }] } }]);
    return response(listing);
  };
  await withServer({ env, fetchImpl }, async base => {
    for (const route of [feed, '/api/reddit/r/books/search.json?q=a%20%26%20b&restrict_sr=true&limit=30&raw_json=1', '/api/reddit/search.json?q=science&restrict_sr=false', '/api/reddit/r/science/comments/abc/a_post.json']) {
      const result = await fetch(base + route);
      assert.equal(result.status, 200);
      assert.equal((await result.text()).includes('fixture-'), false);
    }
    const count = calls.length;
    assert.equal((await fetch(base + '/api/reddit/https://example.com')).status, 404);
    assert.equal((await fetch(base + '/api/reddit/r/unknown.json')).status, 400);
    assert.equal((await fetch(base + feed + '&url=https://example.com')).status, 400);
    assert.equal(calls.length, count);
  });
  assert.equal(calls[0].url, 'https://www.reddit.com/api/v1/access_token');
  const body = new URLSearchParams(calls[0].options.body);
  assert.equal(body.get('grant_type'), 'https://oauth.reddit.com/grants/installed_client');
  assert.equal(body.get('device_id'), 'DO_NOT_TRACK_THIS_DEVICE');
  assert.equal(calls[0].options.headers.Authorization, `Basic ${Buffer.from('fixture-id:fixture-secret').toString('base64')}`);
  for (const call of calls.slice(1)) {
    assert.equal(new URL(call.url).origin, 'https://oauth.reddit.com');
    assert.equal(call.options.headers.Authorization, 'Bearer fixture-access');
    assert.equal(call.options.headers['User-Agent'], env.REDDIT_USER_AGENT);
    assert.equal(call.options.redirect, 'error');
  }
  assert.equal(new URL(calls[2].url).searchParams.get('q'), 'a & b');
});

test('concurrent reads share one token and response; expired cache and token are renewed', async () => {
  let time = 0;
  const calls = [];
  const client = createRedditClient({ env, now: () => time, fetchImpl: async url => { calls.push(String(url)); return String(url).endsWith('/access_token') ? authorization() : response(listing); } });
  await Promise.all([client.read(local(feed)), client.read(local(feed))]);
  await client.read(local(feed));
  assert.equal(calls.length, 2);
  time += 301000;
  await client.read(local(feed));
  assert.equal(calls.length, 3);
  time += 3600000;
  await client.read(local(feed));
  assert.equal(calls.filter(url => url.endsWith('/access_token')).length, 2);
});

test('malformed responses are not cached and authentication errors stay sanitized', async () => {
  for (const malformed of [null, { access_token: 'fixture-access', token_type: 123, expires_in: 3600 }]) {
    const invalidToken = createRedditClient({ env, fetchImpl: async () => response(malformed) });
    await assert.rejects(invalidToken.read(local(feed)), error => error.status === 502 && /authentication/.test(error.message));
  }
  const replies = [authorization(), response({ wrong: true }), response(listing), response({ private: 'do-not-expose' }, 401), authorization(), response(listing)];
  const client = createRedditClient({ env, fetchImpl: async () => replies.shift() });
  await assert.rejects(client.read(local(feed)), error => error.status === 502);
  assert.equal((await client.read(local(feed))).data.children.length, 1);
  const other = '/api/reddit/r/books.json';
  await assert.rejects(client.read(local(other)), error => error.status === 503 && !error.message.includes('do-not-expose'));
  assert.equal((await client.read(local(other))).data.children.length, 1);
  assert.equal(replies.length, 0);
});

test('provider cooldown and local request budget prevent additional outbound requests', async () => {
  let time = 0;
  let calls = 0;
  const client = createRedditClient({ env, now: () => time, fetchImpl: async url => {
    calls++;
    if (String(url).endsWith('/access_token')) return authorization();
    return calls === 2 ? response({}, 429, { 'retry-after': '120' }) : response(listing);
  } });
  await assert.rejects(client.read(local(feed)), error => error.status === 429 && error.retryAfter === 120);
  await assert.rejects(client.read(local(feed)), error => error.status === 429);
  assert.equal(calls, 2);
  time += 120000;
  for (let i = 0; i < 10; i++) await client.read(local(`/api/reddit/search.json?q=query${i}`));
  await assert.rejects(client.read(local('/api/reddit/search.json?q=extra')), error => error.status === 429);
  assert.equal(calls, 12);
});
