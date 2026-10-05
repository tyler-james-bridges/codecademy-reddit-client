# Threadlight on Reddit

Threadlight is an independent React/Redux learning project for discovering public conversations. It opens a live popular feed, lets readers choose Technology, Science, Design, Space, or Books, searches globally from Popular or within a selected community, and displays a post with its replies. It supports loading, empty, error, retry, and rate-limit states. Fictional sample conversations remain an explicitly selected alternative for deterministic testing.

This app runs inside a Reddit post using Devvit. It does not proxy Reddit content to the external Render site. The existing external project remains separate and unchanged.

## Development

Use Node 24.18+:

```sh
npm ci
npm run test:types
npm run lint
npm test
npm run build
```

The registered app slug is `threadlight-probe`, while the product name is Threadlight. After authorized CLI login, `npm run dev -- threadlight_tjb` starts the official playtest flow on the project subreddit. Uploading, installing, or publishing changes is a separate action; local checks do not deploy anything. `npm run launch` submits for Reddit app review.

The template's inline splash, moderator post-creation menu, and app-install trigger create/open the interactive post. The expanded app reuses the existing Threadlight interface, Redux slices, responsive styles, and dialog accessibility behavior. External font requests were removed. Reddit navigation uses Devvit's navigation API; external Markdown links render as text.

## Data and limits

The same-origin `/api/feed?community=...&q=...` and `/api/comments?postId=...` routes call the built-in `reddit` SDK on the server. No external OAuth credentials, HTTP fetch permission, external endpoints, Redis, application database, or background crawling are used. API responses contain only the display fields needed by the interface, with at most 30 posts/comments. NSFW/removed posts are excluded. The post-creation menu/trigger is the only content-writing behavior; feed/search/comments are read-only.

The client limits new requests to 10 per minute, honors recoverable 429 cooldowns, and uses a bounded in-memory response cache with five-minute freshness. Cache entries expire on subsequent requests; displayed/Redux content can remain until navigation or closing the app. This is not a guarantee of deletion after five minutes. There is no application disk/database persistence or content logging.

## Verification scope

On October 5, 2026, version 0.0.1.5 of the full interface was verified at [the public project post](https://www.reddit.com/r/threadlight_tjb/comments/1wylz41/threadlightprobe/). Checks covered the initial popular feed, global search, combined community/search filtering, live comments, Escape dismissal with focus restoration, empty search and reset recovery, and a mobile-width layout without horizontal overflow. A fresh signed-out Chrome Incognito window also loaded the full live feed and comments. The earlier probe verified all three SDK operations while signed out. No developer playtest URL parameter is needed.

All 24 tests passed (12 client and 12 backend), along with TypeScript, ESLint, production build, and six deterministic browser regression checks. Prior Lighthouse results belong to the external deployment and do not measure Reddit's surrounding page or this live integration.

Client unit tests retain filtering, stale-response protection, post opening, API validation/cache/retry/cooldown, cancellation, and safe navigation checks. Backend tests use injected SDK fakes and do not claim live verification. `tests/browser-e2e.mjs` describes the existing deterministic sample-mode browser scenario; bind the expanded app frame and select samples before running it.

## Provenance

Based on Reddit's [official React template](https://github.com/reddit/devvit-template-react), commit `a21c46601f181ec482d70300389029c64fe8d1c7`, and the existing [Threadlight Codecademy project](https://github.com/tyler-james-bridges/codecademy-reddit-client). The equivalent interactive scaffold command is `npm create devvit@latest --template=react`. Built-in [Reddit API documentation](https://developers.reddit.com/docs/capabilities/server/reddit-api) and [playtest documentation](https://developers.reddit.com/docs/guides/tools/playtest) describe the platform flow.
