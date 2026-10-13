# Phase 2 authentication report

Updated: October 13, 2026. Implementation, local checks and the required live authentication/profile checks are complete. Implementation checkpoint: `34bef16`; live verification was completed alongside Phase 3.

## 1. Phase 0/1 auth audit

The existing modular Firebase singleton factories and six-variable validation were functional. React Router already supported nested layouts and lazy pages. AppProviders supplied error handling/toasts. Login, sidebar/logout and mobile identity still used mock presentation; there was no auth subscription, route protection or profile write. Existing React/TypeScript/Firebase/Router tooling was reused.

## 2. Authentication architecture

UI → useAuth/AuthContext → AuthProvider → auth.service → Firebase Auth. Profile writes are separate in userProfile.service. UI receives only AuthUser (`uid`, nullable displayName/email/photoURL), never SDK User/credentials. Routing owns navigation; services/provider do not navigate. Activity data and settings were mocked at the Phase 2 checkpoint; Phase 3 replaces activity persistence, while settings remain a preview.

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

Real Firebase popup code is implemented. Login shows button-level loading, prevents repeated submissions, maps common popup/network/domain/account/provider errors, handles offline feedback and supports retry. GitHub/email are disabled with Soon labels. Anonymous sample-workspace links are removed. The user confirmed successful live Google re-login on October 13; the remote Google provider is enabled and localhost/127.0.0.1 are authorized.

## 9. Firestore user profile

The service reads users/{uid}; sync uses a Firestore transaction to create or merge. Creation includes UID, display name/email/photo, provider google, and server timestamps createdAt/updatedAt/lastLoginAt. Updates omit UID/provider/createdAt, preserving creation time even with concurrent first logins. Pure payload and emulator checks verify creation/update rules. Live backend reads found one matching account profile; re-login preserved its October 12 createdAt and advanced both updatedAt and lastLoginAt together on October 13. A fresh second Google account was not created for testing.

## 10. Sidebar/mobile profile

Both consume useAuth and the shared UserAvatar/name helpers. The sidebar shows real auth name/email. The mobile header opens a native details account menu with name/email/logout and Escape handling. Avatar supports remote photos, broken-image fallback, name initials, email initials and U fallback. Production mock user data was removed.

## 11. Logout

Desktop/mobile share LogoutButton. Official Firebase signOut is called through the service/provider; guards react to the confirmed null auth event. Buttons disable/show loading during the operation. Errors show friendly feedback while preserving session state. Synthetic tests cover both controls. The user confirmed live logout redirects /app to Login, followed by successful Google re-login and Calendar refresh/session restoration.

## 12. Firebase rules

firestore.rules permits only authenticated owner get/create/update of users/{uid}, validates the exact profile fields, requires server audit timestamps and preserves createdAt. Profile list/delete and settings/other paths are denied. The Phase 3 extension also permits owner activity CRUD. These reviewed rules were deployed to dev-track-46323 on October 13; the downloaded released rules match the repository exactly. Local emulator checks and remote Rules API evaluations verify profile ownership and denied profile deletion/settings access. Unauthenticated live profile reads were denied.

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

No completion blocker remains. All six local web settings identify dev-track-46323. Firebase Admin configuration reads confirm Google is enabled and both localhost and 127.0.0.1 are authorized. The default Standard/Native Firestore database exists. CLI login initially failed with expired credentials; the user completed Google reauthentication, enabling rules deployment and backend verification.

The user confirmed live logout protection for /app, successful Google re-login, Calendar refresh/session restoration and no new app/Firebase Console errors. Dashboard refresh also passed during real activity CRUD. Backend reads corroborated one matching account profile and immutable createdAt with refreshed server login/update audit fields. This uses an existing Google account; a new-user OAuth/profile-creation flow was not separately repeated.

The [computer-use skill](<C:/Users/Shajith Ali S/.codex/plugins/cache/openai-bundled/computer-use/26.1007.21434/skills/computer-use/SKILL.md>) references [guidance](<C:/Users/Shajith Ali S/.codex/plugins/cache/openai-bundled/computer-use/26.1007.21434/docs/guidance.md>) stating: "Do not automate user authentication dialogs." The user performed Google authorization and app interactions. Browser automation stopped because it could not determine the Windows browser URL with enough confidence to enforce policy; no further UI actions followed that stop. Live UI results are user-confirmed, while project configuration/profile fields were independently read through authenticated APIs. No passwords, tokens or service-account keys were added to the repository.

## 17. Lint

npm.cmd run lint: PASS, zero warnings with --max-warnings 0.

## 18. Build

npm.cmd run build: PASS, strict TypeScript and production Vite build. No CSS/bundle warnings. Auth is in the startup bundle; Firestore profile code loads separately. Production assets contain no synthetic test user or e2e session adapter identifiers.

## 19. Automated tests

Native tests: **7 passed** (configuration/SDK initialization, user mapping/initials, friendly errors, safe returnTo, first/repeat profile payloads).

Browser tests: **27 passed in the complete suite**, then **1 added offline sign-in test passed** in a focused run. Coverage includes all required route cases, refresh flow, initialization without login flicker, action loading, return paths, popup/profile/logout errors, mobile menu/logout, broken images, and Phase 1 regressions at six viewport sizes.

Auth browser tests use a synthetic service adapter, selected only by Vite's e2e development-server mode on port 5174. Production build in that mode is rejected; ordinary development/production use real Firebase. This validates application behavior and is not a claim that Google OAuth, Firebase storage persistence, backend transactions or deployed rules have been tested. No unexpected external requests or React/runtime warnings occurred in the existing preview regression checks. Test-runner NO_COLOR/FORCE_COLOR warnings are unrelated to app console output.

## 20. Known limitations

Popup-only authentication is implemented; mobile-device redirect fallback, Edge and physical-device OAuth are unverified. Mobile logout and Settings-route refresh have automated coverage; the final live lifecycle check used the desktop app and Calendar. New-account creation and a real second-account isolation session were not separately repeated. Ownership was verified using emulator identities, live guest requests and remote Rules API contexts against the released ruleset. Activity persistence is real after Phase 3; settings remain a preview. No tokens are manually stored by production application code; synthetic test identity storage exists only in the excluded test adapter.

## 21. Deferred work

Phase 3 now delivers real activity CRUD, queries, activity rules, calendar reads and computed daily summaries. Remaining: Phase 4 smart start times and overlap/advanced time validation; Phase 5 persistent settings. GitHub/email auth, integrations, reports, teams, billing, notifications, backend functions and hosting deployment remain outside this phase.

## 22. Completion checklist

- [x] Existing Firebase/routing/UI foundation audited and reused.
- [x] Typed auth abstraction, central subscription/provider/hook and separate operation state.
- [x] Google popup code, friendly errors, offline feedback and inactive-provider cleanup.
- [x] Protected/guest/root routes, initial loading and safe return paths.
- [x] Profile transaction and immutable creation time/server audit payloads.
- [x] Shared real-user presentation, avatar fallback, desktop/mobile logout.
- [x] Owner-only profile rules deployed; Phase 3 extends owner activity access.
- [x] Lint/build/unit and local browser checks pass; responsive UI retained.
- [x] Setup/security/model/test/pending-work documentation updated.
- [x] Google/provider/domain configuration confirmed remotely.
- [x] Rules published; owner operations, live guest denial and simulated cross-user evaluation verified.
- [x] Real Google login, existing profile/relogin, session restoration and logout verified.
- [x] Completion report prepared after live verification for a separate phase commit.

Earlier incomplete checkpoints are superseded by the October 13 results above. Implementation was saved as `34bef16`; the local rules suite was added as `82718bf`. Phase 3 extends activity rules and data paths; see [its report](PHASE_3_REPORT.md).

PHASE 2 STATUS: COMPLETE
