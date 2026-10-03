# Threadlight for Reddit

A calm, responsive conversation browser built for Codecademy's Reddit Client portfolio project.

[Live app](https://codecademy-reddit-client-tjb.onrender.com) · [Public source repository](https://github.com/tyler-james-bridges/codecademy-reddit-client).

## Run

```sh
npm ci
npm test
npm run build
npm start
```

Use Node 22.12+ (Node 24.21.0 is configured for Render). The server runs at `http://localhost:3018`; add `?demo=1` for deterministic sample content. The normal URL requests only the same-origin server. With approval or credentials absent, the server returns an explicit unavailable state without contacting Reddit, and the existing sample-mode option remains available. All sample posts and comments are original fictional fixtures, clearly labelled in the interface.

For development, run `npm run dev:server` and `npm run dev` in separate terminals, then open `http://localhost:3019`. Vite proxies `/api` to the local server on port 3018. The server reads a private `.env` if present; copy the blank `.env.example` and keep `REDDIT_API_APPROVED=false` until approval is granted.

## Features

- Community filters and submitted text search, including combined filtering.
- Accessible native discussion dialog, Markdown comments, Escape close, and focus restoration.
- Responsive desktop/mobile layout with reduced-motion support.
- Separate loading, empty, error, and success states with recovery actions.
- Five-minute memory cache for validated responses, ten-request rolling minute limit, HTTP 429 cooldown, and latest-request guards.
- Safe Markdown rendering without raw HTML; external links use safe HTTP(S) schemes.

## Technologies

React 18, Redux Toolkit, React Redux, Vite, react-markdown, CSS, the Node HTTP server, Jest, and Enzyme. The course explicitly asks for Enzyme; its React 18 support uses the community-maintained `@cfaester/enzyme-adapter-react-18`. A future modernization should move component tests to React Testing Library and the current React release.

## Plan and wireframes

See [the project board and desktop/mobile wireframes](docs/plan.md). The Codecademy Kanban board is the primary course task tracker.

## Tests

`npm test` runs the original ten client behavior tests covering component actions, filter combinations, stale response handling, query encoding, cache behavior, rate limiting, failed/malformed responses, and successful retries after invalid feed or comment data. Five additional Node test groups use injected provider responses and local HTTP to check approval/configuration gating, fixed OAuth hosts and routes, token/cache renewal, sanitized failures, and rate limiting. No tests call Reddit.

`tests/browser-e2e.mjs` is an executable end-to-end scenario for the Codex Computer Use session. Bind the app tab on `?demo=1`, import the module, and call `run(tab)`. It exercises search, filters, details, comments, keyboard dismissal, focus restoration, empty results, and recovery. Responsive inspection is performed separately at desktop and 390px width.

## Current verification limits

The public Render app runs commit `b48d9ea5f44176b98e0fe755ef56677f556ece1b`. Hosted browser checks confirmed the API-approval-pending notice, six clearly labelled sample posts, and discussion details with sample comments.

The earlier browser-only client could not reach Reddit's JSON API. The current server integration is checked with mocked provider responses; successful live Reddit data remains unverified. Reddit's current documentation requires developer approval and authentication; this project does not bypass those restrictions. No API keys or user credentials are included. See [Reddit access guidance](https://support.reddithelp.com/hc/en-us/articles/14945211791892-Developer-Platform-Accessing-Reddit-Data).

Public deployment is complete. Successful live Reddit listing, search, and comments remain pending developer approval and server credentials. The [mobile Lighthouse audit](https://pagespeed.web.dev/analysis/https-codecademy-reddit-client-tjb-onrender-com/v4uz82nfgi?form_factor=mobile) scored Performance **98**, Accessibility **100**, Best Practices **92**, and SEO **100** (Lighthouse 13.5.0; October 2, 2026, 11:17 PM MST). It assessed the normal homepage showing the API-approval-pending notice, not live Reddit data.

## Live API access

Reddit's [Responsible Builder Policy](https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy) requires explicit approval before API access. Its [Data API Wiki](https://support.reddithelp.com/hc/en-us/articles/16160319875092-Reddit-Data-API-Wiki) requires registered OAuth authentication and blocks unauthenticated traffic. The browser now calls only the same-origin Node server; it never receives app credentials or OAuth tokens.

For a use case Devvit cannot support, submit the policy's [developer access request](https://support.reddithelp.com/hc/en-us/requests/new?tf_42139884615700=api_request_type_developer_clone&ticket_form_id=14868593862164), describing this external, non-commercial course client and linking this repository. Wait for approval before registering/configuring the appropriate OAuth client and enabling the server connection. App-profile registration alone does not establish Data API approval. No approval or credentials are included here.

Once approved, set `REDDIT_API_APPROVED=true`, `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, and a truthful `REDDIT_USER_AGENT` with the format shown in `.env.example`. The server uses Reddit's documented [application-only OAuth](https://github.com/reddit-archive/reddit/wiki/OAuth2#application-only-oauth) `installed_client` grant for logged-out readers, with `DO_NOT_TRACK_THIS_DEVICE`; no user login or private account access is needed. It holds the token in memory until shortly before expiry and allows only the existing listing, search, and comments operations against `oauth.reddit.com`. Responses are validated before a bounded five-minute memory cache; a shared ten-request minute budget and provider cooldown protect the single server instance. Secrets belong only in server environment variables, never `VITE_*` variables.

## Render setup

`render.yaml` prepares one Node web service with live API access disabled. Build: `npm ci --include=dev && npm run build`. Start: `npm start`. Health check: `/health`. Render supplies `PORT`; production binds `0.0.0.0`. No database is required. Add the four Reddit environment values privately only after approval and confirm real listing, search, and comments before marking live integration complete. The published service currently leaves live API access disabled.

## Future work

- Verify the prepared server OAuth connection with real responses after Reddit approval.
- Add pagination, nested replies, images, and per-community sorting.
- Add broader browser coverage and continuous deployment.
- Evaluate a PWA after live access is verified.

This is an independent educational project and is not affiliated with Reddit.
