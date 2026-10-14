# DevTrack MVP v0.1 release checklist

Candidate: 0.1.0, published October 14, 2026 at [dev-track-46323.web.app](https://dev-track-46323.web.app). The user explicitly selected the existing project for the MVP release. Local implementation and automated checks are tracked in [Phase 8](PHASE_8_REPORT.md); publication evidence is in the [deployment record](RELEASE_0.1.0.md). Final Phase 8 acceptance stays pending until signed-in workflow and two-account results are recorded.

## Local acceptance

- [x] Review architecture, strict TypeScript, dependencies, assets, effects and listener cleanup.
- [x] Install locked dependencies and audit advisories; no major-version upgrades.
- [x] Validate malformed activity/date/duration records and owner-only rules with the real SDK emulator.
- [x] Check settings transactions, persistence, partial fallback and cross-user denial in the emulator.
- [x] Run lint, unit tests and production build.
- [x] Final full Chrome regression: 76/76 passed, including the complete release workflow.
- [x] Run production preview direct-entry/reload checks for all five required routes.
- [x] Verify the production bundle excludes test adapters and public source maps.
- [x] Scan accessibility, keyboard/dialog/menu behavior and responsive layouts.
- [x] Hosting emulator: 2/2 passed for rewrites, security headers, caching and hidden-file denial.
- [x] Final formatting and Git whitespace checks pass.

## Required live Firebase acceptance

Pending on the published origin: browser connectors expose no session and attempts to open both the in-app browser and Chrome report that those browsers are unavailable. Synthetic UI tests, real-SDK emulator tests, public guest smoke and simulated released-rules contexts do not substitute for these signed-in checks. Full live results have not yet been supplied. A read-only backend inspection corroborates a post-publication login/profile sync and valid existing preferences/five current-month activities; it does not identify the browser origin or establish the complete workflow. Earlier Phase 2–4 results remain historical evidence.

Use a dedicated test date/account in the intended development or release environment. Keep pre-existing records intact; create clearly named test records and remove only those records during the requested deletion check.

1. Google sign-in as a new or existing account; confirm identity and protected-route/session restoration.
2. Save Settings with a 09:00–18:00 workday; choose a display format, refresh, and confirm persistence and enabled types.
3. On a chosen date, add Jira 09:00–10:00, Scrum 10:00–10:30 and Development 10:30–12:00. Confirm each subsequent start follows the previous end and rejects an overlapping save.
4. Add a later block at 13:00 to create a gap; use the gap action to fill 12:00–13:00. Confirm totals and gap removal.
5. Duplicate an activity, confirm copied text and fresh smart times; save, then edit its status.
6. Verify Calendar markers, daily/month totals and Day view. Check yesterday, another date in the month and a future date.
7. Delete one test activity through confirmation; verify UI and backend removal, remaining totals and any exposed gap.
8. Refresh, logout, attempt a protected route, log in again, and verify activities and saved preferences remain.
9. On mobile responsive mode, perform add/edit/delete, Calendar and Settings; ensure scrolling, focus, Save and bottom navigation remain usable.
10. Repeat with a second real account to verify profiles, activities, settings, recent tasks and calendar isolation. Record browser console errors/warnings, Firebase project, tested origin, date/accounts and results. Emulator isolation already covers denied reads/writes; this is the remaining live two-account acceptance check.

Live acceptance result: **PENDING**. Record verified results here before changing the Phase 8 status.

## Deployment gates

- [x] User selected `dev-track-46323` for the MVP; environment and registered web app match.
- [x] All six production web values are explicitly set in ignored `.env.production.local`; the rebuilt candidate targets that same app.
- [x] Hardened rules/index definition deployed; released rules exactly match source and the required composite index is READY.
- [x] Published `dist` using `--project dev-track-46323`; Hosting version `445a97bd8998d7cd` is FINALIZED.
- [x] Google is enabled; both `dev-track-46323.web.app` and `dev-track-46323.firebaseapp.com` are already authorized.
- [x] Public deployment suite: 4/4 passed for assets, security/cache headers, reloads, accessibility, guest protection and ten denied Firestore operations.
- [x] Released-rules API simulations: 48/48 owner/other-UID/guest contexts passed without executing data writes.
- [x] Archived the exact deployed build and hash manifest; saved pre-deployment rules/configuration. This was the first Hosting release.
- [ ] Complete the signed-in live acceptance above, including a second real Google account.
- [ ] After acceptance/source review, record/tag the version through the team's normal Git workflow; pre-existing uncommitted changes remain preserved.

Deployment is complete under the user's explicit target selection. Development and the MVP intentionally share this Firebase project and its data; a separate environment is a future operational choice. Publication does not close the two outstanding live-account acceptance checks.

## MVP limits accepted for this candidate

Single-user workspaces; same-day activities; a consistent local browser timezone (changing zones may trigger a stored-date validation error); client/service overlap prevention can race across simultaneous clients; no durable offline queue/PWA; full-form last-write-wins settings; current preferences recalculate historical targets; idle tabs need interaction/refresh after midnight; bounded recents rank activity start dates. Physical devices, non-Chrome browsers and complete assistive-technology testing remain follow-up validation. No integrations, timers, exports, monitoring, teams or AI features were added.
