# Phase 3 activity persistence report

Updated: October 13, 2026. Implementation, local checks, rules/index deployment and required live CRUD/calendar verification are complete. Implementation checkpoint: `7960598`; rules emulator checkpoint: `82718bf`; Phase 2 live verification completion: `c78927b`.

## 1. Phase 1/2 architecture audit

Reused the existing AuthProvider/useAuth, app-level UID, validated Firestore singleton factory, protected routes, Sonner feedback, React Hook Form/Zod form, native dialogs, cards, timeline, selected-date URL and responsive styles. Dashboard and Calendar depended on activities.mock.ts/calendar.mock.ts; selected dates defaulted to the demo day. Dialog submissions only showed preview toasts. Summary/goal fields were fixtures. Profile-only Firestore rules denied activity paths. Phase 2 implementation was saved separately as checkpoint `34bef16`; its live profile/persistence/logout checks were subsequently completed during this phase.

Migration: activity data/markers/summaries/forms become Firestore-backed, settings remain a preview. Shared type/status badges and layout retain their presentation. Calendar gains controlled month props; dialogs gain operation loading and error props. Services own SDK calls, hooks own UID/listeners/actions, pure helpers own conversion and summaries. No dependency was added.

## 2. Firestore activity model

Path: users/{uid}/activities/{activityId}. Exact document fields: dateKey, activityType, taskName, status, startAt, endAt, durationMinutes, notes, createdAt, updatedAt. Times are Timestamp; audit fields use serverTimestamp. The path owns UID/ID, so neither is duplicated in the body. Task/notes are trimmed; absent notes become an empty string.

## 3. Domain types

Activity uses id plus canonical activityType/taskName/startAt/endAt fields; timestamps become Date, and pending/missing audit timestamps become null. Central activityTypes/activityStatuses are reused. CreateActivityInput and UpdateActivityInput contain only user-supplied fields. Update deliberately includes dateKey because this specification requires date moves. ActivityDocument isolates SDK Timestamp fields. ActivityService defines the typed service boundary, also used by the test adapter.

## 4. Activity service

activity.service.ts implements createActivity, updateActivity, deleteActivity, getActivitiesByDate, getActivitiesByDateRange and both realtime subscription methods. Every service accepts an explicit UID and scopes the collection path. IDs/UIDs must be valid path segments; date/range inputs are validated. Payload mappers perform service-level Zod validation and duration calculation. Runtime document parsing rejects malformed data instead of casting or silently omitting records. Read failures route to the query error state. Development diagnostics log a sanitized code only.

## 5. Hooks

useActivitiesByDate/useActivitiesByRange share a small useActivities implementation. It owns one listener per invocation and unsubscribes on date/range/UID/unmount changes. Active flags discard stale callbacks. State is keyed by UID/query/retry revision so prior results are hidden before the new listener resolves, including account changes. No UID means no query and an empty nonloading result. Retry increments revision and recreates the listener. useActivityMutations owns create/update/delete loading and a synchronous promise ref that rejects duplicate pending submissions.

## 6. Create flow

The first-activity/Add action prefills the selected day. Form validation converts local date/time to an input and invokes the mutation hook. Create generates a document reference and uses setDoc with both server audit timestamps. The form/actions/close/cancel disable while saving. Success shows Activity logged., closes the dialog and resets by unmounting. Failure keeps entered values and displays a friendly error. No previous-end defaults or overlap checks were added.

## 7. Read/query flow

Dashboard: dateKey equality + orderBy startAt ascending, scoped to the authenticated UID. Its mini calendar separately reads the visible selected month. Calendar: inclusive dateKey range + orderBy dateKey ascending; selected-day rows filter that month result, avoiding another day read. No complete-history query is made. Robust local sorting handles equal start times deterministically. Query changes show skeletons, empty days show the first-activity action, read failures show Retry. Month navigation selects the first day of its new month so the list and markers refer to the queried range.

## 8. Update flow

Edit populates the original data and uses updateDoc. Mutable fields include dateKey, recalculated start/end/duration, task/type/status/notes and updatedAt. createdAt is omitted. Changing date builds both Date values on the new local day and moves the activity between listeners. Target-specific initial values reset through React Hook Form; a dialog key prevents stale edit/delete targets. Success shows Activity updated.; failure leaves the edited values available for retry.

## 9. Delete flow

Confirmation invokes deleteDoc. Deleting… communicates the pending action and disables cancellation/close/duplicate confirmation. Success shows Activity deleted. and clears the parent target. Failure retains the dialog and a friendly error. Escape/focus behavior is retained for ordinary dialogs; pending mutations intentionally hold the dialog until their outcome is known. Snapshot updates remove rows/markers without custom optimistic state.

## 10. Dashboard migration

No production activity/calendar fixtures or preview-state hook remain in Dashboard. Real query results drive five stat cards, the timeline and the day summary. Today selects the actual local browser day. Header/sample-day labels are removed. Invalid date query parameters fall back to the actual day. The mini calendar also derives markers from real month activity data; marker failures have their own retry feedback.

## 11. Calendar migration

No production activity/calendar fixture imports remain. Month markers and counts derive from queried documents; selected-day activity rows/totals derive from the same range. Navigating months changes the query range. Week/Day tabs remain roadmap placeholders. Static October fixture notes and sample legend wording are removed; keyboard day selection and responsive layout remain.

## 12. Real summaries

Pure helpers implement sumDurationMinutes, countActivitiesByStatus, getEarliestStart, getLatestEnd, sortActivities, getDaySummary and getActivityDates. They derive counts, logged/work/break minutes and actual start/end. Overlapping blocks are summed individually because overlap validation is later scope. Remaining/goal/progress fixture fields were removed, avoiding an implied persisted workday target. Empty summaries show zero durations and absent start/end markers.

## 13. Date/time approach

combineDateAndTime builds a local Date from numeric year/month/day/hour/minute components. It checks calendar/time round trips, rejecting impossible dates and nonexistent local DST times. toDateKey uses local date formatting rather than UTC ISO slicing. getMonthDateRange uses date-fns boundaries, including leap years. calculateDurationMinutes is the shared rounded elapsed-time utility and rejects nonpositive/nonfinite results. Timestamp.fromDate and toDate are confined to mapping/service code. Midnight crossing is not supported; both input times belong to the selected local day. A timezone change can alter displayed time while dateKey retains its originally chosen calendar date; persisted timezone preferences are later scope.

## 14. Rules changes

Existing owner profile rules remain. A nested activity match allows get/list/create/update/delete only for the matching authenticated path UID. Writes require the exact ten fields, supported enums, bounded string lengths, dateKey format, ordered Timestamp values, positive bounded integer duration and server updatedAt. Creates require server createdAt; updates preserve it and limit changed keys to mutable fields. All other paths/settings remain denied. No public allow rule was added. Rules do not implement overlap checks or local-timezone date matching. Compilation and owner/guest/non-owner/invalid-write enforcement pass in the local emulator. The reviewed rules are now deployed and match the released source exactly; live guest requests and remote request-context evaluation are recorded below.

## 15. Indexes

firestore.indexes.json declares activities, COLLECTION scope, dateKey ASCENDING + startAt ASCENDING for the daily equality/filter-order query. This follows [Firebase's equality/order indexing example](https://firebase.google.com/docs/firestore/query-data/index-overview). The monthly query ranges/orders on dateKey alone and uses its default single-field ascending index. firebase.json references both rules and indexes. README documents Console creation, CLI deployment and waiting for index readiness.

The development database initially had no composite indexes, causing the live failed-precondition. Deployed the declared index to dev-track-46323 on October 13. It progressed from CREATING to READY; a real daily equality/order query then succeeded. The user confirmed Try again/refresh restored the dashboard list. The remote index is COLLECTION scope with dateKey ASCENDING, startAt ASCENDING and Firestore's appended **name** ASCENDING. Monthly dateKey range/order reads also succeeded.

## 16. Files created

```text
firestore.indexes.json
docs/PHASE_3_REPORT.md
src/features/activities/hooks/useActivities.ts
src/features/activities/hooks/useActivitiesByDate.ts
src/features/activities/hooks/useActivitiesByRange.ts
src/features/activities/hooks/useActivityMutations.ts
src/features/activities/services/activity.service.ts
src/features/activities/types/activityDocument.ts
src/features/activities/utils/activity.mapper.ts
src/features/activities/utils/activityError.ts
src/features/activities/utils/activitySummary.ts
src/features/activities/validation/activity.schema.ts
tests/activity.test.mjs
tests/rules/firestore.test.mjs
tests/e2e/activities.spec.ts
tests/support/activities.fixture.ts
tests/support/activity.service.ts
tests/support/test.ts
```

## 17. Files modified

README.md, docs/PROGRESS.md, docs/PHASE_2_REPORT.md, firebase.json, firestore.rules, playwright.config.ts, tsconfig.json, vite.config.ts, src/components/layout/TopHeader.tsx; shared ConfirmationDialog/Dialog/EmptyState/Input; DashboardPage, ActivityCard/ActivityDialog/ActivityForm/ActivityTimeline/DaySummary/domain types; CalendarPage/MonthCalendar/useSelectedDay; shared date/duration utilities; existing auth/foundation/preview browser specs. No package/lockfile dependency change, actual .env change, remote push or hosting deployment was performed.

## 18. Mock cleanup

Removed src/mocks/activities.mock.ts and calendar.mock.ts. Legacy activity scenarios now live only in tests/support/activities.fixture.ts, mapped by the synthetic test service to the Date domain. Normal development/production always select the real Firestore service. Vite's e2e-only alias selects test services, and building in e2e mode is forbidden. Settings fixture and settings preview state remain because persistent settings are out of scope. The production header/empty state no longer promises fixture behavior or a configured 09:00 workday.

## 19. Manual CRUD results and blockers

No completion blocker remains. Live UI actions below were performed and confirmed by the user. Backend configuration, stored fields, queries and deletion were independently corroborated using the authenticated Firebase CLI/API. Privileged OAuth reads corroborate data but do not prove client authorization; separate guest requests, Rules API evaluations and emulator tests cover enforcement.

Project setup: confirmed dev-track-46323 is the effective Vite project, Google is enabled, and localhost/127.0.0.1 are authorized. Confirmed the default Standard/Native Firestore database exists in nam5. Saved the previous rules/index state to ignored artifacts, deployed the reviewed repository rules and index, downloaded the released rules and verified an exact normalized-text match. The initial remote rules were Firebase's temporary public test rules; they are now replaced with owner-only access. The index is READY and the live query error is resolved.

Create/read: the user created “Test” on October 13, Development, In progress, 09:00–10:30. Firestore contained one generated document with 90-minute duration, start/end Timestamp values corresponding to Asia/Calcutta local input, and equal server createdAt/updatedAt. The user initially saw an index error while its build was pending; after readiness, Try again/refresh displayed the saved entry without saving a duplicate.

Edit/date move: the user renamed the task (including a trailing quotation mark), moved it to October 14 and changed its times to 10:00–11:00. Backend reads confirmed the same document ID, unchanged createdAt, advanced updatedAt, new dateKey/timestamps and a derived duration of 60 minutes. The user confirmed removal from the original day, appearance on the destination day and persistence after refresh. The completed-status write was performed on the separate October 12 “TEST” entry; its backend status changed to completed with a new updatedAt. The October 14 entry retained in_progress. These are the actual observed results, not an assumed status change on the moved entry.

Delete: the user deleted only the October 14 verification entry through confirmation and confirmed that its row and calendar marker stayed gone after refresh. An exact document GET returned HTTP 404. The October 14 daily query returned zero documents and the October monthly query contained only the remaining October 12 entry.

Security: six direct unauthenticated live requests were denied with HTTP 403 PERMISSION_DENIED / “Missing or insufficient permissions”: activity get/list/create/update/delete and profile get. The guest create probe used server audit transforms and valid fields. No guest write succeeded. In addition, 18 remote Firebase Rules API evaluations against the exact released ruleset passed: owner activity get/list/delete allowed; guest and another simulated UID activity get/list/create/update/delete denied; owner profile get allowed; guest/other UID profile get, owner profile delete and settings get denied. These are simulated request contexts evaluated remotely, equivalent in purpose to Rules Playground; no second Google account was signed in, and evaluated deletes do not execute data deletion. Invalid/immutable-field writes are covered by the 23 emulator checks against the same published rules source. See [the Rules API testing reference](https://firebase.google.com/docs/reference/rules/rest/v1/projects/test).

Authentication regression: the user confirmed logout redirects /app to Login, Google re-login succeeds, Calendar refresh restores the session and no new red app/Firebase Console errors appeared. Backend profile reads confirmed one matching account profile, unchanged createdAt and a later equal lastLoginAt/updatedAt after re-login. Phase 2 completion is recorded in c78927b.

Automation limitation: native Computer Use stopped because it could not determine the Windows browser URL with enough confidence to enforce policy. No further UI actions followed that stop. The [computer-use skill](<C:/Users/Shajith Ali S/.codex/plugins/cache/openai-bundled/computer-use/26.1007.21434/skills/computer-use/SKILL.md>) references [guidance](<C:/Users/Shajith Ali S/.codex/plugins/cache/openai-bundled/computer-use/26.1007.21434/docs/guidance.md>) stating “Do not automate user authentication dialogs.” The user completed authentication and live UI steps; CLI/API work continued independently. No credentials, private keys or environment values were committed. Backups, runtime downloads and verification logs remain ignored artifacts.

## 20. Multi-date results

Actual backend daily queries isolate October 13/14. Backend document reads found October 12 and 13 before the move. The monthly range query returned October 12 and 14 after the move, then only October 12 after deletion. The user confirmed Calendar markers, selected-day contents, navigation to another month and back, and refresh. Synthetic tests additionally cover the October 12 → 13 move and listener cleanup. The live test used October 13 → 14 to keep the existing October 12 entry separate.

## 21. Responsive regression results

Chrome layout/navigation/modal checks passed at 390×844, 430×932, 768×1024, 1024×768, 1440×900 and 1920×1080. Mobile modal focus/scrolling, all five stat cards and full-width Add placement remain covered. Loading/empty/error and long-task screens have test screenshots. Physical devices and other browsers are unverified. Final browser-suite result is recorded below.

## 22. Lint

PASS: npm.cmd run lint with zero warnings. A Playwright callback named use initially triggered the React hook rule; renaming it to runTest resolved it. No ignore rule was added.

## 23. Build

PASS: strict TypeScript plus Vite production build. No build/CSS/chunk warnings. Firestore remains separate from startup UI, and production uses real services. No dependency was added.

## 24. Tests

Native tests: 14 passed (seven existing configuration/auth/profile tests and seven activity date/duration/validation/mapper/summary/error tests). Final complete browser suite: **34 passed in 2.6 minutes**, with workspace edits paused. An earlier test-adapter error-state simulation was corrected to use an explicit read-error setting. A later settings-toggle test captured state resetting while documentation was edited alongside Vite; pausing edits for the final run resolved that interference without changing settings behavior. Synthetic browser tests cover CRUD flows, field retention/retry, duplicate saving, basic validation/offline feedback, date moves, refresh, month queries, listener cleanup, auth regressions, settings previews and six viewports. They do not contact Firebase and cannot prove remote CRUD or rules. Formatting and git diff whitespace checks pass; production assets contain no synthetic adapter/user identifiers.

October 13 rules suite: **23 checks passed in 13.5 seconds** against Firestore emulator 1.22.0, CLI 15.33.0 and a checksum-verified portable Temurin Java 21 runtime. The runtime/CLI downloads stay in ignored artifacts; system Java is unchanged. The emulator compiled the repository rules. Tests use the actual Firebase web client with emulator-only mock authentication, not Admin access or the synthetic UI service. Valid owner create/read/update/date move/delete, daily/monthly query filtering, server audit timestamps and immutable createdAt passed. Guest and other-user get/list/create/update/delete were denied. Invalid fields, unsupported enums, missing/extra fields, invalid timestamp ordering, invalid durations and forged audit values were denied. Owner profile updates preserve createdAt; guest/cross-user access, user listing/deletion, settings and unrelated paths were denied. Expected denial warnings appear in ignored emulator logs. The demo project and loopback-only host prevent accidental live test writes. The emulator does not establish remote composite index readiness. Lint, production build, formatting and whitespace checks and the 14 existing native tests passed again after these additions. The build emitted a plugin-timing profiling notice, with no build failure. The existing 34-scenario browser result above is from the implementation checkpoint; it was not rerun for these rules/test/documentation-only changes.

## 25. Known limitations

No Phase 3 completion blocker remains. Live UI success is user-confirmed because native browser automation stopped on URL detection; backend state was independently checked. Guest denial is verified through actual unauthenticated requests; other-user access was evaluated with simulated contexts against the released ruleset and real client emulator identities, not a second live Google account. Invalid raw owner writes were exercised in the emulator rather than against the development database. Long-task and multiline-note edge cases have automated coverage; the live save used a short task and empty notes, and the edit preserved a quotation mark safely. No service-account private keys were used; CLI OAuth reads are privileged and are not counted as proof of rules enforcement.

Firestore listeners may reflect SDK local pending writes; a success toast waits for the server-acknowledged write promise. Known-offline saves are rejected, but a network drop after submission may keep the dialog pending until reconnection. There is no advanced offline queue UI. Single-day activities and browser-local display are supported. Rules check dateKey format but do not enforce timezone-aware consistency or exact duration arithmetic; service/form validation performs those checks. No overlap restrictions, pagination, optimistic rollback framework or persisted goals/settings were introduced. Physical devices and other browsers remain unverified. No hosting deployment or remote Git push was performed.

## 26. Deferred Phase 4+

Previous-end start defaults, overlap prevention, day-start preferences, advanced time validation/gap detection, persisted settings/types/time format, Week/Day calendar layouts, reporting/export, timers/drag-and-drop, integrations, AI, teams/approvals, notifications and hosting deployment remain deferred. Basic activity duration, month reads and daily/status summaries are implemented now as requested.

## 27. Checklist

- [x] Auth/Firebase/UI/mock architecture audited and reused.
- [x] Strong domain/input/DTO types; Timestamp conversion isolated.
- [x] User-scoped real create/read/update/delete service implemented.
- [x] Day/month realtime hooks with UID/date/unmount cleanup and retry.
- [x] Functional form/confirmation loading, validation, failure retention and duplicate guard.
- [x] Editable dates and immutable creation metadata supported.
- [x] Production Dashboard/Calendar fixtures removed; real summaries/markers wired.
- [x] Owner-only activity rules and daily composite index definition created.
- [x] Local date/time/duration/summary helpers tested; lint/build pass.
- [x] README deployment/live tests and completed/pending report prepared.
- [x] Final complete browser suite: 34 passed.
- [x] Rules compile and 23 emulator checks pass; reproducible test command documented.
- [x] Remote rules/index deployed, index READY and observed query error resolved.
- [x] Real Firestore CRUD/refresh/date-range/multi-date/audit behavior verified.
- [x] Live guest denial and released-rules cross-user evaluation pass; invalid writes pass emulator denial checks.
- [x] Phase 2 live lifecycle checks completed and committed separately.

PHASE 3 STATUS: COMPLETE
