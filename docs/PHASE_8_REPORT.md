# Phase 8 — MVP hardening and release audit

Candidate: DevTrack 0.1.0. Audit date: October 14, 2026. Phases 0–7 are supplied as completed context. Earlier reports retain their historical evidence; the user-maintained Phase 5 report and pre-existing workspace changes were preserved.

Local hardening is implemented and the 0.1.0 candidate is published at [dev-track-46323.web.app](https://dev-track-46323.web.app). The user explicitly selected that existing Firebase project for the MVP. Hardened rules/indexes, public Hosting, all six environment values, Google provider/domain configuration and deployed smoke/security checks are verified. Final signed-in workflow and two-account acceptance remain pending because browser connectors are unavailable. See the [deployment record](RELEASE_0.1.0.md).

## 1. Repository audit summary

Reviewed source features, shared UI, router/providers, Firebase factories/services, validation/mappers, pure domains, tests/fixtures, public assets, environment handling, dependencies, TypeScript/ESLint/Vite, rules/indexes and documentation. Tailwind v4 uses its Vite plugin and CSS theme tokens; a separate legacy Tailwind configuration is unnecessary.

The existing UI → hooks → services → Firebase boundaries remain. Activity/status definitions, preferences defaults, time validation, duration/overlap/gaps, daily/month analysis and auth/preferences state each have a canonical owner. Routes remain lazy-loaded. No new product feature, backend collection, activity field or framework was introduced.

## 2. Critical issues

No critical cross-user access, public-write, credential exposure or core workflow defect was found in the reviewed source and local tests. This is a scoped engineering audit, not a formal penetration test or proof against every possible vulnerability.

## 3. High-priority issues

The repository lacked a Hosting release configuration and an independent production-preview regression. These release-readiness gaps are addressed by explicit Hosting setup, route rewrites, safe project selection and tests of built assets. Real Google sign-in and deployed persistence remain the one outstanding Phase 8 acceptance blocker.

Medium findings fixed: inconsistent stored activity date/duration acceptance, insufficient rule-level duration/precision checks, invalid calendar tab children, low-contrast selectable outside-month dates, untrimmed Firebase configuration and a default-app lookup that failed when an unrelated named app existed. A Windows Hosting glob/header mismatch was discovered during emulator testing and addressed with supported regex rules.

Low findings fixed: unused profile read/type and daily-hook wrapper, unreachable dashboard marker states, stale CSS, unnecessary non-null/DOM assertions, repeated timeline gap searches and toast safe-area positioning.

## 4. Fixes applied

- Activity mapper checks the stored local date against both timestamps, rejects blank tasks and bounds duration; pending/missing audit metadata still maps safely to null. Existing legitimate timestamp seconds remain readable.
- New activity writes require exact elapsed duration of 1–1439 minutes, minute-precision timestamps, nonblank bounded task text and bounded date components in Firestore rules. Existing owner/audit/field restrictions remain.
- Firebase config trims validated values and resolves only the default app as its singleton, even when named apps exist.
- Root mounting and selected-day analysis now check invariants explicitly. Validated local date/time parsing uses numeric slices instead of non-null assertions.
- Calendar Week placeholder has tab semantics; modified arrow keys defer to route/browser handling. Menu items use programmatic focus instead of extra Tab stops.
- Outside-month selectable text uses the readable muted token. Mobile toast placement includes the safe-area inset.
- Removed unused profile reading/type, daily hook alias, placeholder/progress CSS and unreachable dashboard branches. Indexed gap attachment replaces nested full-day searches.
- Added Hosting, release docs, advisory/accessibility checks, production preview/bundle checks, 1366px coverage and one complete release workflow test. Documentation/artifact changes no longer trigger development reloads.

Principal files: `firestore.rules`, `firebase.json`, `.firebaserc`, `vite.config.ts`, Firebase config, activity mapper/timeline/menu, Dashboard, Calendar/MonthCalendar/month analysis, date helpers, providers, styles, test configuration, release tests, README and this release documentation. Existing Phase 6/7 work remains in the shared workspace; no commit or push was made.

## 5. Dependency audit

`npm.cmd install --ignore-scripts --no-fund --no-audit` completed. `npm.cmd ls --depth=0` reports a consistent installed tree. All direct runtime dependencies have current uses; none was removed solely for bundle size. No existing major version was upgraded. Added only `@axe-core/playwright` as a development dependency alongside the existing Playwright stack; package and lockfile agree.

Final `npm audit --json`: **0 known vulnerabilities**, including transitive dependencies; 325 total dependency entries reported. This is advisory coverage at audit time, not a guarantee of vulnerability absence. Ignored local Firebase CLI tooling is separate from the application dependency tree.

## 6. TypeScript audit

Strict mode, unused-local/parameter checking and unchecked-index checking remain enabled. No `any`, `as any`, `ts-ignore`, `ts-expect-error` or ESLint suppression remains in production source. Removed the unused unchecked Firestore-profile cast, DOM cast and non-null assertions. Remaining `as const` declarations preserve literal unions; the status-select cast is bounded to its known option values and affects local filtering only. SDK boundaries parse unknown persisted core data through Zod. Production TypeScript build passes.

## 7. Dead-code cleanup

Removed the unconsumed `getUserProfile`, its unused read interface, `useActivitiesByDate` wrapper, unreachable marker-loading/error branches and unused calendar/progress CSS. Kept real service daily queries because save validation and SDK tests use them. Kept synthetic adapters/fixtures only under tests; they are excluded from production bundles. Intentional development diagnostics remain guarded and contain no credential logging.

## 8. Authentication audit

One cleaned-up auth subscription controls route guards and origin-scoped Firebase session restoration. Internal return destinations are allowlisted. Synthetic Chrome checks cover delayed initialization/profile sync, refresh, direct routes, login/logout/re-login, history, account changes, mobile identity, popup/network/domain errors and failed logout. Profile creation/update timestamp behavior is covered by unit/emulator checks. Built production guest routes restore to Login without exposing protected content.

Google is enabled and both Hosting domains are verified in live Auth configuration. A read-only inspection of the app profile matching the CLI account found a Google-provider profile with all audit fields and a login/profile sync after Hosting publication (02:11:01 UTC). That corroborates a fresh login audit but does not independently identify its browser origin or establish popup/session behavior. New-account, full signed-in workflow and two-account UI acceptance remain unverified. Earlier user-confirmed Phase 2–4 evidence stays historical. No auth tokens were copied into application-owned storage or logs; Firebase manages its own session persistence.

## 9. CRUD regression

Real production services against Firestore emulator cover create/read/update/delete, day/month queries, date moves, document-ID/createdAt preservation, server updatedAt, subscriptions and denied invalid writes. Chrome scenarios cover forms, validation, special text, notes, retries, busy guards, deletion and refresh. The added single happy path logs Jira/Scrum/Development, creates/fills a gap, duplicates, changes status, checks Calendar, deletes and verifies logout/re-login persistence using isolated adapters.

Malformed core time/date/duration data now fails the read with friendly retry feedback instead of entering analytics silently. Optional audit metadata can be absent or pending. No live user records were modified in this audit.

Post-deployment privileged read-only inspection validates all five current-month activities for the account matching the CLI login through the actual production mapper. This establishes existing document integrity, not fresh create/edit/delete UI execution or client-rule isolation.

## 10. Smart-time regression

Unit, emulator and browser checks pass for saved first start, latest-end append, manual suggestion overrides, live duration, one-minute/touching boundaries, equal/reversed/sub-minute/overnight rejection, self-excluding edits, destination-date conflicts, sorted initial/internal gaps, exact gap-fill and delete recalculation. Legacy seconds round suggestions/gaps safely; new writes remain minute-precision. Kolkata, Los Angeles and Berlin local-date/DST cases pass.

Client/server-read overlap prevention still has a simultaneous-client race. Rules do not enforce distributed overlap exclusion or timezone-aware date matching. These are documented MVP limits, not a newly introduced guarantee.

## 11. Settings regression

One UID-keyed preferences provider/listener remains. Production-service emulator tests verify transactional initialization races, save/read persistence, audit preservation, realtime propagation and partial-document fallback. Chrome checks cover dirty/clean remote updates, retry, offline failures, reset-before-save, enabled types, existing disabled types, 12h/24h display, targets, smart starts, cross-tab updates and account isolation. Invalid/empty type lists and inverted work windows are rejected. No activity rewrite occurs on settings changes.

Post-deployment read-only inspection confirms that this account's actual preferences document exists and passes the production mapper; its saved update timestamp predates this release. A fresh signed-in Save/refresh/re-login check remains outstanding.

## 12. Analytics regression

Canonical daily/month functions remain the sole calculation source. Tests verify known logged/target/remaining/overtime/gap/status totals, actual bounds, raw/clamped percentages, empty/partial/target/over-target states, future-date precedence, leap/month boundaries, grouping, historical target-met counts and active-day averages. Dashboard and Calendar share one selected-month subscription; filters never change totals. Day view is functional; Week remains explicitly disabled.

## 13. Productivity UX regression

N, Ctrl/Cmd+Enter, Escape, Today, Alt-arrow and help commands pass typing/composition/repeat/overlay guards. Quick type/duration controls, task autofocus, recent selection/dedup/filtering, late-read cleanup, duplicate/repeat defaults, search/status filters, menu navigation and mobile sticky Save pass. Recents read at most 30 current-user records and display at most five suggestions; no per-keystroke backend query or new collection is used.

## 14. Firestore rules audit

Default-deny rules isolate profiles, activities and the fixed preferences document by path UID. Guests/other users cannot access them; profile/settings list/delete and unlisted paths are denied. Exact allowed fields, enums, lengths, server audit fields and immutable createdAt remain enforced. Activity writes additionally require consistent exact duration and timestamp precision. Date month/day components are bounded; impossible dates such as February 30 and local timezone matching are rejected by client schema/mapper rather than fully encoded in rules.

**48 emulator checks pass** with real client SDK requests, including new mismatched-duration, month/day, whitespace, seconds and persisted sub-second cases. A first sub-nanosecond test value was corrected because Firestore truncates values below stored precision. Hardened rules are now deployed to dev-track-46323 and read back to confirm exact source equality. **48/48 released-rules owner/other-UID/guest simulations pass**, and **ten actual unauthenticated Firestore operations are denied** with rule-level permission errors. Simulations do not execute data writes or log in real accounts; privileged data inspection is not used to claim client isolation. See [Firebase's Rules API testing reference](https://firebase.google.com/docs/rules/manage-deploy).

## 15. Firestore index audit

The existing collection-scope composite index is `activities: dateKey ASC, startAt ASC` for daily equality/order queries. Month range/order on dateKey and newest-first bounded recents on startAt use their default single-field indexes. No new index or query shape is needed. The reviewed definition was deployed to the user-selected release project and live API readback confirms its composite index remains READY. A bounded live current-month integrity query also succeeds; emulator results are kept distinct from this remote readiness evidence.

## 16. Multi-user isolation

Emulator guest/other-UID denials cover profiles, activities, queries and preferences. Browser account-change scenarios hide prior data, unsubscribe listeners and discard late recent-task results. Isolated synthetic stores are test-only. A second real Google account was not used in Phase 8; the requested live two-account check remains outstanding, separately from the emulator proof. Physical-device testing is optional follow-up validation.

## 17. Accessibility results

Automated axe WCAG A/AA-tag scans pass at 390px and 1440px for Dashboard, activity menu, shortcut help, activity form/validation, Calendar Month/Day, Settings and Login; production Login also passes. Selectable outside-month text contrast and Week tab semantics were corrected. Existing keyboard tests cover focus entry/trapping/return, topmost Escape, combobox arrows, menus and tab selection. Status/calendar meaning includes text/icons/descriptions, not only color. Reduced-motion CSS remains.

No complete screen-reader or assistive-technology certification is claimed. [Playwright's accessibility guidance](https://playwright.dev/docs/accessibility-testing) explains the limits of automated scans.

## 18. Responsive results

Chrome checks cover **390×844, 430×932, 768×1024, 1024×768, 1366×768, 1440×900 and 1920×1080**. Login/Dashboard/Calendar/Settings and dialogs fit without document overflow. Gap/conflict/form/error/filter/menu/quick-entry and navigation cases pass at constrained sizes. Save remains scrollable/reachable; safe-area handling covers bottom navigation/toasts. Physical keyboards/devices, mobile OAuth and non-Chrome engines were not separately exercised.

## 19. Performance results

No normal Dashboard/Calendar full-history download or per-day query fan-out exists. One month-range listener, one shared preferences listener and a bounded optional recent read keep query work limited. Month grouping/analysis memoization remains justified; stale listeners/global events clean up. Indexed timeline gap attachment removes repeated nested searches without adding memoization/state machinery.

Production output: entry JS **466.75 kB / 145.15 kB gzip**, lazy Firestore **465.11 / 138.93 kB**, shared schemas **110.60 / 31.23 kB**, workflow dialogs **44.92 / 15.24 kB**, CSS **51.68 / 11.02 kB**. All chunks remain under Vite's default warning threshold. Firebase is needed; no large unused image/dependency was found. The sole public asset is a 317-byte local SVG. No hardware/network performance SLA or Lighthouse score is claimed.

## 20. Resilience results

Loading/empty/error states cover auth, preferences, month data, recents and mutations. Known-offline writes fail clearly; failed create/update/settings keep drafts, failed delete retains context, retry recreates reads and duplicate submission guards prevent extra writes. A network loss after an SDK mutation begins may leave it pending until reconnection; no fake cancellation/success is introduced. Top-level/router error fallbacks retain themed recovery without production stack traces. No late-stage durable offline/PWA/monitoring platform was added.

## 21. Production build result

`npm.cmd run build` passes TypeScript and Vite with real Firebase imports. 2,433 modules transform; no chunk-size warning. Route chunks and assets are generated. Public source maps are explicitly disabled and independently checked. The e2e build guard still rejects test-mode production builds.

## 22. Production preview result

**3/3 Chrome production-preview checks pass**, with no failures/flaky/skipped tests. The server uses `vite preview` and actual `dist`, not Vite e2e adapters. Direct HTTP entry and browser reload of `/`, `/login`, `/app`, `/app/calendar` and `/app/settings` return the SPA and safely route a clean guest to Login at 390/1440px. Assets load, protected UI stays absent, production Login passes axe and test strings/source maps are absent. Authenticated production OAuth/CRUD remains the live acceptance gap.

## 23. Lint result

Final `npm.cmd run lint` passes with zero warnings. The newly added Hosting test's unnecessary regex escape was corrected before final validation; no suppression was added.

## 24. Test result

| Check                                     | Result                 |
| ----------------------------------------- | ---------------------- |
| Native unit/domain/config/schema tests    | 58 passed              |
| Real-SDK Firestore rules/service emulator | 48 passed              |
| Complete Chrome E2E, two workers          | 76 passed, 6.7 minutes |
| Actual production-preview Chrome suite    | 3 passed               |
| Hosting emulator                          | 2 passed               |
| npm advisory audit                        | 0 vulnerabilities      |
| Formatting / Git whitespace               | Passed                 |

The full Chrome JSON report has 76 expected, zero unexpected/flaky/skipped results; production preview has 3 expected and zero unexpected/flaky/skipped. Logs/JSON/screenshots remain ignored under `artifacts/`; Playwright outputs are separated for E2E and production preview. Browser servers bind only to loopback and never reuse another session. No arbitrary coverage percentage was targeted.

After the user authorized publication: a fresh 3/3 production-preview run passes; **4/4 public deployment tests pass** (31.7 seconds, no unexpected/flaky/skipped results), including ten denied guest Firestore operations; **48/48 released-rules simulations pass**. Read-only privileged inspection validates this account's existing profile/preferences and five current-month activities. A separate `test:deployed` configuration targets only the authorized public origin; local test servers continue to bind only to loopback. No broad rerun was needed for unchanged application code.

## 25. Browser console result

Release happy path, accessibility navigation, production preview and deployed guest navigation collect page/console errors and pass without application runtime errors, React key/control warnings or unhandled promise rejections. Error/retry scenarios intentionally simulate backend failures through isolated test adapters. Node runner `NO_COLOR`/`FORCE_COLOR` notices and Firebase CLI local tooling diagnostics are process-level notices, not production browser errors. A fresh signed-in console run remains part of live acceptance.

## 26. Firebase deployment configuration

The user explicitly selected `dev-track-46323` for the MVP release. `.firebaserc` maps development/production aliases to that same project, with no implicit default; development and release intentionally share Auth/Firestore data. Ignored `.env.production.local` explicitly contains all six web values, independently verified against the registered Firebase web app. Factories validate/trim them before SDK use. Web settings are public build configuration, not Admin secrets; no private credential is included.

Rules/index and Hosting deployments completed using explicit `--project dev-track-46323`. Released rules match source, the index is READY, and Hosting version `445a97bd8998d7cd` is FINALIZED. Pre-deployment configuration/rules and the exact built assets/hash manifest are archived locally. Existing user data was not modified; no Git commit, tag or push was created. Publication followed the user's explicit target selection and authorization.

## 27. Hosting configuration

Firebase Hosting is the single primary target, serving only `dist`, with all SPA paths rewritten to `/index.html`. Security headers set `nosniff`, strict-origin referrer policy and disabled camera/microphone/geolocation access. HTML/SPA revalidates; hashed assets use one-year immutable caching. Supported RE2 header patterns avoid the current Windows emulator's glob-slash mismatch. No unverified strict CSP/COOP isolation was introduced around Google popup auth. The [Firebase Hosting reference](https://firebase.google.com/docs/hosting/full-config) documents these configuration fields.

Both local Hosting emulator checks pass, including SPA paths, headers, hashed JS/CSS caching and its 404 for hidden paths. Public Hosting is now independently verified: every deployed JS/CSS asset matches the local candidate hash; all five required route entries/reloads work; published headers/cache policies match. Public `/.env` rewrites to exactly the SPA HTML, unlike the emulator's 404; no environment file is uploaded or exposed. Both Hosting hostnames are already authorized for Google. No custom domain was requested. This is the first Hosting release, with its build archived for future recovery.

## 28. README updates

README now documents current architecture, accurate Day/Week status, hardened activity contract, evidence boundaries, production preview/emulator/public-test commands, the explicitly selected shared MVP project, verified env/domains/index/rules/Hosting, source maps/security headers, archive/recovery and remaining acceptance. Historical Phase 5 evidence is preserved. Added candidate changelog, release checklist and published-version deployment record.

## 29. Release checklist

[RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) records completed project/env/rules/index/Hosting/domain/public-verification gates plus the ten-step signed-in acceptance workflow. Publication is complete; final Phase 8 acceptance is **pending** because the user has not yet supplied full workflow/two-account results and browser connectors are unavailable. Acknowledging the check is not recorded as a test pass.

## 30. Known MVP limitations

Same-day activities; a consistent local browser timezone; simultaneous-client overlap race; no durable offline queue/PWA; settings last-write-wins and current preferences recalculate historical targets; idle midnight rollover waits for interaction/refresh; bounded recents rank activity start rather than frequency. Changing browser timezone can move an otherwise legitimate timestamp outside its stored dateKey and make the defensive mapper reject the affected query; persisted timezone/migration support is deferred. Malformed core records stop the affected read instead of silently disappearing. Rule-level full calendar/timezone/overlap enforcement is deferred. No real second-account/device, full screen-reader or non-Chrome validation was performed in this phase.

## 31. Post-MVP recommendations

After release acceptance, prioritize server-enforced overlap concurrency if simultaneous clients become common, an explicit timezone/history policy, midnight rollover, broader assistive-technology/device/browser validation, and operational error monitoring. Week view, integrations, running timers, exports, teams, AI, reports and advanced offline behavior remain separate product decisions. None was added during final hardening.

## 32. Final Phase 8 completion checklist

- [x] Audit repository, architecture, dependencies, TypeScript, dead code and canonical domains.
- [x] Fix actual data integrity, UI accessibility, initialization and repeated-render-work findings.
- [x] Verify auth/CRUD/time/settings/analytics/productivity locally with unit, SDK emulator and Chrome tests.
- [x] Verify responsive layouts, keyboard workflows, accessibility scans and browser console behavior.
- [x] Pass production build, lint and actual production preview/reload checks.
- [x] Prepare explicit-project Firebase Hosting/rules/index/env/domain/rollback documentation.
- [x] Publish to the explicitly authorized MVP project and verify public routes/assets/headers/guest access, deployed rules/index and Google configuration.
- [x] Complete final Hosting emulator and formatting/whitespace verification.
- [ ] Record the required live Google/Firebase happy path, persistence, multi-date and mobile-responsive acceptance.

Remaining Phase 8 blockers: (1) the full signed-in workflow on the published origin covering a fresh settings Save, CRUD/smart-time/gaps/duplicate, multi-date Calendar, refresh/logout/re-login and mobile interaction; (2) two real Google accounts verifying isolated profiles, activities, settings, recents and Calendar. No browser connector is available to perform these; results have been requested from the user. The post-publication login audit and valid stored data are corroborating backend evidence, not substitutes for those tests. Project selection, publication and automated deployment checks are complete.

PHASE 8 STATUS: INCOMPLETE
