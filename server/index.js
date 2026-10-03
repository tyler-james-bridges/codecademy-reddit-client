import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { ApiError, createRedditClient } from './reddit.js';

const defaultDist = fileURLToPath(new URL('../dist/', import.meta.url));

export function createApp({ env = process.env, fetchImpl, now, dist = defaultDist } = {}) {
  const reddit = createRedditClient({ env, fetchImpl, now });
  return createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    function json(status, data, retryAfter) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      if (retryAfter) res.setHeader('Retry-After', String(retryAfter));
      res.writeHead(status);
      res.end(JSON.stringify(data));
    }
    try {
      const url = new URL(req.url, 'http://localhost');
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.setHeader('Allow', 'GET, HEAD');
        return json(405, { error: 'Method not allowed.' });
      }
      if (url.pathname.startsWith('/api/')) {
        if (req.method !== 'GET') return json(405, { error: 'Method not allowed.' });
        if (url.pathname === '/api/status') return json(200, { liveAvailable: reddit.enabled });
        if (!url.pathname.startsWith('/api/reddit/')) return json(404, { error: 'API route not found.' });
        return json(200, await reddit.read(url));
      }
      if (url.pathname === '/health') return json(200, { status: 'ok' });
      const asset = url.pathname.match(/^\/assets\/([a-zA-Z0-9_.-]+\.(?:js|css))$/);
      const name = url.pathname === '/' || url.pathname === '/index.html' ? 'index.html' : asset ? `assets/${asset[1]}` : null;
      if (!name) return json(404, { error: 'Page not found.' });
      const body = await readFile(path.join(dist, name));
      res.setHeader('Content-Type', name.endsWith('.js') ? 'text/javascript; charset=utf-8' : name.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', asset ? 'public, max-age=31536000, immutable' : 'no-cache');
      res.writeHead(200);
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch (error) {
      json(error instanceof ApiError ? error.status : error.code === 'ENOENT' ? 404 : 500,
        { error: error instanceof ApiError ? error.message : error.code === 'ENOENT' ? 'Build the client before starting the server.' : 'The request could not be completed.' }, error.retryAfter);
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 3018);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid port number.');
  const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
  createApp().listen(port, host, () => console.log(`Threadlight listening on port ${port}.`));
}
