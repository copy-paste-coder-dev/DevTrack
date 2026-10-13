# Phase 3 activity persistence report

Updated: October 13, 2026. The real Firestore implementation and local rules verification are ready. Live CRUD, index availability and deployed rules enforcement are still unverified; this phase is incomplete. Implementation checkpoint: `7960598`.

## 1. Phase 1/2 architecture audit

Reused the existing AuthProvider/useAuth, app-level UID, validated Firestore singleton factory, protected routes, Sonner feedback, React Hook Form/Zod form, native dialogs, cards, timeline, selected-date URL and responsive styles. Dashboard and Calendar depended on activities.mock.ts/calendar.mock.ts; selected dates defaulted to the demo day. Dialog submissions only showed preview toasts. Summary/goal fields were fixtures. Profile-only Firestore rules denied activity paths. Phase 2 implementation was saved separately as checkpoint `34bef16`; its full live profile/persistence/logout checks remain incomplete.

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

Existing owner profile rules remain. A nested activity match allows get/list/create/update/delete only for the matching authenticated path UID. Writes require the exact ten fields, supported enums, bounded string lengths, dateKey format, ordered Timestamp values, positive bounded integer duration and server updatedAt. Creates require server createdAt; updates preserve it and limit changed keys to mutable fields. All other paths/settings remain denied. No public allow rule was added. Rules do not implement overlap checks or local-timezone date matching. Compilation and owner/guest/non-owner enforcement pass in the local emulator; deployment and remote enforcement remain unverified.

## 15. Indexes

firestore.indexes.json declares activities, COLLECTION scope, dateKey ASCENDING + startAt ASCENDING for the daily equality/filter-order query. This follows [Firebase's equality/order indexing example](https://firebase.google.com/docs/firestore/query-data/index-overview). The monthly query ranges/orders on dateKey alone and uses its default single-field ascending index. firebase.json references both rules and indexes. README documents Console creation, CLI deployment and waiting for index readiness.

The real browser dashboard showed the friendly failed-precondition/index-or-configuration message. No backend index link/details or remote index state was captured, so the exact remote cause/readiness has not been independently confirmed. Do not treat the checked-in definition as an already deployed/verified index.

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

Live Chrome at http://127.0.0.1:5173/app showed an authenticated real account in the app shell. This establishes an existing live session/identity, not a newly observed OAuth popup or complete Phase 2 lifecycle verification. The dashboard showed Firestore requires an index or configuration update. No create/read/update/delete success in the remote database was observed.

The browser connector inventory was empty. Native Computer Use could read Chrome, but opening a Console tab failed first with coordinate input geometry is unavailable; after refreshing a screenshot-backed window, the retry timed out with click_element. Native input stopped after the failed recovery. The [computer-use skill](<C:/Users/Shajith Ali S/.codex/plugins/cache/openai-bundled/computer-use/26.1007.21434/skills/computer-use/SKILL.md>) instructs: "report the exact error if recovery fails." Its [guidance](<C:/Users/Shajith Ali S/.codex/plugins/cache/openai-bundled/computer-use/26.1007.21434/docs/guidance.md>) also states: "Do not automate user authentication dialogs." The Firebase plugin is available but not installed/connected; no authenticated project-management connector is callable. User has authorized continuing but has not supplied a live verification result. No console rule/index change is claimed.

Every remaining blocker:

1. Confirm Firestore exists and the app config refers to the intended development database.
2. Deploy/publish the reviewed activity rules and provision/enable the daily composite index; resolve the observed live failed-precondition.
3. Verify actual backend create, selected-day read, refresh persistence, update/time/status/date move, immutable createdAt, server updatedAt and deletion.
4. Verify actual monthly range results and calendar markers across dates/months after mutations.
5. Validate deployed rules deny guests/cross-user get/list/writes and reject invalid/immutable-field writes; source ownership rules alone are not proof.
6. Inspect live operation for SDK/runtime warnings/errors and complete remaining Phase 2 profile/relogin/refresh/logout checks.

October 13 follow-up: installed official Firebase CLI 15.33.0 under ignored artifacts, leaving application dependencies and the lockfile unchanged. All six web settings are present and identify development project dev-track-46323. The CLI has a saved account, but its refresh credentials are expired: the database-list request returned HTTP 401 UNAUTHENTICATED. Started an interactive localhost-callback reauthentication and asked the user to complete Google authorization. No successful callback has arrived. CLI authentication is separate from the app's observed Google session. No remote rules/index deployment or database change was performed.

Computer Use also stopped this turn because it could not determine the Windows browser URL with enough confidence to enforce policy. No further UI actions were issued. The authentication prohibition quoted above requires user account selection/approval; repeating authorization to proceed does not supply a successful Google login.

Setup, deployment and the exact manual sequence are in README. A successful CLI reauthentication or connected project capability is needed for remote deployment, followed by live client verification. Repository work is checkpointed separately; an incomplete checkpoint is not a completed-phase claim.

## 20. Multi-date results

Synthetic UI coverage verifies October 12 → October 13 date moves, disappearance from the old day, preservation of the ID/createdAt in the adapter, duration/status updates, marker addition/removal and refresh after deletion. Existing October 12/13/9 fixtures cover distinct day filtering. Live backend multi-date/month behavior is still pending.

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

External blockers above remain mandatory. Rules compile and pass local emulator checks but are not verified remotely; no Admin credentials were used. Firestore listeners may reflect SDK local pending writes; a success toast waits for the server-acknowledged write promise. Known-offline saves are rejected, but a network drop after submission may keep the dialog pending until reconnection. There is no advanced offline queue UI. Single-day activities and browser-local display are supported. No overlap restrictions, pagination, optimistic rollback framework or persisted goals/settings were introduced.

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
- [ ] Remote rules/index deployed and observed query error resolved.
- [ ] Real Firestore CRUD/refresh/date-range/multi-date/audit behavior verified.
- [ ] Guest/cross-user/invalid-write security enforcement verified remotely.
- [ ] Remaining Phase 2 live lifecycle checks completed.

PHASE 3 STATUS: INCOMPLETE
