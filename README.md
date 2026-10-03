# Threadlight for Reddit

A calm, responsive conversation browser built for Codecademy's Reddit Client portfolio project.

[Public source repository](https://github.com/tyler-james-bridges/codecademy-reddit-client).

## Run

```sh
npm ci
npm run dev
npm test
npm run build
```

Open the local URL with `?demo=1` for deterministic sample content. The normal URL attempts the live Reddit JSON API. All sample posts and comments are original fictional fixtures, clearly labelled in the interface.

## Features

- Community filters and submitted text search, including combined filtering.
- Accessible native discussion dialog, Markdown comments, Escape close, and focus restoration.
- Responsive desktop/mobile layout with reduced-motion support.
- Separate loading, empty, error, and success states with recovery actions.
- Five-minute memory cache for validated responses, ten-request rolling minute limit, HTTP 429 cooldown, and latest-request guards.
- Safe Markdown rendering without raw HTML; external links use safe HTTP(S) schemes.

## Technologies

React 18, Redux Toolkit, React Redux, Vite, react-markdown, CSS, Jest, and Enzyme. The course explicitly asks for Enzyme; its React 18 support uses the community-maintained `@cfaester/enzyme-adapter-react-18`. A future modernization should move component tests to React Testing Library and the current React release.

## Plan and wireframes

See [the project board and desktop/mobile wireframes](docs/plan.md). The Codecademy Kanban board is the primary course task tracker.

## Tests

`npm test` runs ten behavior tests covering component actions, filter combinations, stale response handling, query encoding, cache behavior, rate limiting, failed/malformed responses, and successful retries after invalid feed or comment data.

`tests/browser-e2e.mjs` is an executable end-to-end scenario for the Codex Computer Use session. Bind the app tab on `?demo=1`, import the module, and call `run(tab)`. It exercises search, filters, details, comments, keyboard dismissal, focus restoration, empty results, and recovery. Responsive inspection is performed separately at desktop and 390px width.

## Current verification limits

The private hosted preview was published from commit `800dfbb108b6f780bb95e628f2f419c9e519197a`. The later local fix for retries after invalid API responses, its two regression tests, and the updated status notes have not been deployed to that preview.

The local browser could not reach Reddit's JSON API. Live integration is implemented but not verified against successful live data. Reddit's current documentation describes developer approval and authentication requirements; this project does not bypass those restrictions. No API keys or user credentials are included. See [Reddit access guidance](https://support.reddithelp.com/hc/en-us/articles/14945211791892-Developer-Platform-Accessing-Reddit-Data).

The source is hosted on GitHub. The portfolio is not complete until successful live-data verification, public app deployment, additional browser checks, and Lighthouse scoring are recorded. A private preview alone does not satisfy the public deployment requirement.

## Live API access

Reddit's [Responsible Builder Policy](https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy) requires explicit approval before API access. Its [Data API Wiki](https://support.reddithelp.com/hc/en-us/articles/16160319875092-Reddit-Data-API-Wiki) requires registered OAuth authentication and blocks unauthenticated traffic. The current browser-only JSON client does not meet that authentication requirement.

For a use case Devvit cannot support, submit the policy's [developer access request](https://support.reddithelp.com/hc/en-us/requests/new?tf_42139884615700=api_request_type_developer_clone&ticket_form_id=14868593862164), describing this external, non-commercial course client and linking this repository. Wait for approval before registering/configuring the appropriate OAuth client and adding an authenticated server API. App-profile registration alone does not establish Data API approval. No approval or credentials are included here.

## Future work

- Integrate an approved server-side OAuth connection if Reddit access is granted.
- Add pagination, nested replies, images, and per-community sorting.
- Add broader browser coverage and continuous deployment.
- Evaluate a PWA after live access is verified.

This is an independent educational project and is not affiliated with Reddit.
