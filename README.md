# Threadlight

A responsive Reddit conversation browser built with React and Redux for Codecademy's Full-Stack Engineer course.

[Open Threadlight on Reddit](https://www.reddit.com/r/threadlight_tjb/comments/1wylz41/threadlightprobe/) · [Source](https://github.com/tyler-james-bridges/codecademy-reddit-client)

## Live application

The `devvit/` application runs inside a Reddit post. Its server uses Reddit's supported Devvit SDK for public posts, search, and comments. Readers do not need a Reddit login or their own API credentials. It does not vote, post comments, read private account data, or export Reddit content to another service.

The hosting community allows anyone to view the app; posting in the community is restricted. The Devvit app slug is `threadlight-probe`, retained from the initial feasibility test.

## Run and verify

Use Node 24.21 or later:

```sh
cd devvit
npm ci
npm test
npm run test:types
npm run lint
npm run build
npm run login
npm run dev -- threadlight_tjb
```

The last command is for the app owner. Other developers need their own Devvit app name and test community. Devvit's Reddit API calls require a Reddit playtest session; a local static preview cannot supply that context. The CLI stores its authentication separately from this repository. Never commit tokens or credentials.

## Features and technologies

- React 18, Redux Toolkit, React Redux, Vite, CSS, and react-markdown.
- Devvit's Reddit SDK with a Hono server; Jest and Enzyme component tests.
- Initial live feed, community filters, and submitted searches.
- Post details and comments in a keyboard-accessible dialog, with Escape dismissal and focus restoration.
- Responsive layouts, reduced-motion support, loading and empty states, and recoverable errors.
- Bounded requests, memory caching, rate-limit cooldowns, and protection against stale responses.
- Safe Markdown rendering without raw HTML. Reddit links use Devvit navigation.

See [the project board and desktop/mobile wireframes](docs/plan.md) for the plan, state model, and layout. Codecademy's Kanban board is the course task tracker.

## Verification

On October 5, 2026, the full app (Devvit version 0.0.1.5) passed live checks for the initial popular feed, global and filtered search, post details/comments, Escape dismissal with focus restoration, empty-search recovery, and a mobile-width layout without horizontal overflow. A fresh, signed-out Chrome Incognito window also loaded the live feed and comments. The public post works without a developer playtest URL parameter.

All 24 Devvit tests passed (12 client and 12 backend), along with typecheck, lint, production build, and six deterministic browser regression checks. The API tests cover validation, rate-limit responses, retry behavior, and sanitized upstream failures. No test suite sends live Reddit requests.

The original standalone interface's [mobile Lighthouse audit](https://pagespeed.web.dev/analysis/https-codecademy-reddit-client-tjb-onrender-com/v4uz82nfgi?form_factor=mobile) scored Performance 98, Accessibility 100, Best Practices 92, and SEO 100 on October 2. That audit covered the Render homepage with its API-pending notice; it is not an audit of Reddit's surrounding page or the live Devvit integration.

## Original standalone version

The repository root retains the earlier Node/Render implementation and its tests. Run `npm ci`, `npm test`, and `npm run build` from the root to verify it. Its [Render deployment](https://codecademy-reddit-client-tjb.onrender.com) remains gated, with clearly labelled fictional examples available at `?demo=1`.

The traditional Data API request was denied, and a reconsideration remains pending. The standalone server must keep `REDDIT_API_APPROVED=false` unless Reddit explicitly approves that separate integration. Devvit uses its own supported authentication path; the website does not proxy data from Devvit.

## Future work

- Pagination, nested replies, images, and per-community sorting.
- Broader browser coverage and a repeatable audit of the app within Reddit's hosting environment.
- Modernize the course-required Enzyme tests to React Testing Library.

This is an independent educational project and is not affiliated with Reddit or Codecademy.
