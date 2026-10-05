# Threadlight project board

| Task | Status | Acceptance |
| --- | --- | --- |
| Plan | Done | Scope, states, and acceptance criteria recorded |
| Wireframes | Done | Desktop and mobile layouts below |
| Build UI | Done | Cards, combined filters/search, accessible detail dialog; desktop and 390px mobile layouts inspected |
| Reddit integration | Done | Devvit SDK supplies live popular/community feeds, global/scoped search, and comments; recoverable errors and rate-limit handling verified |
| Tests | Done | 24 Devvit client/backend tests pass; live browser checks cover search/filtering, comments, keyboard dismissal, focus restoration, and empty-state recovery |
| Publish | Done | Public Reddit post works for signed-out readers; source is hosted in the project's GitHub repository |
| Verify | Done | Typecheck, lint, build, owner/signed-out live checks, and mobile overflow check pass; the earlier standalone Lighthouse audit and its scope are documented in the README |

Work in this order; each milestone should produce a runnable app and a Git commit. Do not add voting, login, subscriptions, infinite scrolling, or custom domains. Sample content is original fictional fixture data and must always be labelled. Live API access must be verified independently.

## Wireframes

Desktop: header with wordmark and source control → editorial introduction → search bar → two-column area with community rail and post feed → detail dialog on post selection.

```
+------------------------------------------------------+
| T Threadlight for Reddit             Live / Sample    |
| A little curiosity goes a long way.                   |
| [ Search conversations_________________ ] [ Search ]  |
| Communities      | Latest conversations               |
| [All]            | [community · author]               |
| [Technology]     | Post title / preview / comments     |
| [Science]        | --------------------------------- |
| [Design]         | Post title / preview / comments     |
+------------------------------------------------------+
```

Mobile: single column; search below introduction; horizontally scrolling community chips; full-width cards; full-screen detail dialog with a persistent close button. Keyboard: labelled search, pressed-state filters, heading buttons, native modal focus containment and Escape close. Respect reduced-motion preferences.

## State model

Feed has community, submitted query, source mode, request status, request ID, posts, and error. A response is accepted only for the latest request. Comments have independent status and request ID. Never turn a failed live request into an unlabelled success. Rate-limited requests show a recovery message and samples remain available.

The October 5 Devvit test established live API access and public viewing before porting the interface. The public app is at https://www.reddit.com/r/threadlight_tjb/comments/1wylz41/threadlightprobe/. Broader browser coverage and a new audit of Reddit's hosting environment remain future improvements; they are not claimed as completed checks.
