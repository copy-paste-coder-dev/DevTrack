# DevTrack

A small calendar-based developer activity tracker. Dark navy surfaces, restrained cyan and purple accents, and a workspace built for long focus sessions.

## Setup

Requires Node.js 24+ and npm. The Firebase tests use Node's built-in TypeScript support.

```sh
npm install
npm run dev
npm run lint
npm run build
npm run preview
```

On Windows PowerShell with restricted script execution, use `npm.cmd` in place of `npm`. Production hosting must rewrite unknown application paths to `index.html` for React Router.

## Stack and architecture

React, strict TypeScript, Vite, React Router, Tailwind CSS v4 with its Vite plugin, Firebase modular SDK, date-fns, Lucide, Sonner, React Hook Form and Zod. No global state framework or large component library.

```text
src/app/                  Central router and providers
src/components/ui/        Small accessible primitives
src/components/layout/    App shell, branding, page container
src/components/feedback/  Error fallback, retry states and skeletons
src/features/activities/  Activity screens and foundational types
src/features/auth/        Auth context, route guards, services and profile models
src/features/calendar/    Calendar screen
src/features/settings/    Settings screen
src/firebase/             Configuration and service factories
src/mocks/                Typed activity, calendar and settings fixtures
src/styles/               Design tokens and global styling
src/utils/                Local date formatting helpers
```

Styles use CSS design tokens for backgrounds, text, semantic colors, radii, shadows, focus and motion. Tailwind is available for layout utilities. Providers compose error handling, authentication and toasts. `/app`, `/app/calendar` and `/app/settings` require a Firebase session; `/login` is guest-only. `/` routes according to the restored session.

## Firebase setup

1. Create a project at the [Firebase Console](https://console.firebase.google.com/).
2. Register a web app in Project settings and copy its web configuration.
3. Copy `.env.example` to `.env.local`. Fill all six `VITE_FIREBASE_*` values with your project configuration. Restart the dev server after edits.
4. Open **Authentication → Sign-in method → Google**, enable the provider, choose a project support email and save. GitHub/email sign-in remain disabled in DevTrack.
5. Open **Authentication → Settings → Authorized domains**. Add `localhost` and `127.0.0.1` for local development. Add your actual production domain after deploying to Firebase Hosting/Vercel or another host. Do not assume local domains are already present. Domains do not include a protocol, port or path.
6. Create a **Cloud Firestore Standard edition** database in your intended region using production mode. Open its **Rules** tab, replace the rules with [firestore.rules](firestore.rules), then publish. The rules permit only owner profile access; all activities/settings remain denied. In an existing shared database, review these rules before replacing other applications' rules.
7. Restart Vite after editing environment files. Open `http://127.0.0.1:5173/login` and use Continue with Google. The ignored `.env` is also supported by Vite; `.env.local` is recommended for local settings. Do not commit either.

If Firebase CLI is already installed and authenticated, deploy the same reviewed rules with `firebase deploy --only firestore:rules --project YOUR_DEVELOPMENT_PROJECT_ID`. `firebase.json` points to the rules file; no project ID or credentials are hardcoded. The CLI/emulators are not required for running the application.

Firebase is initialized once through lazy factories. Auth initialization now runs on startup; incomplete configuration shows a safe setup error on the login page and does not expose protected screens. The config reader retains developer diagnostics listing missing variable names. Real `.env` files are ignored. Vite variables are client-visible Firebase web configuration, never Admin SDK/private credentials. Persisted activity times will use Firestore Timestamps in later phases; current date helpers use the browser's local timezone.

Official setup references: [Firebase web setup](https://firebase.google.com/docs/web/setup), [Tailwind Vite integration](https://tailwindcss.com/docs/installation/using-vite), [React Router data routing](https://reactrouter.com/start/data/installation).

## Phase plan

- Phase 0 (complete): foundation, tooling, routing, theme, UI primitives, Firebase factories and documentation.
- Phase 1 (complete): polished UI based on the supplied collage, using clearly identified sample data; responsive dashboard, calendar, settings, activity dialogs and login preview.
- Phase 2: Google authentication, session restoration, route protection, authenticated profiles and owner-scoped user profile writes; live validation status is tracked in [the Phase 2 report](docs/PHASE_2_REPORT.md).
- Phase 3: Firestore activity CRUD. Phase 4: scheduling defaults/durations/overlap rules. Phase 5: persisted preferences. Phase 6: real calendar queries and daily summaries.

No authentication, Firestore CRUD, persisted settings, activity scheduling or analytics is included in Phase 0.

## Tooling notes

TypeScript is pinned to the supported 6.x line because typescript-eslint does not yet support TypeScript 7. Firebase's Node-only gRPC dependency is overridden to a patched 1.x version (>=1.13.6) to address GHSA-m9gg-hp2v-232j and GHSA-f596-whhp-79r4; the web application uses Firebase's browser implementation. Revisit the override when Firebase updates its own dependency.

`npm test` checks configuration/SDK initialization and pure auth/profile helpers without backend access. `npm run test:e2e` checks auth routing/interactions and responsive layouts using locally installed Google Chrome. Tests use a local-only auth service adapter on port 5174; they do not prove real Google OAuth, Firebase persistence or deployed rules. Vite rejects production builds using that adapter's `e2e` mode. Normal dev/production always use the Firebase implementation. To use bundled Chromium elsewhere, remove `channel: 'chrome'` in `playwright.config.ts` and run `npx playwright install chromium`.

`npm run format` formats source and documentation; `npm run format:check` verifies it. The lockfile pins the exact dependency versions. UI routes are loaded on demand to keep the initial bundle small.

## Phase 1 preview

- `/app`: five summary cards, sample activity timeline, mini calendar, workday summary and date navigation.
- `/app/calendar`: navigable month, keyboard day selection, selected-day list, empty-day state and Month/Week/Day tabs (Week and Day are roadmap placeholders).
- `/app/settings`: editable work-hours controls, activity-type switches, custom-category preview and reset.
- `/login`: real Google sign-in, with GitHub/email marked Soon. Protected workspace access requires authentication.
- Add/edit dialogs share `ActivityForm`, validate required fields and show the future automatic-start-time hint. Save/update/delete preview actions show a toast and leave the sample timeline intact. Native dialogs support Escape, modal keyboard focus, internal scrolling and focus restoration.

The default sample day is **Monday, October 12, 2026**, matching the date in the brief (the collage's weekday was inconsistent). It shows six activities: 6h 30m logged, 30m break, 6h work, four completed, one in progress and one on hold. October 13 is a distinct light day with two activities and 1h 30m logged. October 9 demonstrates a long task name and an eight-hour activity. Other dates are empty. “Today” returns to the fixed sample day in this UI preview. Totals are fixture values, not production calculations. Settings reset on leaving the page and do not alter fixture data.

The responsive design follows the supplied visual language with restrained glow. All five summary cards remain visible at smaller sizes. Mobile layouts show a profile avatar, bottom navigation, a full-width Add Activity button after stats, then timeline, mini calendar and day summary. The login illustration is a lightweight CSS/code composition. Real statistics and alternate calendar logic remain later scope.

For deterministic state previews, append `?preview=loading` or `?preview=error` to `/app`, `/app/calendar` or `/app/settings`. Try Again restores the normal mock view. These states do not simulate network traffic or write data.

Chrome tests capture screenshots in ignored `artifacts/screenshots/` and verify all screens at 390×844, 430×932, 768×1024, 1024×768, 1440×900 and 1920×1080. See the [detailed Phase 1 report](docs/PHASE_1_REPORT.md) and [implementation status and pending work](docs/PROGRESS.md) for the handoff.

## Authentication and user profiles

`AuthProvider` owns one active `onAuthStateChanged` subscription, correctly cleaned up under Strict Mode. `useAuth` exposes an app-level `AuthUser`, initialization/sign-in/sign-out state and actions. Visual components never receive Firebase `User` objects or call SDK methods. `auth.service.ts` owns Google popup/sign-out/subscription; `userProfile.service.ts` owns Firestore profile access. Firestore code is loaded after sign-in.

Firebase's default persistent browser auth restores sessions for the same origin. During restoration, guards show a branded loading screen; login and protected content wait for the initial result. Only `GuestRoute` performs post-login navigation, after best-effort profile sync. Safe `returnTo` values are limited to the three known app paths, including their query/hash. External/unknown paths fall back to `/app`.

Successful Google login syncs `users/{uid}` in a transaction. New profiles contain `uid`, nullable `displayName`/`email`/`photoURL`, `provider: 'google'`, and server timestamps `createdAt`, `updatedAt`, `lastLoginAt`. Later logins update identity fields and the last two timestamps while preserving `createdAt`, including concurrent first logins. Profile failure or an eight-second sync timeout warns without ending the authenticated session; a timed-out write may still finish in the background. The next login retries sync.

Rules restrict document get/create/update to the matching authenticated UID, validate profile fields and server audit timestamps, preserve creation time, and deny lists/deletes/other collections. No OAuth/ID/access tokens are copied to Firestore, logs or custom browser storage. Firebase manages credentials. Rules must be published in your project; a local file alone does not secure the remote database.

Sidebar and mobile account menu share the authenticated identity and avatar component, including initials and broken-image fallback. Both provide logout. Successful SDK sign-out makes protected routes redirect; failures show a retryable message and retain the session. Google is the only enabled UI provider. Activity data and settings still behave as Phase 1 mocks.

## Live Phase 2 verification

1. Enable Google, authorize local domains, create Firestore and publish the rules above.
2. With no session, open `/`, `/app`, `/app/calendar` and `/app/settings`; each must reach login.
3. Sign in with Google, complete the account chooser yourself, and verify the requested destination and your sidebar/mobile identity.
4. In Firestore Data, verify one `users/{YOUR_UID}` record and all three server timestamps. Note `createdAt` for comparison.
5. Refresh `/app`, then `/app/calendar` and `/app/settings`. The session must restore without displaying login.
6. Logout from desktop/mobile. Open `/app` directly and confirm it redirects to login.
7. Sign in again. Confirm the same document ID, unchanged `createdAt`, and newer `updatedAt`/`lastLoginAt`.
8. In Firestore Rules Playground, test signed-out profile access (deny), owner get/create/update (allow with valid fields/timestamps), another UID (deny), profile list/delete (deny), and activity paths (deny). The CLI/emulator rule suite has not been introduced in this phase.

Common setup failures: unauthorized-domain → add the exact browser hostname; operation-not-allowed → enable Google; popup-blocked → allow the Google popup; profile warning/permission-denied → create Firestore and publish the reviewed rules; missing/invalid config → verify all six local Vite values and restart Vite. Never paste passwords, OAuth credentials or ID tokens into issue reports.
