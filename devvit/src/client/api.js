const cache = new Map();
let requests = [];
let blockedUntil = 0;
const BASE = '/api';

export function safeUrl(value) {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : null; } catch { return null; }
}

export async function requestJson(path, signal, decode = data => data) {
  const now = Date.now();
  for (const [key, entry] of cache) if (now - entry.time >= 300000) cache.delete(key);
  const hit = cache.get(path);
  if (hit) return decode(hit.data);
  requests = requests.filter(time => now - time < 60000);
  if (now < blockedUntil || requests.length >= 10) throw new Error('A short pause is needed. Please try again in a minute, or explore sample conversations.');
  requests.push(now);
  let response;
  try { response = await fetch(BASE + path, {signal}); }
  catch (error) { if (error.name === 'AbortError') throw error; throw new Error('Reddit could not be reached. Check your connection, retry, or explore sample conversations.', {cause:error}); }
  if (response.status === 429) {
    const retry = response.headers.get('retry-after');
    const seconds = Number(retry);
    const delay = retry && Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retry) - now;
    blockedUntil = now + Math.max(60000, Number.isFinite(delay) ? delay : 60000);
    throw new Error('Reddit is limiting requests. Please try again in a minute, or explore sample conversations.');
  }
  if (!response.ok) throw new Error(response.status === 403 || response.status === 401 ? 'Reddit access is unavailable for this request. Try another community or explore sample conversations.' : response.status === 404 ? 'This conversation is no longer available. Try another post.' : 'Reddit is having trouble responding. Try again shortly or explore sample conversations.');
  let data;
  try { data = await response.json(); } catch { throw new Error('Reddit returned an unreadable response. Please try again.'); }
  const result = decode(data);
  if (cache.size >= 100) cache.delete(cache.keys().next().value);
  cache.set(path, {time:now, data});
  return result;
}

function validPost(post) {
  return post && typeof post.id === 'string' && typeof post.title === 'string' &&
    typeof post.community === 'string' && typeof post.author === 'string' &&
    typeof post.body === 'string' && Number.isFinite(post.score) && Number.isFinite(post.count);
}
export async function fetchPosts({community, query}, signal) {
  const path = `/feed?community=${encodeURIComponent(community)}&q=${encodeURIComponent(query)}`;
  return requestJson(path, signal, data => {
    if (!Array.isArray(data?.posts) || !data.posts.every(validPost)) throw new Error('Reddit returned an unexpected listing. Please try again.');
    return data.posts.map(post => ({...post, url:safeUrl(post.url)}));
  });
}
export async function fetchComments(post, signal) {
  if (!/^t3_[a-z0-9]+$/i.test(post.id || '')) throw new Error('This discussion does not have a valid Reddit post ID.');
  return requestJson(`/comments?postId=${encodeURIComponent(post.id)}`, signal, data => {
    if (!Array.isArray(data?.comments) || !data.comments.every(comment => comment &&
      typeof comment.id === 'string' && typeof comment.author === 'string' &&
      typeof comment.body === 'string' && Number.isFinite(comment.score))) {
      throw new Error('Comments are unavailable. Please try again.');
    }
    return data.comments;
  });
}
