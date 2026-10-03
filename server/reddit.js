const communities = new Set(['popular', 'technology', 'science', 'design', 'space', 'books']);
const unavailable = 'Live Reddit is waiting for approved API access and server configuration. You can explore the clearly labelled sample conversations.';

export class ApiError extends Error {
  constructor(status, message, retryAfter) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

function route(url) {
  const pathname = url.pathname.replace(/^\/api\/reddit/, '');
  const listing = pathname.match(/^\/r\/([a-z0-9_]{3,21})\.json$/i);
  const search = pathname.match(/^(?:\/r\/([a-z0-9_]{3,21}))?\/search\.json$/i);
  const comments = pathname.match(/^\/r\/([a-z0-9_]{3,21})\/comments\/([a-z0-9]{1,12})\/[^/]*\.json$/i);
  if (!listing && !search && !comments) throw new ApiError(404, 'API route not found.');
  const allowed = new Set(search ? ['q', 'restrict_sr', 'limit', 'raw_json'] : ['limit', 'raw_json']);
  for (const key of url.searchParams.keys()) {
    if (!allowed.has(key) || url.searchParams.getAll(key).length !== 1) throw new ApiError(400, 'Invalid request parameters.');
  }
  if ((url.searchParams.has('limit') && url.searchParams.get('limit') !== '30') ||
      (url.searchParams.has('raw_json') && url.searchParams.get('raw_json') !== '1')) throw new ApiError(400, 'Invalid request parameters.');
  const community = (listing?.[1] || search?.[1] || '').toLowerCase();
  if ((listing || search?.[1]) && !communities.has(community)) throw new ApiError(400, 'Choose one of the available communities.');
  const query = url.searchParams.get('q') || '';
  if (search && (!query.trim() || query.length > 200)) throw new ApiError(400, 'Search must contain 1–200 characters.');
  if (search && url.searchParams.has('restrict_sr') && url.searchParams.get('restrict_sr') !== String(Boolean(search[1]))) throw new ApiError(400, 'Invalid search scope.');
  const upstream = new URL('https://oauth.reddit.com');
  upstream.pathname = listing ? `/r/${community}/hot` : search ? `${community ? `/r/${community}` : ''}/search` : `/r/${comments[1]}/comments/${comments[2]}`;
  upstream.searchParams.set('limit', '30');
  upstream.searchParams.set('raw_json', '1');
  if (search) {
    upstream.searchParams.set('q', query);
    upstream.searchParams.set('restrict_sr', String(Boolean(community)));
  }
  return { upstream, comments: Boolean(comments) };
}

function validate(data, comments) {
  const children = comments ? data?.[1]?.data?.children : data?.data?.children;
  if (!Array.isArray(children)) throw new ApiError(502, 'Reddit returned an unexpected response. Please try again.');
  const kind = comments ? 't1' : 't3';
  const items = children.filter(item => item?.kind === kind && !item.data?.over_18);
  if (items.some(item => !item.data || typeof item.data.id !== 'string' || typeof item.data.author !== 'string' ||
      (comments ? typeof item.data.body !== 'string' : typeof item.data.title !== 'string' || typeof item.data.subreddit !== 'string'))) {
    throw new ApiError(502, 'Reddit returned an unexpected response. Please try again.');
  }
  const projected = items.map(({ data: value }) => ({ kind, data: comments
    ? { id: value.id, author: value.author, body: value.body, score: value.score }
    : { id: value.id, title: value.title, subreddit: value.subreddit, author: value.author, score: value.score,
      num_comments: value.num_comments, selftext: value.selftext, permalink: value.permalink, url: value.url } }));
  return comments ? [{}, { data: { children: projected } }] : { data: { children: projected } };
}

export function createRedditClient({ env = process.env, fetchImpl = globalThis.fetch, now = Date.now } = {}) {
  const enabled = env.REDDIT_API_APPROVED === 'true' && Boolean(env.REDDIT_CLIENT_ID && env.REDDIT_CLIENT_SECRET && env.REDDIT_USER_AGENT);
  let token;
  let tokenPending;
  let blockedUntil = 0;
  let requests = [];
  const cache = new Map();
  const pending = new Map();

  function checkLimit() {
    const time = now();
    requests = requests.filter(at => time - at < 60000);
    if (time < blockedUntil || requests.length >= 10) {
      const until = Math.max(blockedUntil, requests.length >= 10 ? requests[0] + 60000 : time);
      throw new ApiError(429, 'A short pause is needed. Please try again shortly, or explore sample conversations.', Math.max(1, Math.ceil((until - time) / 1000)));
    }
    requests.push(time);
  }

  async function send(url, options = {}) {
    checkLimit();
    let response;
    try {
      response = await fetchImpl(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(10000) });
    } catch {
      throw new ApiError(502, 'Reddit could not be reached. Please try again shortly.');
    }
    const retry = response.headers.get('retry-after');
    const retrySeconds = Number(retry);
    const reset = Number(response.headers.get('x-ratelimit-reset'));
    if (response.status === 429 || response.headers.get('x-ratelimit-remaining') === '0') {
      const delay = retry && Number.isFinite(retrySeconds) ? retrySeconds : retry && Number.isFinite(Date.parse(retry)) ? (Date.parse(retry) - now()) / 1000 : Number.isFinite(reset) ? reset : 60;
      blockedUntil = Math.max(blockedUntil, now() + Math.max(60, delay) * 1000);
    }
    if (response.status === 429) throw new ApiError(429, 'Reddit is limiting requests. Please try again shortly, or explore sample conversations.', Math.ceil((blockedUntil - now()) / 1000));
    if (!response.ok) {
      if (response.status === 401) token = undefined;
      throw new ApiError(response.status === 401 || response.status === 403 ? 503 : 502,
        response.status === 401 || response.status === 403 ? unavailable : 'Reddit is having trouble responding. Please try again shortly.');
    }
    try { return await response.json(); }
    catch { throw new ApiError(502, 'Reddit returned an unreadable response. Please try again.'); }
  }

  async function accessToken() {
    if (token && now() < token.expiresAt) return token.value;
    if (!tokenPending) {
      tokenPending = (async () => {
        const data = await send('https://www.reddit.com/api/v1/access_token', {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${env.REDDIT_CLIENT_ID}:${env.REDDIT_CLIENT_SECRET}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': env.REDDIT_USER_AGENT,
          },
          body: new URLSearchParams({ grant_type: 'https://oauth.reddit.com/grants/installed_client', device_id: 'DO_NOT_TRACK_THIS_DEVICE' }).toString(),
        });
        if (!data || typeof data.access_token !== 'string' || !data.access_token || typeof data.token_type !== 'string' || data.token_type.toLowerCase() !== 'bearer' || !Number.isFinite(data.expires_in) || data.expires_in <= 0) {
          throw new ApiError(502, 'Reddit authentication could not be completed.');
        }
        token = { value: data.access_token, expiresAt: now() + Math.max(1, data.expires_in - 30) * 1000 };
        return token.value;
      })().finally(() => { tokenPending = undefined; });
    }
    return tokenPending;
  }

  async function read(url) {
    const request = route(url);
    if (!enabled) throw new ApiError(503, unavailable);
    const key = request.upstream.href;
    const hit = cache.get(key);
    if (hit && now() - hit.time < 300000) return hit.data;
    if (pending.has(key)) return pending.get(key);
    const work = (async () => {
      const value = await accessToken();
      const data = validate(await send(key, { headers: { Authorization: `Bearer ${value}`, 'User-Agent': env.REDDIT_USER_AGENT } }), request.comments);
      for (const [entry, value] of cache) if (now() - value.time >= 300000) cache.delete(entry);
      if (cache.size >= 100) cache.delete(cache.keys().next().value);
      cache.set(key, { time: now(), data });
      return data;
    })().finally(() => { pending.delete(key); });
    pending.set(key, work);
    return work;
  }

  return { read, enabled };
}
