# Phase 4 smart timeline report

October 13, 2026. Smart defaults, overlap prevention, gap repair and time validation are implemented. User-confirmed live behavior and automated checks are distinguished below. No dependency, activity schema, rules or index change was required.

## 1. Existing time-logic audit

ActivityDialog used fixed 09:00–10:00 create values. ActivityForm reset whenever its initial-values object changed, risking draft loss on realtime updates. Zod duplicated ordering/day checks, while duration.ts separately rounded and rejected nonpositive durations. Document mapping repeated the ordering check. Sorting/latest-end helpers lived in activitySummary.ts. Dashboard already loaded selected-day data; Calendar already had it in the month result. Settings used screen-local, unapplied previews. Update mapping already recalculated duration and preserved createdAt.

## 2. Smart-start architecture implemented

Pure, typed activityTime.ts owns time validation/parsing, duration, sorting, latest end, suggestions, overlap, gaps and create defaults. It imports no React or Firebase code. Existing local date construction/formatting remain centralized in date.ts. ActivityDialog captures builder output once on opening; ActivityForm owns the editable draft. Dashboard, Calendar, empty-state and gap actions reuse that dialog and builder. Reopening recomputes from the latest loaded data.

## 3. Default day-start source

getWorkdayPreferences() returns DEFAULT_WORKDAY_SETTINGS.dayStartTime, temporarily 09:00. The Settings preview uses the same default constant but its edits remain unapplied. No second settings store was added. Phase 5 can replace the provider without changing time algorithms. Settings wording now explicitly says preview changes do not apply to activity defaults.

## 4. Suggested start algorithm

Filter by selected dateKey, find maximum end timestamp, and format the next available local minute. Empty days use configured start. Unsorted entries, gaps, ties, historical/future dates and deletion are supported. A legacy timestamp containing seconds rounds forward so the default does not overlap occupied seconds. If no same-day minute remains, start stays blank. The current clock never overrides the selected date.

## 5. End-time default behavior

Generic create suggests +30 minutes. Start edits shift this suggestion until end is manually edited. Edit and gap-fill forms preserve their supplied end from the beginning. An end crossing midnight stays blank. Start remains editable. Optional quick-duration buttons were omitted.

## 6. Live duration implementation

useWatch feeds the shared parse/validate functions. The polite duration status shows 30m, 1h or 1h 30m immediately; incomplete/invalid/equal/reversed ranges show “Invalid time range”. No backend request is needed for previews.

## 7. Time-range validation

Canonical validation rejects invalid Dates, a different selected local day, durations below one minute and elapsed durations of 24 hours or more. Write validation requires zero seconds/milliseconds. Form date/time parsing rejects impossible dates and nonexistent local DST times. Zod calls the domain validator rather than reproducing time-order conditions. Equal and inverted ranges receive a linked end-field error. No implicit next-day end is inferred.

## 8. Overlap algorithm

newStart < existingEnd AND newEnd > existingStart, restricted to the destination date. Adjacent boundaries are valid. The result identifies a deterministic conflicting activity. Type/status do not change occupancy, including Break and On hold.

## 9. Create conflict handling

The form previews conflicts from available selected-day data, names the activity and time, links the alert to both time fields and disables Save. The production service independently parses input, queries fresh destination-day data from the server, calls assertActivityCanSave, then calculates/maps the payload and writes. Read failure prevents mutation. ActivityTimeError supplies safe, useful inline feedback near the time controls. Failed saves retain entered values.

## 10. Edit conflict handling

Editing uses persisted values and excludes only that activity ID. Earlier/later neighbor collisions are blocked. Changing date performs the same fresh destination-day query before update. The UI explains that changed-date conflicts are checked on Save. Editing unchanged time remains valid. createdAt is never rewritten.

## 11. Gap detection algorithm

Copy/sort selected-day entries; initialize an optional cursor at configured start; emit positive whole-minute intervals before each entry; advance cursor to max(cursor, end). This handles nested legacy overlaps without false gaps. Gap starts round occupied end seconds forward; gap ends round next-start seconds backward. The boundaries therefore fit safely in minute-precision fields. No stored activity time is modified. Empty days and final activities create no trailing gap. The centralized display threshold is one minute.

## 12. Gap timeline UI

Dashboard and compact Calendar timelines display dashed, muted cyan rows with a clock, duration, time range and accessible Log activity button. Gap rows are distinct from activities and validation errors. Counts and logged/work/break totals still use only real activity documents. Summary work start/end remain actual earliest/latest values.

## 13. Gap-fill workflow

The gap action opens the shared create dialog with the selected date and exact gap range. Saving uses ordinary validated CRUD. Realtime data removes or shrinks the gap. Generic Add still appends to latest end rather than selecting a gap. Deleting a middle activity reveals a gap; deleting the latest changes the next suggestion.

## 14. Date/time and timezone handling

Local numeric Date construction is retained; no forced Z suffix or UTC ISO date slicing is used. Native minute inputs normalize new timestamps. Kolkata, Los Angeles and Berlin round trips include 00:05/23:55; nonexistent spring DST times reject. Repeated DST hours use JavaScript's earlier offset, and elapsed duration can differ from wall-clock labels across transitions. Browser timezone changes can alter displayed timestamps while the original dateKey remains stored. Persistent timezone preferences and cross-midnight entries are deferred.

## 15. Files created

- src/features/activities/domain/activityTime.ts
- src/features/settings/workdayPreferences.ts
- tests/activity-time.test.mjs
- tests/e2e/activity-time.spec.ts
- tests/rules/activity-service.test.mjs
- docs/PHASE_4_REPORT.md

## 16. Files modified

ActivityDialog, ActivityForm, ActivityTimeline, DashboardPage and CalendarPage; activity service/schema/mapper/error/summary; shared date factory import and duration export; EmptyState/Input; workspace.css; SettingsPage/settings.mock; existing activity unit/browser/preview tests and synthetic service; README.md and docs/PROGRESS.md. No package/lockfile or environment configuration changed. Ignored local probe scripts/logs/screenshots are verification artifacts, not application or committed credentials.

## 17. Existing duplicate logic removed

Removed fixed dialog time defaults, realtime-driven form resets, duplicated ordering/day conditions in schemas and mapper, and independent duration/sort/latest-end implementations. Existing duration.ts and activitySummary.ts exports delegate to the canonical domain for compatibility. Local date combination and date-key formatting continue to have one implementation.

## 18. Unit tests added

Nine focused domain tests cover the complete suggestion/overlap/gap matrices, one-minute validity, invalid/sub-minute/cross-day ranges, minute write precision, edit self-exclusion and neighbors, destination dates, immutable sorting, ties, deletion, gap defaults, midnight overflow, legacy seconds and local/DST handling in three timezones. Existing mapper/schema/auth/profile/config tests remain.

## 19. Test command/results

- npm.cmd test: 23 passed.
- Firebase emulators:exec --only firestore --project demo-devtrack "npm.cmd run test:rules": 24 passed, including the production service integration scenario.
- DEVTRACK_E2E_PORT=5175 npm.cmd run test:e2e -- --workers=3: full 39-scenario suite passed in 2.7 minutes.
- Focused activity-time.spec.ts: final six scenarios passed in 40.7 seconds after legacy-seconds hardening, including the subsequently added exact reported save sequence and no-navigation assertion.
- Final lint, production build, formatting and git diff --check passed.

An initial retry test used a 700 ms assumption that expired before Escape under load. Its isolated adapter now holds mutations until the test explicitly releases them. An initial Node emulator integration saw navigator.onLine as undefined; the production guard now rejects only explicit false. Both checks passed after correction. The first sandboxed browser run stalled during child-process cleanup; the final successful run had Windows cleanup permissions.

## 20. Manual smart-start test results

The user confirmed valid entries save and, after deleting the latest entry, the next Add suggestion recalculates correctly. The complete specified 09:00 → 10:30 → 11:00 flow, previous/future selected-day defaults, Calendar launch and realtime draft stability pass automated browser/domain checks. Empty-day actual start is 09:00 and initial end 09:30. The user-confirmed final deletion default in the alternate live sequence is 10:45.

## 21. Manual overlap test results

The user clarified a 09:00–10:00 first entry and 10:45–11:30 second entry: this is valid and intentionally has no conflict. A true 09:45–10:15 conflict subsequently displayed correctly. The user also confirmed edit overlap rejection. Automated tests cover both boundaries, containment, exact matches, breaks/status, edit neighbors/self and destination-date conflicts.

The reported unwanted refresh could not be reproduced as Save navigation: the exact sequence passed with zero document requests. Development logs showed source updates during implementation. The live server was switched to the production build on the same origin, eliminating development update interruptions; the user confirmed both saves, visible conflict and no unwanted refresh. No unsupported claim of a reproduced application-navigation defect is made.

## 22. Manual gap test results

The user confirmed the 10:00–10:45 gap prefills, saves and disappears; subsequent edit conflict and latest-deletion behavior passed. The original ten-step automated flow also verifies the 11:00–12:00 gap, exact form values, successful repair and exclusion from totals. Initial gaps and middle deletion are covered by pure tests.

## 23. Responsive regression result

The full browser suite checks screens/dialogs at 390, 430, 768, 1024, 1440 and 1920px. Added gap/conflict checks run at 390 and 1440px. Mobile time fields stack, alerts wrap, and the modal scrolls within the viewport. Inspected mobile gap/conflict and desktop conflict screenshots. Keyboard focus, dialog trapping, route guards and browser error checks remain passing. Physical devices and other browsers are not verified.

## 24. Firestore regression result

The emulator invokes the production service and real client SDK: valid creates, adjacent blocks, blocked creates/edits, unchanged edit, blocked destination-date move, successful boundary-touching move, recalculated 61-minute duration, immutable createdAt, server updatedAt, daily/month reads, subscriptions and deletion pass. Forbidden reads fail closed before writing. The existing 23 rules checks also pass.

The user confirmed live saves/conflicts/gap repair/edit rejection/deletion/defaults and Calendar refresh. A privileged read earlier observed October 15 “Phase 4 First” (09:00–10:30, 90 minutes) and “GAP” (10:30–11:00, 30 minutes), plus the existing October 12 entry. Later probes of the suggested October 16 and October 13 dates returned no entries for the CLI account. Accordingly, final live UI results are attributed to the user's confirmation; those later probes do not independently establish the exact date/account used. No live data was changed through these probes, and no test entries were deleted by the agent.

## 25. Lint result

npm.cmd run lint passes with zero warnings. Final validation includes all delivered source/test changes.

## 26. Build result

npm.cmd run build passes TypeScript and the production Vite build. Test adapters remain excluded from production assets. The local review server uses npm run preview on 127.0.0.1:5173, serving this production build; npm run dev remains available for future development.

## 27. Known limitations

Two tabs can read before either writes and create a race; no distributed locking or server/rule-level interval enforcement is added. A modified client can bypass overlap rules; owner/schema security rules remain enforced. Each save adds one fresh daily read and requires network access. Legacy overlapping records are not repaired automatically and still count their individually logged durations. Cross-midnight entries, persistent timezone choices and repeated-hour disambiguation are unsupported. Live UI evidence is user-confirmed with the account/date corroboration limit above. Existing test entries remain for the user to keep or remove.

## 28. Deferred features

Phase 5: Firestore-backed work hours, display format and enabled/custom types. Optional quick end-duration actions and dirty-close confirmation were not added. Later: functional Week/Day layouts, timers, reporting/export, Jira/Calendar integrations, notifications, AI, teams, approvals, billing, hosting and remote Git push. None is required for Phase 4 completion.

## 29. Phase 4 completion checklist

- [x] Central temporary day-start preference and one pure time domain.
- [x] Selected-date/latest-end defaults on Dashboard, Calendar and empty days.
- [x] Editable start, safe end suggestion and live duration.
- [x] Canonical valid same-day minute ranges.
- [x] Create/edit overlap protection, boundaries, self-exclusion and date moves.
- [x] Derived initial/middle gaps, exact gap fill and no fake trailing gap.
- [x] Correct deletion/reopening defaults and stable realtime drafts.
- [x] Unit, browser and production-service/rules emulator regression checks.
- [x] User-confirmed live saves, conflicts, gap fill, deletion and refresh.
- [x] Responsive/accessibility regression, lint/build/format checks and phase documentation.
- [x] Phase implementation saved in Git; commit ID is included in the handoff.

No mandatory Phase 4 implementation remains. The limitations and later-phase features above remain explicit.

PHASE 4 STATUS: COMPLETE
