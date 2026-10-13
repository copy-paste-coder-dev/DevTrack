# DevTrack

A calendar-based developer activity tracker with a dark neon workspace. Google Authentication protects the app; activities and personal preferences use Cloud Firestore.

## Setup

Requires Node.js 24+ and npm. On Windows PowerShell with restricted script execution, use `npm.cmd`.

```sh
npm install
npm run dev
npm run lint
npm run build
npm test
```

Production hosting must rewrite application paths to `index.html` for React Router. No production hosting deployment is included.

## Architecture

React, strict TypeScript, Vite, React Router, Tailwind v4, Firebase modular SDK, date-fns, Lucide, Sonner, React Hook Form and Zod.

```text
src/app/                   Router and providers
src/components/            Shared UI, layout, feedback and dialogs
src/features/auth/         Central session, guards, auth and profile services
src/features/activities/   CRUD service, realtime hooks, domain models, forms and summaries
src/features/calendar/     Selected date and month calendar
src/features/settings/     Preferences provider, service, validation and settings form
src/firebase/              Validated singleton factories
src/utils/                 Local date/time and duration helpers
tests/support/             Isolated synthetic auth/activity/settings services and fixtures
```

UI → hooks → services → Firebase. Pages never call Firestore directly. Production activity pages never fall back to fixture data. Activities use Date objects in the domain/UI; services map Firestore Timestamp fields. Routes load on demand. Theme tokens, focus treatment, native dialogs and the Phase 1 responsive layout are retained.

## Firebase setup

1. Create/select your development project in [Firebase Console](https://console.firebase.google.com/), register a web app and copy its web configuration.
2. Copy `.env.example` to ignored `.env.local` and fill all six `VITE_FIREBASE_*` settings. Ignored `.env` also works. Restart Vite after changes. Use the same project for Authentication and Firestore.
3. In **Authentication → Sign-in method → Google**, enable Google and choose the support email. Other providers remain disabled in DevTrack.
4. In **Authentication → Settings → Authorized domains**, add `localhost` and `127.0.0.1` separately. Use hostnames without protocol, port or path. Add the actual hosting hostname when deploying.
5. Create a **Cloud Firestore Standard edition** database in production mode. In its **Rules** tab, publish [firestore.rules](firestore.rules). Review before replacing rules in a shared project. These rules allow owner profile access, owner activity CRUD and validated owner preferences at users/{uid}/settings/preferences. Settings listing/deletion, other settings IDs and unrelated paths are denied.
6. In **Firestore → Indexes → Composite → Add index**, create collection ID `activities`, query scope **Collection**, with `dateKey Ascending` and `startAt Ascending`. Wait until enabled. The same definition is in [firestore.indexes.json](firestore.indexes.json).
7. Run `npm run dev`, open the URL Vite prints (normally `http://127.0.0.1:5173/login`) and sign in with Google.

If Firebase CLI is installed and authenticated, deploy the reviewed files to the explicit development project:

```sh
firebase deploy --only firestore:rules,firestore:indexes --project YOUR_DEVELOPMENT_PROJECT_ID
```

`firebase deploy --only firestore:rules` deploys only rules. `firebase.json` references both repository files without hardcoded credentials or a project ID. No CLI installation/authentication is required to run the app.

If the CLI reports expired credentials or HTTP 401, run `firebase login --reauth --interactive` and complete Google authorization yourself, using an account with access to the intended project. Then retry the explicit-project command. App Google sign-in and Firebase CLI sign-in are separate sessions. Never paste a password, access token or authorization code into chat.

Firebase factories validate configuration before initialization. Missing configuration produces a safe login setup error; developer diagnostics name missing variables. Vite web config is client-visible; never put Admin SDK/private credentials in it. Actual environment files stay out of Git.

## Authentication and profiles

`AuthProvider` owns one active `onAuthStateChanged` subscription with cleanup. `useAuth` exposes only the app user model and independent initialization/sign-in/sign-out states. `/app`, `/app/calendar` and `/app/settings` are protected; `/login` is guest-only; `/` routes after restoring the session. Safe return paths are limited to known internal app routes.

Firebase's default browser persistence restores sessions for the same origin. Guards hold content during initialization. Google popup success performs best-effort profile sync, then GuestRoute navigates. The profile transaction creates `users/{uid}` with identity fields, provider `google`, and server timestamps `createdAt`, `updatedAt`, `lastLoginAt`. Repeat login preserves `createdAt`. Profile failure or an eight-second timeout warns without signing out; a timed-out write may still finish.

Desktop and mobile show the authenticated identity, photo/initials fallback and shared logout. Logout waits for Firebase's confirmed session event. Credentials/tokens are managed by Firebase and are not copied to profiles, application logs or custom storage.

## Activity data and queries

Path: `users/{uid}/activities/{activityId}`. No duplicated UID or document ID in the body:

```text
dateKey            YYYY-MM-DD (local calendar date)
activityType       centralized activity type
taskName           trimmed, 1–160 characters
status             in_progress | on_hold | completed
startAt / endAt    Firestore Timestamp
durationMinutes    rounded elapsed minutes, positive integer
notes              trimmed string, default "", up to 1,000 characters
createdAt          server timestamp, immutable on edit
updatedAt          server timestamp on create/edit
```

Create uses a generated document reference and setDoc. Update changes mutable fields with updateDoc, including dateKey when moving dates; delete uses deleteDoc. Basic validation runs in both the form and service. Date/time construction uses local numeric date components, never a forced UTC string. Invalid/nonexistent dates or local times are rejected. End must follow start within the chosen day. Duration and time rules come from the shared activity domain. Phase 4 blocks overlapping creates and edits before mutation.

Dashboard subscribes to the selected day: dateKey equality plus startAt ascending. Its mini calendar subscribes to the selected month. Calendar subscribes once to its month range, ordering by dateKey; its selected-day list filters that result without another day listener. Month navigation selects the first day of the new month. Listeners unsubscribe on route/date/UID changes; stale results are hidden while a new query loads. No full history download occurs.

The checked-in collection-scope composite index supports the daily equality-plus-order query, matching the indexing pattern in [Firebase's index documentation](https://firebase.google.com/docs/firestore/query-data/index-overview). Monthly range filtering/order uses the same dateKey field and its default ascending single-field index. Remote index availability/error behavior remains a live verification item. If a query reports failed-precondition, check the index above and any project-specific single-field exemptions.

Realtime snapshots update timelines, counts, markers and summaries. Stats derive total logged, activity count and three status counts. Day summary derives actual earliest start/latest end and logged/work/break totals. Its target uses the saved workday window; remaining is max(target minutes − all logged minutes, 0), including breaks. Progress clamps logged/target to 0–100% without limiting actual logged totals. Empty days display a first-activity action with the selected date prefilled; Today uses the actual browser day.

Save/update/delete disable their own actions, retain dialogs while pending, and close/reset only after success. Failures keep input and permit retry. Read failures show a retry action. Known-offline writes fail with connection guidance. If connectivity drops after a write begins, Firebase may keep the write pending until reconnection; the dialog stays pending and no success is reported prematurely. No extra offline persistence, timeout cancellation or optimistic write layer is added.

Rules restrict activities to their path owner, validate the exact field set/enums/lengths/basic timestamps and positive bounded duration, require server audit timestamps and preserve createdAt. They do not implement overlap checks or timezone-aware dateKey matching; service validation owns those local date checks. Source rules alone do not protect a remote project until published.

## Phase 4 smart timeline

Generic Add activity on Dashboard, Calendar or an empty day uses that selected day's latest activity end, even when entries are unsorted or contain gaps. Legacy end seconds round forward to the next available minute; if none remains in that day, start stays blank. Empty days use the authenticated user's saved dayStartTime; 09:00 is only the canonical new-user/error fallback. Past/future days behave identically; the current clock does not affect defaults.

The end initially suggests start +30 minutes. Changing start shifts that suggestion until the user manually edits end. Edit and gap-fill forms preserve their existing end. If +30 minutes would cross midnight, end stays blank so the user can choose a valid same-day end. Duration updates while typing. One-minute activities are valid; equal, inverted, invalid, sub-minute, cross-day and 24-hour-or-longer ranges are rejected. New writes use zero seconds/milliseconds. Cross-midnight logging is deferred.

Two blocks overlap when `newStart < existingEnd && newEnd > existingStart`. For an existing 09:00–10:00 block, another may start at 10:00, but 09:59 overlaps. Breaks and On hold activities occupy time equally. Edits exclude their own ID. The modal previews conflicts using available day data; the service always validates a fresh server query for the target date before create/update, including date moves. Read failures block saving and preserve the draft. This adds one daily query per save. Concurrent tabs can still pass their reads before either writes: no distributed lock or rule-level overlap enforcement is provided in this MVP.

Timeline gaps are derived at minute precision using a sorted running maximum end, including an initial gap from saved dayStartTime. Gap boundaries round inward around legacy timestamp seconds so prefills do not include occupied time. The shared display threshold is one minute. Dashed “unlogged” rows offer Log activity with the exact gap start/end and selected date. Generic Add still appends to the latest end. Deleting the latest entry recomputes that default; deleting a middle entry exposes a gap. No trailing gap is inferred from dayEndTime. Gaps do not affect counts/totals and are never persisted. Summary start/end remain actual earliest/latest activity times.

Defaults are captured once when the modal opens. Realtime changes do not overwrite typed values; current snapshots and the service's fresh read still catch newly introduced conflicts. No activity schema, rules or index migration is needed. Local browser time construction avoids UTC date shifts and rejects nonexistent DST input times. Repeated DST hours use JavaScript's earlier offset; elapsed duration can differ from wall-clock labels across a DST transition. Changing browser timezone can change displayed times; persisted timezone preferences remain later scope.

See the [29-part Phase 4 report](docs/PHASE_4_REPORT.md) for results, pending verification and limitations.

## Phase 5 personal preferences

One fixed document, users/{uid}/settings/preferences, contains dayStartTime/dayEndTime as HH:mm, timeFormat as 12h or 24h, enabledActivityTypes as a nonempty unique array of known types, and server-created createdAt/updatedAt. Defaults are 09:00, 18:00, 24h and all nine types. No formatted labels, totals or type metadata are stored.

The protected app shell mounts one UID-keyed provider/document listener after authentication. Missing preferences initialize in a transaction only if the document still does not exist; a competing tab's saved values always win. Server-confirmed missing snapshots include metadata events. Existing partial documents fill absent fields at runtime without being overwritten; their next valid Save writes a complete document and preserves or initializes createdAt. Invalid stored values surface a friendly read error and canonical fallback.

Settings uses React Hook Form/Zod with one Save changes action. Times must be valid and end later than start on the same day; even a one-minute work window is valid. Zero enabled types cannot be saved. Save shows loading, disables controls, preserves drafts on failure and clears dirty state after success. Reset to defaults changes only the form until Save. Clean forms follow remote updates; dirty forms retain unsaved edits. Full-form saves use last-write-wins semantics. Arbitrary custom types remain disabled as Coming later.

Saved values drive first-activity starts, initial gaps, logged-time target/progress, and textual timeline/card/gap/summary time display without rewriting activities. 12h displays 2:30 PM; native time input values remain 14:30. Existing latest activity end always takes priority over dayStartTime. Create shows only enabled types and chooses Development if enabled, otherwise the first enabled type. An existing disabled type stays visible/countable and appears in edit as “currently disabled”; it can be retained unchanged.

While preferences load, Add waits for an exact value. On read failure, logging resumes using canonical defaults with a non-blocking warning and Retry; Settings displays a retryable error rather than allowing an accidental overwrite. The provider unsubscribes/discards state on logout or UID change, so a new account never receives the prior account's preferences. One saved document/listener enables propagation across tabs and signed-in devices. Offline saving fails with connection guidance; no custom offline persistence layer is added.

Rules permit only the path owner to get/create/update the fixed preferences document, enforce its fields/types/time order/unique valid activity types/audit fields, preserve createdAt, and deny list/delete/other settings documents. Publish the updated rules before testing Phase 5. They were deployed to dev-track-46323 on October 13; released source matches the repository. No settings index is needed. See the [31-part Phase 5 report](docs/PHASE_5_REPORT.md) for verification and limitations.

Live regression: load defaults; save 08:30–17:30, 12h and Meeting disabled; refresh/logout/login; check empty-day start 08:30, subsequent start uses latest end, AM/PM labels, initial gaps and remaining target. Existing Meeting entries must stay editable. All types off and overnight work windows must block Save. A second account must get independent preferences; physical cross-device and second real OAuth-account checks must be distinguished from emulator/synthetic checks.

## Live verification checklist

Phase 2 and Phase 3 were completed on October 13, 2026 using user-confirmed live UI checks plus independent configuration/backend/rules verification. The sequence below remains useful for future regression checks; synthetic tests alone do not establish live success.

1. Enable Google, authorize the app hostname, create Firestore, publish rules and enable the index above.
2. As a guest, verify protected routes reach login. Sign in, verify real name/email/photo, and inspect the single users/{uid} profile and its audit timestamps.
3. Refresh Dashboard/Calendar/Settings. Logout from desktop/mobile, confirm protected access redirects, then sign in again and verify profile createdAt is preserved.
4. Select October 12, 2026; add a Jira task from 09:00 to 10:30 with special characters and multiline notes. Verify users/{uid}/activities/{id} contains the correct timestamps, 90-minute duration and server audit values. Timeline/counts must update.
5. Refresh; verify the same activity remains. Edit name/status/times and move its date to October 13. Verify the original document ID/createdAt remain, updatedAt changes, October 12 no longer includes it and October 13 does.
6. Add a separate October 12 activity. Verify each day's list contains only its own data; Calendar markers/counts match both dates. Navigate to another month and back.
7. Delete the test activity through confirmation. Verify its backend document and UI row/marker disappear, including after refresh.
8. Test empty/long/multiline notes, blank/long names, invalid/equal/reversed times, double submission, failed reads/writes and retry without losing entered values.
9. Use Rules Playground or an authenticated rules test client: owner activity get/list/create/update/delete allowed with valid audit fields; another UID and guests denied; ownership/schema additions and createdAt changes denied; unrelated collections denied. Server/Admin SDK access bypasses rules and cannot prove client isolation.
10. Inspect browser errors and check loading/empty/error/timeline/forms/delete at 390, 430, 768, 1024 and 1440px.

Common fixes: unauthorized-domain → add the exact browser hostname; operation-not-allowed → enable Google; permission-denied → verify project/UID and publish updated rules; failed-precondition → provision the daily composite index; popup-blocked → allow popups; invalid/missing config → recheck six Vite values and restart.

## Tests and formatting

`npm test` runs native Node tests for config/auth/profile, activity date/duration/schema/mapper/summary and smart defaults/overlap/gap logic, plus preferences schema/default mapper/workday targets/time formatting/type options. Local date checks cover Kolkata, Los Angeles and Berlin. These do not contact a backend.

The rules suite uses the real client SDK against the local Firestore emulator and the checked-in rules. It covers owner CRUD, daily/monthly queries, audit fields, invalid writes, guest/cross-user denial and profile restrictions. It invokes production activity/settings services to verify overlap protection, date moves, audit preservation, subscriptions, settings initialization races, persistence and legacy partial documents. Install Firebase CLI and Java 21+, then run:

```sh
firebase emulators:exec --only firestore --project demo-devtrack "npm run test:rules"
```

The emulator binds to `127.0.0.1:8085`. Tests require a loopback `FIRESTORE_EMULATOR_HOST` and hardcode the demo project; they cannot use the app's real Firebase configuration. `npm run test:rules` alone requires an already running emulator and that environment variable. Emulator results verify local rules enforcement, not deployed rules or production index readiness. See [Firebase's rules testing documentation](https://firebase.google.com/docs/firestore/security/test-rules-emulator).

`npm run test:e2e` runs locally installed Chrome against Vite's isolated `e2e` mode, with synthetic auth/activity/settings services and fixed browser date/time. Default test port is 5174; if occupied, use another free port:

```powershell
$env:DEVTRACK_E2E_PORT = '5175'
npm.cmd run test:e2e -- --workers=3
```

Tests never reuse an existing server. Synthetic activity persistence is keyed by test UID in test-only storage; production code uses Firebase. E2E production builds are rejected. UI tests prove application interactions, not Google OAuth, deployed rules/indexes or real Firestore durability. Bundled Chromium can be used by removing `channel: 'chrome'` from Playwright config and installing Chromium through Playwright.

Screenshots go to ignored `artifacts/screenshots/`; tests cover 390×844, 430×932, 768×1024, 1024×768, 1440×900 and 1920×1080. `npm run format:check` verifies formatting. The lockfile pins dependencies.

## Phase status and remaining scope

Phases 0–3 are complete. Phase 2 live authentication/profile/session verification was committed as `c78927b`. Phase 3 rules and the daily index are deployed to development project `dev-track-46323`, the index is READY, real CRUD/date moves/refresh/calendar behavior passed, and backend audit/deletion checks passed. Live guest denial and released-rules request-context tests also passed; cross-user contexts were simulated rather than a second Google login. Details and limits are in the [Phase 3 report](docs/PHASE_3_REPORT.md), [progress](docs/PROGRESS.md) and [Phase 2 report](docs/PHASE_2_REPORT.md). No hosting deployment or remote Git push was performed.

Settings are Firestore-backed. No production settings mock or preview-state URL handling remains. Test-only adapters simulate loading/error states, remote updates and separate users. Week/Day views remain roadmap placeholders.

Phase 4 is complete: smart defaults, live duration, canonical time rules, create/edit overlap protection and clickable gaps. Evidence and account/date corroboration limits are in the [Phase 4 report](docs/PHASE_4_REPORT.md). Phase 5 implementation, local checks and development-rules deployment are delivered; required real Firebase live verification remains pending. See the [Phase 5 report](docs/PHASE_5_REPORT.md). Later phases: alternate calendar views, reports, integrations, timers, custom types, teams, AI and deployment.
