export function redditUrl(value) {
  if (typeof value !== 'string' || !value) return null;
  try {
    const url = new URL(value, 'https://www.reddit.com');
    return url.protocol === 'https:' &&
      ['reddit.com', 'www.reddit.com', 'old.reddit.com', 'redd.it'].includes(url.hostname) &&
      !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
