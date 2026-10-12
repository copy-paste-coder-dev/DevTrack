# DevTrack

A small calendar-based developer activity tracker. Dark navy surfaces, restrained cyan and purple accents, and a workspace built for long focus sessions.

## Setup

Requires Node.js 22.12+ (Node 24 recommended) and npm.

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
src/components/feedback/  Error fallback and boundary
src/features/activities/  Activity screens and foundational types
src/features/calendar/    Calendar screen
src/features/settings/    Settings screen
src/firebase/             Configuration and service factories
src/styles/               Design tokens and global styling
src/utils/                Local date formatting helpers
```

Styles use CSS design tokens for backgrounds, text, semantic colors, radii, shadows, focus and motion. Tailwind is available for layout utilities. Providers compose error handling and toasts. Routes are centralized at `/`, `/app`, `/app/calendar`, `/app/settings`; authentication can later wrap the app route.

## Firebase setup

1. Create a project at the [Firebase Console](https://console.firebase.google.com/).
2. Register a web app in Project settings and copy its web configuration.
3. Copy `.env.example` to `.env.local`. Fill all six `VITE_FIREBASE_*` values with your project configuration. Restart the dev server after edits.
4. Open Authentication and choose **Get started**. Provider setup and actual login belong to Phase 2.
5. Create a Cloud Firestore database in your intended region. Use production mode; keep access denied until authenticated user-scoped rules are implemented. Do not enable public writes.

Firebase is initialized once, lazily when `getFirebaseApp()`, `getFirebaseAuth()` or `getFirebaseFirestore()` is called. This keeps the UI preview usable without configuration. Missing values produce an explicit developer error listing the missing variables; no Firebase requests run in the preview. Real `.env` files are ignored. Vite variables are client-visible Firebase web configuration, never Admin SDK/private credentials. Persisted activity times will use Firestore Timestamps in later phases; current date helpers use the browser's local timezone.

Official setup references: [Firebase web setup](https://firebase.google.com/docs/web/setup), [Tailwind Vite integration](https://tailwindcss.com/docs/installation/using-vite), [React Router data routing](https://reactrouter.com/start/data/installation).

## Phase plan

- Phase 0: foundation, tooling, routing, theme, UI primitives, Firebase factories and documentation.
- Phase 1: polished UI based on the supplied collage, using clearly identified sample data; responsive dashboard, calendar, settings, activity dialog and login preview.
- Phase 2: authentication, protected routes and provider configuration.
- Later: Firestore models/security rules, activity CRUD, work preferences, scheduling defaults, overlap validation and real summaries.

No authentication, Firestore CRUD, persisted settings, activity scheduling or analytics is included in Phase 0.

## Tooling notes

TypeScript is pinned to the supported 6.x line because typescript-eslint does not yet support TypeScript 7. Firebase's Node-only gRPC dependency is overridden to a patched 1.x version (>=1.13.6) to address GHSA-m9gg-hp2v-232j and GHSA-f596-whhp-79r4; the web application uses Firebase's browser implementation. Revisit the override when Firebase updates its own dependency.

`npm test` checks Firebase configuration and SDK initialization without backend access. `npm run test:e2e` checks routes and responsive layouts using locally installed Google Chrome. To use bundled Chromium elsewhere, remove `channel: 'chrome'` in `playwright.config.ts` and run `npx playwright install chromium`.
