const cache = new Map();
let requests = [];
let blockedUntil = 0;
const BASE = '/api/reddit';
export function safeUrl(value) {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : null; } catch { return null; }
}
export function normalizePost(data) {
  return {id:data.id, title:data.title, community:data.subreddit, author:data.author, score:data.score || 0, count:data.num_comments || 0, body:data.selftext || '', permalink:data.permalink, url:safeUrl(data.url), accent:'sage'};
}
export async function requestJson(path, signal, decode = data => data) {
  const now = Date.now();
  const hit = cache.get(path);
  if (hit && now - hit.time < 300000) return decode(hit.data);
  requests = requests.filter(time => now - time < 60000);
  if (now < blockedUntil || requests.length >= 10) throw new Error('A short pause is needed. Please try again in a minute, or explore sample conversations.');
  requests.push(now);
  let response;
  try { response = await fetch(BASE + path, {signal, credentials:'omit'}); }
  catch (error) { if (error.name === 'AbortError') throw error; throw new Error('Reddit could not be reached. Check your connection, retry, or explore sample conversations.'); }
  if (response.status === 429) {
    const retry = response.headers.get('retry-after');
    const seconds = Number(retry);
    blockedUntil = now + (retry && Number.isFinite(seconds) ? Math.max(60, seconds) * 1000 : 60000);
    throw new Error('Reddit is limiting requests. Please try again in a minute, or explore sample conversations.');
  }
  if (response.status === 503) throw new Error('Live Reddit is waiting for approved API access and server configuration. You can still explore sample conversations.');
  if (!response.ok) throw new Error(response.status === 403 || response.status === 401 ? 'Reddit access is unavailable. This connection may require approved API access. You can still explore sample conversations.' : 'Reddit is having trouble responding. Try again shortly or explore sample conversations.');
  let data;
  try { data = await response.json(); } catch { throw new Error('Reddit returned an unreadable response. Please try again.'); }
  const result = decode(data);
  cache.set(path, {time:now, data});
  return result;
}
export async function fetchPosts({community, query}, signal) {
  const root = `/r/${encodeURIComponent(community)}`;
  const path = query ? `${community === 'popular' ? '' : root}/search.json?q=${encodeURIComponent(query)}&restrict_sr=${community !== 'popular'}&limit=30&raw_json=1` : `${root}.json?limit=30&raw_json=1`;
  return requestJson(path, signal, data => {
    if (!Array.isArray(data?.data?.children)) throw new Error('Reddit returned an unexpected listing. Please try again.');
    return data.data.children.filter(item => item.kind === 't3' && !item.data.over_18).map(item => normalizePost(item.data));
  });
}
export async function fetchComments(post, signal) {
  if (!/^\/r\/[^/]+\/comments\/[a-z0-9]+\//i.test(post.permalink || '')) throw new Error('This discussion does not have a valid Reddit link.');
  return requestJson(`${post.permalink.replace(/\/$/, '')}.json?limit=30&raw_json=1`, signal, data => {
    if (!Array.isArray(data?.[1]?.data?.children)) throw new Error('Comments are unavailable. Please try again.');
    return data[1].data.children.filter(item => item.kind === 't1').map(({data:comment}) => ({id:comment.id, author:comment.author, body:comment.body, score:comment.score}));
  });
}
