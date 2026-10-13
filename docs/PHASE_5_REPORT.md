# Phase 5 personal preferences report

October 13, 2026. Implementation, all local checks and settings-rules deployment are delivered. Required live verification remains pending; this is an implementation checkpoint rather than a completed-phase claim. The existing Phase 4 commit is cd8457c.

## 1. Existing settings audit

SettingsPage stored screen-local start/end/time-format/type toggles and arbitrary custom labels. Leaving the page lost changes. settings.mock.ts supplied defaults; usePreviewState supplied production URL fixtures. Phase 4 getWorkdayPreferences() always returned 09:00. Timeline/cards/summary text used fixed 24h formatting. DaySummary had actual times/totals but no persistent target. Existing AuthProvider, protected AppShell, service aliases, RHF/Zod, metadata, toggles, skeletons and error UI were reused.

## 2. Temporary/hardcoded preference sources found

Removed settings.mock.ts, usePreviewState.ts and workdayPreferences.ts. Replaced screen-local preferences and the runtime 09:00 abstraction. Canonical defaults are now declared only in defaultPreferences.ts: 09:00 / 18:00 / 24h / all nine known types. HH:mm remains the internal input/storage format and is not a separate presentation preference.

## 3. Settings architecture implemented

UI → one protected preferences provider/hook → settings service → Firebase. Pure schema/mapper/workday/time-format/type-option helpers hold business logic. The provider defers loading the service until an authenticated shell mounts, preserving Firebase code splitting. No package or lockfile change, duplicate settings store, custom-type persistence or new index was added.

## 4. Firestore settings path

users/{uid}/settings/preferences. Fixed preferences ID; no random documents or duplicated UID. Exactly six fields: dayStartTime, dayEndTime, timeFormat, enabledActivityTypes, createdAt, updatedAt. Workday length, remaining/progress, formatted labels and activity metadata are derived.

## 5. UserPreferences model

Typed UserPreferences and UpdateUserPreferencesInput contain canonical HH:mm strings, TimeFormat ('12h' | '24h') and existing ActivityType values. SettingsService defines get/create/update/subscribe methods with explicit UID. The provider's public API exposes preferences, loading/error, Retry, saving state and updatePreferences. UI does not call Firestore directly.

## 6. Default preference strategy

One DEFAULT_USER_PREFERENCES object and a copy factory provide independent enabled-type arrays. Defaults apply to newly initialized users, absent fields in old documents and read-error fallback. They do not replace a successfully loaded user's preferences. Loading exact values holds Add until ready; read failure re-enables logging with a visible defaults warning.

## 7. Settings service implementation

Direct document reads/listens, transactional missing-document creation and transactional full-form saves. Inputs pass the shared Zod schema before writing. Saves preserve createdAt, use server updatedAt and write only canonical fields. Transaction reads guard initialization races and audit preservation. Explicit offline status rejects saving. SDK/mapper failures propagate to friendly UI errors; raw backend objects are not displayed.

## 8. Preferences provider/hook implementation

One listener under protected AppShell, keyed by authenticated UID. Components share context without additional subscriptions. It unsubscribes on UID/logout/unmount/retry and ignores stale callbacks. Keyed sessions discard prior-account preferences before new consumers render. One initialization promise prevents repeated missing callbacks from launching duplicate creates; one save promise prevents duplicate submissions. Initialization/write errors are handled. Settings read errors use defaults for activity consumers plus warning/Retry.

## 9. Missing-document initialization

Initialization occurs on authenticated app load, without visiting Settings or coupling to Login. Only a server-confirmed missing snapshot triggers creation. includeMetadataChanges ensures a cache miss followed by a confirmed server miss arrives. The transaction writes defaults only if the document is still absent, so another tab's saved values win. The real SDK/emulator test verifies the missing callback, concurrent creates and no overwrite after custom values exist.

## 10. Partial-document fallback behavior

Missing fields receive canonical defaults; existing fields remain unchanged. Unknown metadata is not included in the UI model. Explicit malformed/null values reject rather than silently pretending they are saved valid values. A partial document is not replaced during initialization. Saving writes complete validated preferences and preserves or initializes createdAt. Emulator migration coverage seeds a partial legacy document only in the guarded loopback demo project, then uses the production service to verify fallback and audited completion.

## 11. Settings page migration

Retains work-hour sections, metadata/type toggles, dark neon layout and responsive aside. RHF/Zod manage one local draft and one Save changes action. Fields validate on change; invalid work windows/zero types block Save. Save disables the fieldset, announces Saving…, retains input on failure, reports Settings saved. and resets dirty state on success. Clean forms follow remote snapshots; dirty forms retain edits. Reset to defaults edits only the draft until Save. Arbitrary custom types are disabled as Coming later.

## 12. Day Start integration

ActivityDialog receives current saved dayStartTime when building create defaults. Dashboard, Calendar and empty-state create flows share it. Empty-day text respects saved format. Reopening recomputes values; open activity drafts stay stable. An existing day's latest end still takes priority regardless of changes to dayStartTime. No current-clock override was added.

## 13. Day End integration

DaySummary derives target minutes from dayEndTime − dayStartTime in wall-clock minutes. Remaining = max(target − total logged minutes, 0). All logged time, including breaks, contributes to the target; the UI explicitly states this. Progress clamps to 0–100%, while actual logged totals stay unlimited. Actual Work start/end remain earliest/latest activity timestamps. No trailing gap is inferred from day end.

## 14. Time Format integration

Shared formatTime/formatTimeString handle midnight, noon and AM/PM. Timeline times, cards, gap range/button labels, empty-day text, summary actual times and workday preview follow 12h/24h. Live local conflict alerts follow the display format. Canonical time input/default values and Firestore timestamps do not change. Service conflict text can use canonical 24h values when a save discovers a newly introduced/destination-date conflict; this remains a useful readable error rather than changing stored values.

## 15. Activity Type integration

The shared option builder shows only enabled types for create, selecting Development when enabled or the first enabled option otherwise. Preferences require at least one unique known type. If a type becomes disabled while a create draft is open, the form asks for an enabled choice and Save is blocked; submit also checks current preferences. No activity documents or metadata are rewritten when toggles change.

## 16. Existing disabled activity type behavior

Timeline, calendar, totals, summaries and gap occupancy retain every existing activity regardless of its type's enabled state. Editing includes the persisted original disabled type with “currently disabled” alongside enabled options. The user can save that type unchanged. Arbitrary other disabled types are not offered.

## 17. Smart-start regression result

Browser tests verify saved 08:30 on an empty day, then latest end 10:00 after logging. Changing day start to 09:30 does not change the subsequent 10:00 suggestion. Calendar uses the same preference. Phase 4 create/edit overlap, gap-fill, deletion, draft-stability and no-navigation checks remain in the full regression suite.

## 18. Gap regression result

Saved 08:30 with a first activity at 09:00 derives a 30-minute initial gap; labels respect AM/PM. Preference changes recalculate gaps without changing activities. Running-maximum, minute-safe boundary logic remains unchanged. Empty days and last entries do not create fake trailing gaps. Counts/totals exclude gap rows.

## 19. Firestore rules changes

Added fixed preferences owner get/create/update. Rules validate exact fields, HH:mm, increasing same-day start/end, known time format, nonempty unique known activity types, server audit timestamps and immutable createdAt. Legacy missing createdAt can initialize on a complete valid save. Settings collection list, delete, random IDs and all unrelated paths remain denied. Profile/activity protections are preserved.

Published only firestore:rules to dev-track-46323 after emulator verification; backed up the previous released source in ignored artifacts. Released ruleset: projects/dev-track-46323/rulesets/68f92e2e-38bf-42c5-ae85-0986242b38f1. Remote source exactly matches the repository; the existing daily activity index is still READY. Eighteen remote Rules API evaluations pass for owner/guest/other-UID settings access and profile/activity regression. These are simulated contexts, not a second real OAuth login; no evaluated writes/deletes execute.

## 20. Files created

- docs/PHASE_5_REPORT.md
- src/features/settings/config/defaultPreferences.ts
- src/features/settings/context/UserPreferencesContext.ts
- src/features/settings/context/UserPreferencesProvider.tsx
- src/features/settings/hooks/useUserPreferences.ts
- src/features/settings/services/settings.service.ts
- src/features/settings/types/preferences.ts
- src/features/settings/validation/preferences.schema.ts
- src/features/settings/utils/activityTypeOptions.ts
- src/features/settings/utils/preferences.mapper.ts
- src/features/settings/utils/preferencesError.ts
- src/features/settings/utils/timeFormat.ts
- src/features/settings/utils/workday.ts
- tests/preferences.test.mjs
- tests/rules/preferences.test.mjs
- tests/e2e/preferences.spec.ts
- tests/support/settings.service.ts

## 21. Files modified

SettingsPage; AppShell; EmptyState; DashboardPage/CalendarPage; ActivityDialog/Form/Timeline/Card/DaySummary; activityTime/schema; date.ts; workspace.css; firestore.rules; Vite/TypeScript service aliases; Playwright scenario timeout; existing preview spec and synthetic auth adapter; README/PROGRESS. Deleted the three obsolete settings preference/mock/preview files listed above. No credentials, actual environment files, dependencies or live test data were committed. Ignored logs, local SDK/CLI tooling, read-only probes and screenshots remain verification artifacts.

## 22. Tests added

Eight native tests cover default copies, strict preferences schema, absent-field mapping/malformed rejection, short/same-day work windows, target remaining/progress, 12h/24h midnight/noon formatting, create/edit type options and sanitized errors. Emulator tests cover production-service persistence/initialization races/listening/audits, two identities and ownership, malformed fields/types/timestamps, missing server snapshots and partial legacy migration. Twelve preferences browser scenarios cover persistence, auth changes, draft/save/fallback/retry/remote updates, cross-tab propagation and five responsive widths. Existing preview tests now verify real settings behavior rather than mocks/custom categories.

## 23. Manual settings test results

Pending the requested user check at http://127.0.0.1:5173/app/settings: load initial defaults, save 08:30/17:30/12h and Meeting disabled, refresh, confirm empty-day smart start/type filtering and AM/PM display, then logout/login and activity regression. Confirm an existing disabled-type entry remains editable, or create a separate Meeting test before disabling it. Results are required before completing this phase.

A final read-only development probe still found no preferences document for the CLI account and five existing activities, so live initialization/persistence has not been established for that account. A stable bounded activity fingerprint is saved in ignored phase5-live-before.json. UI/account-specific results must be distinguished from CLI-account corroboration if a different account is used. Probes perform no data mutations. No claim of live settings-driven activity preservation or audit preservation is made yet; emulator/browser checks verify those behaviors locally.

## 24. Multi-user isolation test

Two emulator identities own different persisted settings; cross-user reads/writes are denied through the real client SDK. Browser tests switch from user A (08:30) to user B (10:00) and verify no leaked start/types/format and listener cleanup. Released Rules API other-UID/guest contexts deny access. A second real Google account or physical second device is not yet verified; these results are explicitly simulated/emulator evidence.

## 25. Responsive regression result

Settings and 12h timelines/target/gaps are checked at 390, 430, 768, 1024 and 1440px. Existing screen/modal regression extends to 1920px. Labels remain visible; time controls use native values; linked validation messages, switches, focus treatment and progressbar semantics remain accessible. Inspected mobile settings and desktop 12h dashboard screenshots. Screenshot focus/toast overlays are transient test UI, not persisted content.

## 26. Lint result

npm.cmd run lint passes with zero warnings. Final format:check and git diff --check also pass.

## 27. Build result

npm.cmd run build passes strict TypeScript and Vite. Lazy settings-service loading preserves split Firebase chunks and removes the initial large entry-chunk warning. No synthetic settings/auth/activity code is included in production. Local live verification uses the production preview on 127.0.0.1:5173, avoiding development hot updates while testing.

## 28. Test result

- npm.cmd test: 31 passed.
- Firebase emulators:exec --only firestore --project demo-devtrack "npm.cmd run test:rules": final 40 passed.
- Focused preferences/preview browser run: 22 passed.
- Full browser regression: final 52/52 passed in 4.0 minutes with two workers. An initial run passed 51/52; the second-tab case hit the 30-second timeout before Save under load. It now brings the saving tab into focus. A further three-worker run hit cold-start 30-second limits in multi-route auth/CRUD scenarios and was interrupted. Scenario timeout is now 60 seconds; field/behavior assertion thresholds are unchanged. Focused cross-tab and final full runs pass.
- Released Rules API: 18 passed; deployed source matches repository.

## 29. Known limitations

Full-form settings saves are last-write-wins. Dirty Settings drafts retain edits when another tab saves; no merge/conflict dialog is added. No custom offline preference queue/cancellation/timeout layer is implemented; a connectivity loss after a transaction starts follows SDK behavior. Browser-native time picker appearance is locale-controlled. Timezone selection/overnight work schedules remain unsupported. Activity overlap races across concurrent tabs remain the Phase 4 limitation. Display-format service conflict text and real second-account/device limits are described above. Test identities are not real Google accounts.

## 30. Deferred Phase 6+ items

Stronger calendar/daily intelligence, functional Week/Day views, timezone/overnight handling, arbitrary custom types, weekday schedules/holidays/shifts, timers, integrations, reporting/export, notifications, AI, teams/organization policies, approvals/billing, hosting and remote Git push. Unsaved-navigation warnings and dirty-draft merge prompts are optional deferred UX.

## 31. Phase 5 completion checklist

- [x] One Firestore preferences document, canonical defaults and typed schema/mapper.
- [x] Initialization races, server-confirmed missing state and partial-field migration handled.
- [x] One UID-scoped listener, stale callback protection and logout/account cleanup.
- [x] Real Settings form with validation/loading/dirty state/retry/local reset.
- [x] Saved starts/ends/format/types integrated with activities, gaps and targets.
- [x] Existing disabled types remain visible and editable.
- [x] Owner/schema/audit security verified locally and released to development.
- [x] Native/emulator/browser tests, lint/build/format checks.
- [x] Final complete 52-scenario browser regression.
- [ ] User-confirmed live persistence/integration/session verification.
- [x] Report/progress and implementation checkpoint committed; commit ID is in the handoff.

Remaining completion blocker: real Firebase live initialization/save/refresh/session and settings-integration verification described in section 23. The final completion report/commit follows those results. No implementation feature or local check remains pending. Broader physical-device/second real OAuth-account checks are known validation limits, not falsely claimed results.

PHASE 5 STATUS: INCOMPLETE
