# DevTrack

A calendar-based developer activity tracker with a dark neon workspace. Google Authentication protects the app; activity data uses Cloud Firestore. Settings remain a local preview.

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
src/features/settings/     Local settings preview
src/firebase/              Validated singleton factories
src/mocks/                 Settings fixture and settings preview state only
src/utils/                 Local date/time and duration helpers
tests/support/             Isolated synthetic auth/activity services and fixtures
```

UI → hooks → services → Firebase. Pages never call Firestore directly. Production activity pages never fall back to fixture data. Activities use Date objects in the domain/UI; services map Firestore Timestamp fields. Routes load on demand. Theme tokens, focus treatment, native dialogs and the Phase 1 responsive layout are retained.

## Firebase setup

1. Create/select your development project in [Firebase Console](https://console.firebase.google.com/), register a web app and copy its web configuration.
2. Copy `.env.example` to ignored `.env.local` and fill all six `VITE_FIREBASE_*` settings. Ignored `.env` also works. Restart Vite after changes. Use the same project for Authentication and Firestore.
3. In **Authentication → Sign-in method → Google**, enable Google and choose the support email. Other providers remain disabled in DevTrack.
4. In **Authentication → Settings → Authorized domains**, add `localhost` and `127.0.0.1` separately. Use hostnames without protocol, port or path. Add the actual hosting hostname when deploying.
5. Create a **Cloud Firestore Standard edition** database in production mode. In its **Rules** tab, publish [firestore.rules](firestore.rules). Review before replacing rules in a shared project. These rules allow owner profile access and owner activity CRUD, and deny settings/other paths.
6. In **Firestore → Indexes → Composite → Add index**, create collection ID `activities`, query scope **Collection**, with `dateKey Ascending` and `startAt Ascending`. Wait until enabled. The same definition is in [firestore.indexes.json](firestore.indexes.json).
7. Run `npm run dev`, open the URL Vite prints (normally `http://127.0.0.1:5173/login`) and sign in with Google.

If Firebase CLI is installed and authenticated, deploy the reviewed files to the explicit development project:

```sh
firebase deploy --only firestore:rules,firestore:indexes --project YOUR_DEVELOPMENT_PROJECT_ID
```

`firebase deploy --only firestore:rules` deploys only rules. `firebase.json` references both repository files without hardcoded credentials or a project ID. No CLI installation/authentication is required to run the app.

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

Create uses a generated document reference and setDoc. Update changes mutable fields with updateDoc, including dateKey when moving dates; delete uses deleteDoc. Basic validation runs in both the form and service. Date/time construction uses local numeric date components, never a forced UTC string. Invalid/nonexistent dates or local times are rejected. End must follow start within the chosen day. Duration is calculated by one shared utility. Overlap is allowed in Phase 3.

Dashboard subscribes to the selected day: dateKey equality plus startAt ascending. Its mini calendar subscribes to the selected month. Calendar subscribes once to its month range, ordering by dateKey; its selected-day list filters that result without another day listener. Month navigation selects the first day of the new month. Listeners unsubscribe on route/date/UID changes; stale results are hidden while a new query loads. No full history download occurs.

The checked-in collection-scope composite index supports the daily equality-plus-order query, matching the indexing pattern in [Firebase's index documentation](https://firebase.google.com/docs/firestore/query-data/index-overview). Monthly range filtering/order uses the same dateKey field and its default ascending single-field index. Remote index availability/error behavior remains a live verification item. If a query reports failed-precondition, check the index above and any project-specific single-field exemptions.

Realtime snapshots update timelines, counts, markers and summaries. Stats derive total logged, activity count and three status counts. Day summary derives earliest start, latest end, logged/work/break totals. Sample remaining-time/goal figures are removed until preferences are persisted. Empty days display a first-activity action with the selected date prefilled; Today uses the actual browser day.

Save/update/delete disable their own actions, retain dialogs while pending, and close/reset only after success. Failures keep input and permit retry. Read failures show a retry action. Known-offline writes fail with connection guidance. If connectivity drops after a write begins, Firebase may keep the write pending until reconnection; the dialog stays pending and no success is reported prematurely. No extra offline persistence, timeout cancellation or optimistic write layer is added.

Rules restrict activities to their path owner, validate the exact field set/enums/lengths/basic timestamps and positive bounded duration, require server audit timestamps and preserve createdAt. They do not implement overlap checks or timezone-aware dateKey matching; service validation owns those local date checks. Source rules alone do not protect a remote project until published.

## Live verification checklist

Phase 2 and Phase 3 cannot be declared complete from synthetic tests alone.

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

`npm test` runs native Node tests for config/auth/profile and activity date/duration/schema/mapper/summary helpers. These do not contact a backend.

`npm run test:e2e` runs locally installed Chrome against Vite's isolated `e2e` mode, with synthetic auth/activity services and fixed browser date/time. Default test port is 5174; if occupied, use another free port:

```powershell
$env:DEVTRACK_E2E_PORT = '5175'
npm.cmd run test:e2e -- --workers=3
```

Tests never reuse an existing server. Synthetic activity persistence is keyed by test UID in test-only storage; production code uses Firebase. E2E production builds are rejected. UI tests prove application interactions, not Google OAuth, deployed rules/indexes or real Firestore durability. Bundled Chromium can be used by removing `channel: 'chrome'` from Playwright config and installing Chromium through Playwright.

Screenshots go to ignored `artifacts/screenshots/`; tests cover 390×844, 430×932, 768×1024, 1024×768, 1440×900 and 1920×1080. `npm run format:check` verifies formatting. The lockfile pins dependencies.

## Phase status and remaining scope

Phase 0/1 are complete and committed. Phase 2 code was checkpointed as `34bef16`; live Google/profile/persistence/logout checks are unconfirmed. Phase 3 implements real activity CRUD, month/day reads, summaries and rules; its live validation is tracked in [Phase 3 report](docs/PHASE_3_REPORT.md). See [progress](docs/PROGRESS.md) and [Phase 2 report](docs/PHASE_2_REPORT.md).

Settings remain local previews and reset when leaving the screen. Preview loading/error URLs remain supported only for Settings in production. Test-only activity adapters can simulate read states. Week/Day views remain roadmap placeholders.

Phase 4: previous-end defaults, overlap prevention and advanced time rules. Phase 5: saved preferences. Later phases: alternate calendar views, reports, integrations, timers, teams, AI and deployment. No advanced time intelligence or settings persistence was added here.
