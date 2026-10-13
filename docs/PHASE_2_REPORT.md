# Phase 2 authentication report

Date: October 12, 2026. Implementation and local verification are finished. **Live Firebase project setup and end-to-end verification remain pending**, so this phase is not marked complete.

## 1. Phase 0/1 auth audit

The existing modular Firebase singleton factories and six-variable validation were functional. React Router already supported nested layouts and lazy pages. AppProviders supplied error handling/toasts. Login, sidebar/logout and mobile identity still used mock presentation; there was no auth subscription, route protection or profile write. Existing React/TypeScript/Firebase/Router tooling was reused.

## 2. Authentication architecture

UI → useAuth/AuthContext → AuthProvider → auth.service → Firebase Auth. Profile writes are separate in userProfile.service. UI receives only AuthUser (`uid`, nullable displayName/email/photoURL), never SDK User/credentials. Routing owns navigation; services/provider do not navigate. Activity data and settings remain mocked.

## 3. Auth service

The service owns signInWithGoogle, signOutUser and subscribeToAuthState. Google uses signInWithPopup and an account chooser. Successful sign-in performs best-effort profile sync before returning a typed result. Profile code loads on demand. An eight-second timeout prevents a profile outage from indefinitely blocking an authenticated session. Timed-out writes may still finish; later login retries sync. Error logging contains no user/credential/token objects.

## 4. AuthProvider

One active onAuthStateChanged subscription owns session state, with unsubscribe and stale-callback protection under Strict Mode. Initialization, sign-in and sign-out loading are separate. Promise refs prevent duplicate action submissions. Session retry handles startup failures. SDK auth events are authoritative; logout failure does not manually clear the user.

## 5. useAuth

Exposes app user, authenticated/initializing/signing-in/signing-out state, sanitized initialization error, retry, signInWithGoogle and logout. Calling it outside the provider throws a useful developer error.

## 6. ProtectedRoute

Protects /app and both nested feature routes. Session restoration displays AuthLoadingScreen. Guests redirect to login with a validated internal returnTo. No dashboard/sidebar is rendered for an unauthenticated user.

## 7. GuestRoute

Login waits for session initialization. Existing authenticated sessions redirect to the safe destination or /app. During sign-in, the guest screen remains mounted while profile sync finishes; the guard then navigates once, avoiding a competing LoginPage redirect. Root routes according to restored auth state.

## 8. Google authentication

Real Firebase popup code is implemented. Login shows button-level loading, prevents repeated submissions, maps common popup/network/domain/account/provider errors, handles offline feedback and supports retry. GitHub/email are disabled with Soon labels. Anonymous sample-workspace links are removed. **Live Google OAuth has not yet been confirmed.**

## 9. Firestore user profile

The service reads users/{uid}; sync uses a Firestore transaction to create or merge. Creation includes UID, display name/email/photo, provider google, and server timestamps createdAt/updatedAt/lastLoginAt. Updates omit UID/provider/createdAt, preserving creation time even with concurrent first logins. Pure payload tests verify these properties; actual backend writes are still unverified.

## 10. Sidebar/mobile profile

Both consume useAuth and the shared UserAvatar/name helpers. The sidebar shows real auth name/email. The mobile header opens a native details account menu with name/email/logout and Escape handling. Avatar supports remote photos, broken-image fallback, name initials, email initials and U fallback. Production mock user data was removed.

## 11. Logout

Desktop/mobile share LogoutButton. Official Firebase signOut is called through the service/provider; guards react to the confirmed null auth event. Buttons disable/show loading during the operation. Errors show friendly feedback while preserving session state. Tests verify these UI behaviors using a synthetic service; live Firebase logout remains pending.

## 12. Firebase rules

firestore.rules permits only authenticated owner get/create/update of users/{uid}, validates the exact profile fields, requires server audit timestamps and preserves createdAt. Lists/deletes, activities/settings/subcollections and all other paths are denied. firebase.json references these rules without hardcoding a project. **Publishing and validating them in the development project is pending.** No permissive remote rules are assumed to have been changed.

## 13. Files created

```text
firebase.json
firestore.rules
docs/PHASE_2_REPORT.md
src/features/auth/components/AuthIndexRoute.tsx
src/features/auth/components/AuthLoadingScreen.tsx
src/features/auth/components/GuestRoute.tsx
src/features/auth/components/LogoutButton.tsx
src/features/auth/components/ProtectedRoute.tsx
src/features/auth/components/UserAvatar.tsx
src/features/auth/context/AuthContext.ts
src/features/auth/context/AuthProvider.tsx
src/features/auth/hooks/useAuth.ts
src/features/auth/services/auth.service.ts
src/features/auth/services/userProfile.service.ts
src/features/auth/types/auth.types.ts
src/features/auth/types/profile.types.ts
src/features/auth/utils/authError.ts
src/features/auth/utils/profileWrite.ts
src/features/auth/utils/returnTo.ts
src/features/auth/utils/userMapper.ts
src/styles/auth.css
tests/auth.test.mjs
tests/e2e/auth.spec.ts
tests/support/auth.service.ts
```

## 14. Files modified

README.md, docs/PROGRESS.md, package.json, playwright.config.ts, tsconfig.json, vite.config.ts, src/main.tsx, src/app/providers.tsx, src/app/router.tsx, src/features/auth/LoginPage.tsx, src/components/layout/Sidebar.tsx, src/components/layout/TopHeader.tsx, tests/e2e/foundation.spec.ts and tests/e2e/preview.spec.ts. Removed src/mocks/user.mock.ts. User-supplied .env remains ignored and is not included in a commit.

## 15. Dependencies

None added or removed. Existing Firebase SDK supplies Auth/Firestore, native React context owns session state, and Playwright/Node tests cover behavior. No emulator, global state library, custom backend or extra auth library was introduced. The test script now includes both native test files.

## 16. Manual results and remaining blockers

All six required Firebase environment settings are present, checked without printing their values. The real development server is running on http://127.0.0.1:5173. User is configuring the development project and requested help with Google/domains, Firestore/rules and sign-in errors. No live success result has been received yet.

Browser connector inventory was empty. Computer Use found Chrome on the Firebase console, then stopped for this turn because it could not identify the current browser URL reliably enough to enforce its policy. No further UI actions were issued. The [computer-use skill](<C:/Users/Shajith Ali S/.codex/plugins/cache/openai-bundled/computer-use/26.1007.21434/skills/computer-use/SKILL.md>) references [guidance](<C:/Users/Shajith Ali S/.codex/plugins/cache/openai-bundled/computer-use/26.1007.21434/docs/guidance.md>) stating: "Do not automate user authentication dialogs." Google account selection is therefore a user interaction. No Firebase/gcloud CLI is installed. An official Firebase plugin was discovered and suggested, but installation/connection is not confirmed.

Remaining blockers to completion:

1. Confirm Google provider enablement and localhost/127.0.0.1 authorized domains in the development project.
2. Create/confirm Firestore, publish the reviewed rules and verify owner/non-owner access enforcement.
3. Complete real Google popup sign-in and verify the authenticated identity appears.
4. Verify first-login users/{uid}, server audit fields, and second-login creation-time preservation with no duplicate profile.
5. Verify real Firebase session restoration on dashboard/calendar/settings refresh and real logout blocking protected routes.
6. Inspect the live flow for auth-related browser errors/warnings that prevent operation.

Instructions and common error remedies are in README. No remote configuration change, rule deployment or live test success is claimed.

## 17. Lint

npm.cmd run lint: PASS, zero warnings with --max-warnings 0.

## 18. Build

npm.cmd run build: PASS, strict TypeScript and production Vite build. No CSS/bundle warnings. Auth is in the startup bundle; Firestore profile code loads separately. Production assets contain no synthetic test user or e2e session adapter identifiers.

## 19. Automated tests

Native tests: **7 passed** (configuration/SDK initialization, user mapping/initials, friendly errors, safe returnTo, first/repeat profile payloads).

Browser tests: **27 passed in the complete suite**, then **1 added offline sign-in test passed** in a focused run. Coverage includes all required route cases, refresh flow, initialization without login flicker, action loading, return paths, popup/profile/logout errors, mobile menu/logout, broken images, and Phase 1 regressions at six viewport sizes.

Auth browser tests use a synthetic service adapter, selected only by Vite's e2e development-server mode on port 5174. Production build in that mode is rejected; ordinary development/production use real Firebase. This validates application behavior and is not a claim that Google OAuth, Firebase storage persistence, backend transactions or deployed rules have been tested. No unexpected external requests or React/runtime warnings occurred in the existing preview regression checks. Test-runner NO_COLOR/FORCE_COLOR warnings are unrelated to app console output.

## 20. Known limitations

Live Firebase checks above remain mandatory. Rules have been reviewed in source, not compiled/tested through a rules emulator or deployed by the agent. Popup-only authentication is implemented; mobile-device redirect fallback, Edge and physical-device OAuth are unverified. Auth loading/profile errors are handled, but activity/settings data is still synthetic. No tokens are manually stored by production application code; synthetic test identity storage exists only in the excluded test adapter.

## 21. Deferred work

Phase 3: real activity CRUD, queries and activity rules. Phase 4: smart start times, durations and overlap/time validation. Phase 5: persistent settings. Phase 6: real calendar queries and computed daily summaries. GitHub/email auth, integrations, reports, teams, billing, notifications, backend functions and deployment remain outside this phase.

## 22. Completion checklist

- [x] Existing Firebase/routing/UI foundation audited and reused.
- [x] Typed auth abstraction, central subscription/provider/hook and separate operation state.
- [x] Google popup code, friendly errors, offline feedback and inactive-provider cleanup.
- [x] Protected/guest/root routes, initial loading and safe return paths.
- [x] Profile transaction and immutable creation time/server audit payloads.
- [x] Shared real-user presentation, avatar fallback, desktop/mobile logout.
- [x] Owner-only profile rules created; activity paths remain denied.
- [x] Lint/build/unit and local browser checks pass; responsive UI retained.
- [x] Setup/security/model/test/pending-work documentation updated.
- [ ] Google/provider/domain configuration confirmed remotely.
- [ ] Rules published and actual owner/non-owner behavior verified.
- [ ] Real Google login, profile creation/relogin, session restoration and logout verified.
- [ ] Completed phase committed after all required live checks pass.

Follow-up during Phase 3: native browser observation at http://127.0.0.1:5173/app showed the real authenticated account in the shell. No new OAuth popup, profile lifecycle/relogin, refresh or logout test was performed. Full Phase 2 status therefore remains incomplete. Implementation was saved as checkpoint commit `34bef16` before Phase 3 changes. Phase 3 now extends activity rules and data paths; the profile-only descriptions above record the Phase 2 checkpoint.

October 13 follow-up: official Firebase CLI is now available in ignored artifacts, but its saved login has expired (HTTP 401). Interactive reauthentication awaits the user's Google authorization. The Phase 3 emulator suite now verifies profile ownership, allowed owner updates, immutable createdAt and denied guest/cross-user/list/delete access. This verifies local rules, not the live Google/profile/logout lifecycle; see [the Phase 3 report](PHASE_3_REPORT.md).

PHASE 2 STATUS: INCOMPLETE
