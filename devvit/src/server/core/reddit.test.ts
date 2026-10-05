import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRedditApi, type RedditReader, type SourceComment, type SourcePost } from './reddit.ts';

const post = (overrides: Partial<SourcePost> = {}): SourcePost => ({
  id: 't3_example', title: 'A public post', subredditName: 'science', authorName: 'reader',
  score: 42, numberOfComments: 7, body: 'Public text',
  permalink: '/r/science/comments/example/a_public_post/', url: 'https://example.org/article',
  nsfw: false, removed: false, ...overrides,
});
const comment = (overrides: Partial<SourceComment> = {}): SourceComment => ({
  id: 't1_comment', authorName: 'commenter', body: 'A public comment', score: 3,
  removed: false, ...overrides,
});
const listing = <T>(items: T[]) => ({ all: async () => items });

function fakeReader(overrides: Partial<RedditReader> = {}) {
  const calls: { method: string; options: unknown }[] = [];
  const reader: RedditReader = {
    getHotPosts(options) { calls.push({ method: 'hot', options }); return listing([post()]); },
    searchPosts(options) { calls.push({ method: 'search', options }); return listing([post()]); },
    async getPostById(postId) { calls.push({ method: 'post', options: postId }); return post(); },
    getComments(options) { calls.push({ method: 'comments', options }); return listing([comment()]); },
    ...overrides,
  };
  return { reader, calls };
}

void test('invalid communities, oversized searches, and malformed post IDs do not read Reddit', async () => {
  const { reader, calls } = fakeReader();
  const api = createRedditApi(reader);
  for (const path of [
    '/feed?community=unlisted', '/feed?community=', `/feed?q=${'a'.repeat(201)}`,
    '/comments', '/comments?postId=example', '/comments?postId=t1_comment',
    '/comments?postId=t3_', '/comments?postId=t3_abc%2Fdef',
  ]) {
    assert.equal((await api.request(path)).status, 400, path);
  }
  assert.deepEqual(calls, []);
});

void test('hot feed defaults to popular and returns only explicit public DTO fields', async () => {
  const { reader, calls } = fakeReader();
  const response = await createRedditApi(reader).request('/feed');
  assert.equal(response.status, 200);
  assert.deepEqual(calls, [{ method: 'hot', options: { limit: 30, pageSize: 30, subredditName: 'popular' } }]);
  assert.deepEqual(await response.json(), { posts: [{
    id: 't3_example', title: 'A public post', community: 'science', author: 'reader',
    score: 42, count: 7, body: 'Public text',
    permalink: '/r/science/comments/example/a_public_post/', url: 'https://example.org/article', accent: 'sage',
  }] });
});

void test('feed excludes NSFW and removed posts, handles absent bodies, and caps results at 30', async () => {
  const { reader } = fakeReader({ getHotPosts: () => listing([
    post({ id: 't3_nsfw', nsfw: true }), post({ id: 't3_removed', removed: true }),
    ...Array.from({ length: 32 }, (_, i) => post({ id: `t3_safe${i}`, body: undefined })),
  ]) });
  const response = await createRedditApi(reader).request('/feed?community=science');
  const expected = Array.from({ length: 30 }, (_, i) => ({
    id: `t3_safe${i}`, title: 'A public post', community: 'science', author: 'reader',
    score: 42, count: 7, body: '',
    permalink: '/r/science/comments/example/a_public_post/', url: 'https://example.org/article', accent: 'sage',
  }));
  assert.deepEqual(await response.json(), { posts: expected });
});

void test('popular search is global, selected-community search is scoped, and blank search uses hot', async () => {
  const { reader, calls } = fakeReader();
  const api = createRedditApi(reader);
  assert.equal((await api.request('/feed?community=popular&q=%20orbital%20science%20')).status, 200);
  assert.equal((await api.request('/feed?community=technology&q=chips')).status, 200);
  assert.equal((await api.request('/feed?community=books&q=%20%20')).status, 200);
  assert.equal((await api.request(`/feed?community=design&q=${'a'.repeat(200)}`)).status, 200);
  assert.deepEqual(calls, [
    { method: 'search', options: { limit: 30, pageSize: 30, query: 'orbital science' } },
    { method: 'search', options: { limit: 30, pageSize: 30, query: 'chips', subredditName: 'technology' } },
    { method: 'hot', options: { limit: 30, pageSize: 30, subredditName: 'books' } },
    { method: 'search', options: { limit: 30, pageSize: 30, query: 'a'.repeat(200), subredditName: 'design' } },
  ]);
});

void test('comments verify the selected post, allow popular-result communities, and use a shallow listing', async () => {
  const { reader, calls } = fakeReader();
  reader.getPostById = async (postId) => {
    calls.push({ method: 'post', options: postId });
    return post({ id: postId, subredditName: 'AskReddit' });
  };
  const response = await createRedditApi(reader).request('/comments?postId=t3_example');
  assert.equal(response.status, 200);
  assert.deepEqual(calls, [
    { method: 'post', options: 't3_example' },
    { method: 'comments', options: { postId: 't3_example', limit: 30, pageSize: 30, depth: 1 } },
  ]);
  assert.deepEqual(await response.json(), { comments: [{
    id: 't1_comment', author: 'commenter', body: 'A public comment', score: 3,
  }] });
});

void test('unsafe or removed posts never trigger comment reads', async () => {
  for (const hiddenPost of [post({ nsfw: true }), post({ removed: true })]) {
    const { reader, calls } = fakeReader({ getPostById: async () => hiddenPost });
    const response = await createRedditApi(reader).request('/comments?postId=t3_example');
    assert.equal(response.status, 404);
    assert.deepEqual(calls, []);
  }
});

void test('comment results exclude removed bodies and are capped at 30', async () => {
  const { reader } = fakeReader({ getComments: () => listing([
    comment({ id: 't1_removed', body: 'Removed text', removed: true }),
    ...Array.from({ length: 35 }, (_, i) => comment({ id: `t1_safe${i}` })),
  ]) });
  const response = await createRedditApi(reader).request('/comments?postId=t3_example');
  assert.deepEqual(await response.json(), { comments: Array.from({ length: 30 }, (_, i) => ({
    id: `t1_safe${i}`, author: 'commenter', body: 'A public comment', score: 3,
  })) });
});

void test('an identifiable HTTP 429 preserves valid Retry-After without leaking provider details', async () => {
  for (const headers of [
    { 'retry-after': '37' },
    new Headers({ 'Retry-After': 'Mon, 05 Oct 2026 18:00:00 GMT' }),
  ]) {
    const error = Object.assign(new Error('provider request secret=private'), { statusCode: 429, headers });
    const { reader } = fakeReader({ getHotPosts: () => { throw error; } });
    const response = await createRedditApi(reader).request('/feed');
    assert.equal(response.status, 429);
    assert.equal(response.headers.get('Retry-After'), headers instanceof Headers ? headers.get('Retry-After') : '37');
    assert.deepEqual(await response.json(), { error: 'Reddit is receiving too many requests. Please try again shortly.' });
  }
});

void test('429 does not invent a Retry-After when absent or malformed', async () => {
  for (const headers of [{}, { 'Retry-After': 'soon' }, { 'Retry-After': '10\r\nx-secret: hidden' }]) {
    const error = Object.assign(new Error('private provider detail'), { response: { status: 429, headers } });
    const { reader } = fakeReader({ searchPosts: () => ({ all: async () => { throw error; } }) });
    const response = await createRedditApi(reader).request('/feed?q=hello');
    assert.equal(response.status, 429);
    assert.equal(response.headers.get('Retry-After'), null);
  }
});

void test('exact Twirp codes preserve rate limits and access failures without guessing from messages', async () => {
  for (const [code, expected] of [
    ['resource_exhausted', 429], ['permission_denied', 403], ['unauthenticated', 403], ['not_found', 404],
    ['unknown', 502],
  ]) {
    const error = Object.assign(new Error('private resource_exhausted provider traceback'), {
      code, meta: { 'retry-after': '25', secret: 'private' },
    });
    const { reader } = fakeReader({ getHotPosts: () => { throw error; } });
    const response = await createRedditApi(reader).request('/feed');
    assert.equal(response.status, expected);
    assert.equal(response.headers.get('Retry-After'), code === 'resource_exhausted' ? '25' : null);
    assert.doesNotMatch(await response.text(), /private|traceback|resource_exhausted/);
  }
  const error = Object.assign(new Error('resource_exhausted'), { code: 'resource_exhausted' });
  const { reader } = fakeReader({ getHotPosts: () => { throw error; } });
  const response = await createRedditApi(reader).request('/feed');
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('Retry-After'), null);
});

void test('restricted, missing, and unknown SDK failures are useful and do not leak raw errors', async () => {
  for (const [status, expected] of [[401, 403], [403, 403], [404, 404], [500, 502], [undefined, 502]]) {
    const error = Object.assign(new Error('token=private SDK traceback'), { status });
    const { reader } = fakeReader({ getPostById: async () => { throw error; } });
    const response = await createRedditApi(reader).request('/comments?postId=t3_example');
    assert.equal(response.status, expected);
    assert.doesNotMatch(await response.text(), /private|token|traceback/);
  }
});

void test('empty listings remain successful empty results', async () => {
  const { reader } = fakeReader({ getHotPosts: () => listing([]), getComments: () => listing([]) });
  const api = createRedditApi(reader);
  const feed = await api.request('/feed');
  const comments = await api.request('/comments?postId=t3_example');
  assert.equal(feed.status, 200);
  assert.equal(comments.status, 200);
  assert.deepEqual(await feed.json(), { posts: [] });
  assert.deepEqual(await comments.json(), { comments: [] });
});
