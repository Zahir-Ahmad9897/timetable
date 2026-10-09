# Timetable Mobile Functional Requirements

These requirements were derived from executable code in `ManualTimetableWorkspace.jsx`, `TimetableGenerator.jsx`, `timetable-workspace-policy.js`, and the Python preflight/solver/validator modules. Documentation and comments were treated as leads and checked against implementation and tests.

## State model

States: `empty -> editing -> ready -> generating -> generated -> editing-result -> generated`, with import/load transitions back to `editing` or `generated`.

Forbidden states:

- a generated result missing a required weekly session;
- a session outside its semester's active weekdays or the teaching window;
- overlapping section, teacher, or room sessions;
- a room with the wrong type, insufficient capacity, or no borrowing permission;
- a persisted workspace whose references point to deleted records.

## Requirements

### FR-TTM-001 — Isolated local workspace

- Goal: create and resume a timetable without affecting the existing platform.
- Preconditions: app storage is available.
- Behavior: save a schema-versioned JSON document atomically in app-private storage; load it on startup.
- Failure: retain the in-memory workspace and show a recoverable error.
- Authorization: single-device local user; no remote authorization boundary exists.
- Acceptance: restart restores the last saved workspace; no file outside `timetable-mobile/` is a build dependency.
- Evidence: storage implementation, typecheck, manual Expo restart check.

### FR-TTM-002 — JSON portability

- Goal: back up or move a workspace without a paid database.
- Preconditions: valid workspace schema.
- Behavior: export JSON through the native share sheet; import a selected JSON file after complete validation.
- Failure: invalid imports do not replace current data.
- Authorization: explicit OS picker/share action.
- Acceptance: exported data round-trips without changing IDs or relations.
- Evidence: domain validation tests; device import/export check.

### FR-TTM-003 — Scheduling resources

- Goal: manage departments, semesters, sections, courses, teachers, teacher-course assignments, rooms/labs, and day settings.
- Preconditions: parent records exist before dependent records.
- Behavior: enforce the same field domains and primary/secondary assignment rules as the current manual workspace.
- Failure: show record-specific validation and block generation.
- Authorization: local user.
- Acceptance: all seven collections can be added, edited, and deleted; deleting a parent removes dangling dependent assignments.
- Evidence: validation tests and UI workflow check.

### FR-TTM-004 — Readiness and capacity

- Goal: explain whether generation can start.
- Preconditions: workspace loaded.
- Behavior: validate records and compare lecture/lab weekly demand against compatible home plus borrowable room capacity.
- Failure: identify resource category and corrective action.
- Acceptance: generation remains disabled until schema/readiness and capacity checks pass.
- Evidence: capacity and validation tests.

### FR-TTM-005 — Complete timetable generation

- Goal: generate every required session for every assigned course/section.
- Preconditions: FR-TTM-003/004 pass.
- Behavior: run multiple seeded attempts; prefer home rooms, compact section days, and higher-priority teacher windows.
- Failure: return no partial result and provide diagnostics.
- Acceptance: required session count equals generated count and independent validation has zero hard violations.
- Evidence: generator and validator tests.

### FR-TTM-006 — Hard scheduling constraints

- Goal: prevent invalid schedules.
- Behavior: enforce active weekdays, day/break boundaries, different-day repeated course sessions, no teacher/section/room overlaps, teacher daily cap, room type/capacity, and room borrowing authorization.
- Failure: generation or edits are rejected with violations.
- Acceptance: mutation tests for each constraint fail validation.
- Evidence: validator tests.

### FR-TTM-007 — Review, edit, and remove result

- Goal: give the user explicit control over the draft.
- Preconditions: valid generated timetable.
- Behavior: group by department/semester/section; identify borrowed resources; allow day/start/room edits; validate before saving; allow preview deletion without deleting workspace data.
- Failure: invalid edits remain unsaved and list violations.
- Acceptance: valid edit persists; invalid collision does not.
- Evidence: validator tests and UI workflow check.

### FR-TTM-008 — Export result

- Goal: share the generated timetable.
- Preconditions: validated generated result.
- Behavior: export a UTF-8 `.csv` spreadsheet that opens in Excel, Numbers, and Google Sheets, then share it through the native OS UI.
- Failure: leave the result intact and show an actionable error.
- Acceptance: the spreadsheet contains department, semester, section, day, time, course, teacher, room, and borrowing fields.
- Evidence: export module and device share check.

### FR-TTM-009 — Organization and manual data modes

- Goal: schedule from the existing UET Mardan catalog or from independently entered data.
- Preconditions: bundled organization data is available in the installed app.
- Behavior: keep separate local workspaces for UET Mardan organization data and manual data; open UET Mardan by default until the user explicitly chooses another source; save pending changes before switching; restore the bundled Fall 2026 organization snapshot without altering manual data; allow one or more departments to be selected for generation.
- Failure: a failed source switch retains the current workspace and reports an error; no generation starts without a selected department.
- Authorization: local user; neither mode connects to or mutates the platform database.
- Acceptance: the bundled snapshot maps six departments and passes workspace validation; explicit section-teacher mappings and room-sharing grants are preserved; a selected UET Mardan department generates a complete validated result; legacy single-workspace data remains available in manual mode.
- Evidence: organization mapping and selected-generation tests, source-mode UI, and private per-mode storage implementation.

### FR-TTM-010 — Resource-page navigation

- Goal: move predictably between scheduling resources on a phone without navigating through collapsed dropdown panels.
- Preconditions: setup workspace is loaded.
- Behavior: show Departments, Semesters, Sections, Courses, Teachers, Assignments, Rooms/Labs, and Teaching Day as visible navigation cards; open each resource in its own page; provide a labeled Back control and support Android hardware back to the previous setup location.
- Failure: navigation must not discard unsaved edits or reset the active data source.
- Authorization: local user.
- Acceptance: every resource card opens only its resource editor; Back returns to the resource hub with edits intact; generation starts from the visible department selection without an additional hidden confirmation requirement.
- Evidence: setup navigation implementation, typecheck, Android bundle, and device workflow check.

### FR-TTM-011 — Novel arrangement generation

- Goal: produce a different valid arrangement on each generation request instead of cycling through already accepted drafts.
- Preconditions: the selected department scope is ready and at least one unseen valid arrangement exists within the bounded search.
- Behavior: calculate a canonical arrangement fingerprint independent of session IDs and row order; persist recent accepted fingerprints per workspace; reject the current and previously accepted arrangements; diversify equivalent candidate choices; save only a complete, validated, unseen result.
- Failure: preserve the current draft and explicitly report when no unseen arrangement is found within the search limit.
- Authorization: local user.
- Acceptance: two consecutive generation requests for a dataset with multiple solutions return different fingerprints; reordering sessions or replacing transient session IDs does not change a fingerprint; imported older workspaces remain compatible.
- Evidence: fingerprint and consecutive-generation domain tests.

### FR-TTM-012 — Resource-only organization startup

- Goal: begin testing with UET Mardan scheduling inputs and no pre-existing generated timetable.
- Preconditions: an older local organization workspace may contain a saved draft or variation history.
- Behavior: apply a revisioned one-time migration that clears generated sessions and fingerprints while preserving organization resources and user-reviewed input changes; bundled organization JSON contains no generated sessions.
- Failure: an unreadable saved organization workspace reports a recoverable storage error; restoring bundled data never imports a generated draft.
- Authorization: local user.
- Acceptance: the migrated organization workspace contains departments, semesters, sections, teachers, courses, assignments, rooms, and day settings, with `generation` set to null and empty generation history; generation remains available afterward.
- Evidence: migration tests, bundled-data tests, and storage implementation.

### FR-TTM-013 — Searchable, paginated resource registers

- Goal: let a coordinator find and maintain large organization datasets without loading hundreds of edit controls at once.
- Preconditions: a resource collection is open.
- Behavior: provide text search over human-readable fields, show a fixed-size page of summary rows, expose Previous/Next controls and current/total page status, and open one record in a focused editor.
- Failure: an empty search result explains how to recover; changing search returns to page 1; deleting the last item on a page moves to the nearest valid page.
- Authorization: local user.
- Acceptance: the 276-record assignment register is searchable; no more than 10 summaries and one editor are mounted at a time; pagination controls expose disabled state to accessibility services.
- Evidence: shared pagination hook, resource register implementation, typecheck, and device workflow check.

### FR-TTM-014 — Focused timetable review

- Goal: review a generated timetable in the same mental model as a mobile calendar.
- Preconditions: a validated generation result exists.
- Behavior: select a class group and weekday using visible controls; present only that agenda in chronological order; expose session count, time, course, teacher, room, and borrowing status; retain validated edit, export, save, and delete actions.
- Failure: a day with no sessions has an explicit empty state; filters always retain a valid selection after the result changes.
- Authorization: local user.
- Acceptance: switching group or day does not mutate the timetable; only the selected agenda is rendered; an edit is validated before it replaces the saved draft.
- Evidence: timetable screen implementation, validator tests, typecheck, and device workflow check.

### FR-TTM-015 — Operational status and recovery

- Goal: make source, persistence, readiness, and generation state continuously understandable.
- Preconditions: app is open.
- Behavior: use consistent text-and-icon status indicators for organization/manual source, saved/unsaved state, validation readiness, progress, success, warning, and error; always pair recovery guidance with blocking states.
- Failure: errors do not erase the last valid local state or generated draft.
- Acceptance: status is never communicated by color alone; destructive actions require confirmation; source and save state are visible from the workspace home.
- Evidence: shared semantic components, context behavior, and accessibility inspection.

### FR-TTM-016 — Private static web deployment

- Goal: use the timetable workflow from a mobile or desktop browser without operating a paid application server.
- Preconditions: JavaScript and origin-scoped browser storage are available; the static bundle is served from the configured `/timetable` base path.
- Behavior: load the same bundled organization data and scheduling workflow; persist organization/manual workspaces separately in `localStorage`; import JSON through the browser file picker; download JSON backups and CSV timetables locally.
- Failure: storage, parsing, or download failures retain the current in-memory workspace and surface an actionable error; an invalid import does not replace current data.
- Authorization: local browser user; the deployment has no remote data API or server-side authorization boundary.
- Acceptance: the production export completes; its HTML and JavaScript assets resolve below `/timetable`; the browser-specific storage implementation is present and the native filesystem implementation is absent from the web bundle; type and domain checks pass.
- Evidence: platform-specific storage/export modules, production export inspection, GitHub Pages workflow, and local HTTP smoke test.

## Product interaction specification

The single interaction reference is Google Calendar mobile: a restrained schedule hierarchy, visible day selection, chronological agenda rows, predictable navigation, and a clear primary action. Branding, assets, screen composition, and timetable-specific controls remain original to irid.ai.

The coordinator's primary flow is:

`choose data source -> review resource readiness -> search/edit records -> select generation scope -> generate -> review group/day agenda -> save/export`

The interface applies these HCI rules:

- visibility of system status: source, save state, validation status, generation progress, filters, and result totals remain explicit;
- match with the real world: departments, semesters, sections, weekdays, time ranges, rooms, and teachers use academic scheduling language;
- user control and freedom: every subordinate page has Back, edits are local until saved, generation preserves the previous result on failure, and deletion is confirmed;
- consistency and standards: semantic design tokens, shared cards, notices, chips, page headers, pagination, and action hierarchy are reused across screens;
- error prevention and recovery: readiness blocks invalid generation, edits run independent constraint validation, empty/error states state the next action, and disabled controls expose their state;
- recognition over recall: resource pages, selected scope, selected class group, active day, counts, and labels stay visible instead of relying on hidden dropdown navigation;
- flexibility and efficiency: search and pagination support large registers while visible chips make common switching fast;
- minimalist presentation: only the selected register editor or selected timetable agenda is rendered.

## Non-functional acceptance

- NFR-TTM-001: no remote database or analytics; data leaves the device only on explicit share.
- NFR-TTM-002: all press targets are at least 44×44 dp; labels and errors are exposed to screen readers; status is not color-only.
- NFR-TTM-003: generation is bounded by attempt and node limits and yields between attempts to keep the UI responsive.
- NFR-TTM-004: destructive deletion requires confirmation when dependent records will also be removed.
- NFR-TTM-005: 320 dp layouts preserve the complete workflow using vertical cards rather than wide tables.
- NFR-TTM-006: organization-source assumptions are visible to the user and are never presented as verified enrollment facts.
- NFR-TTM-007: resource registers render at most 10 summary rows plus one focused editor, preventing control count from scaling with the whole collection.
- NFR-TTM-008: interactive state uses text or icons in addition to color, and primary touch targets remain at least 44 dp.
- NFR-TTM-009: navigation, search, filtering, generation, edit validation, and export work without a network connection; no remote update is required for an installed bundle.
- NFR-TTM-010: shared tokens and reusable components define spacing, typography, status, navigation, search, chips, empty states, and pagination so feature screens do not invent conflicting patterns.
- NFR-TTM-011: the hosted web bundle contains no timetable records created by a user and sends no workspace data to a remote service; clearing browser site data may erase locally saved workspaces, so JSON backup remains available.
