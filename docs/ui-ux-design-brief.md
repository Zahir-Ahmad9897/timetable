# irid.ai Timetable â€” Complete UI/UX Design Brief

Version: 1.0
Platform: Mobile-first responsive app for iOS, Android, and web
Primary language: English
Primary institution data: UET Mardan, Fall 2026
Product type: Local-first academic timetable planning and validation tool

---

## 1. Purpose of this document

Use this document as the single source of truth when asking an AI design tool, product designer, or developer to redesign the app. The result should be a complete, production-ready UI/UX systemâ€”not only a few attractive screens.

The design must cover:

- First-run onboarding.
- Workspace setup and local data management.
- Searchable resource registers and record editors.
- Timetable generation and readiness checks.
- Timetable review, editing, saving, deletion, and PDF export.
- Global search.
- Appearance, privacy, and app settings.
- Loading, empty, success, warning, error, offline, and destructive states.
- Light and dark themes.
- Phone, tablet, and desktop web layouts.

---

## 2. Product summary

irid.ai Timetable helps an academic coordinator create a complete weekly timetable from departments, semesters, sections, courses, teachers, assignments, rooms, labs, and teaching-hour rules.

The app works locally and does not require an account, hosted database, analytics service, or network connection. It includes a bundled UET Mardan dataset and a separate manual workspace. The generator runs on the device, accepts only complete timetables, validates hard scheduling constraints, and preserves the previous valid draft if a new attempt fails.

This is an operational tool. It should feel calm, precise, trustworthy, and efficient. It should not look like a student social app, an AI chatbot, a generic admin template, or an overly decorative university portal.

### Core promise

â€œBuild a complete, conflict-free academic timetable locally, understand every blocking issue, and remain in control of the final draft.â€

### Product principles

1. **Explain before blocking.** A disabled action must be accompanied by the reason and a recovery path.
2. **Never lose valid work.** Failed imports, invalid edits, and failed generation attempts preserve the last valid state.
3. **Status is always visible.** Source, saved state, readiness, generation progress, and validation results use text and icons as well as color.
4. **One focused task at a time.** Large registers show summaries first and one record editor at a time.
5. **Mobile-first, not mobile-only.** The workflow must be excellent on a 360 px phone and scale intelligently to tablet and desktop.
6. **Privacy is a feature.** Local storage and export behavior should be understandable without technical language.
7. **Generated does not mean final.** A timetable remains a reviewable draft until the coordinator saves or exports it.

---

## 3. Users and jobs to be done

### Primary user: Academic timetable coordinator

Typical characteristics:

- Manages a large amount of structured academic data.
- Needs confidence that schedules are complete and conflict-free.
- May work on an Android phone, tablet, or desktop browser.
- Values speed, readable status, recovery, and exportable output more than visual novelty.

Primary jobs:

- Review or enter scheduling resources.
- Identify missing or invalid information.
- Select one or more departments for generation.
- Understand room/lab capacity before starting.
- Generate a complete timetable.
- Review one class group and weekday at a time.
- Correct a session without creating another conflict.
- Save, export, back up, restore, or remove a draft safely.

### Secondary user: Department administrator

Primary jobs:

- Verify teacher, room, course, and section data.
- Review the timetable for a particular class group.
- Export or share a PDF.

### User anxieties the design must address

- â€œWill my changes be saved?â€
- â€œWhich dataset am I editing?â€
- â€œWhy canâ€™t I generate yet?â€
- â€œDid generation include every required session?â€
- â€œWill changing this session create a collision?â€
- â€œWill importing or restoring data erase my work?â€
- â€œDoes the app upload institutional data?â€

---

## 4. Information architecture

### Primary navigation

Use a persistent bottom tab bar on phones with four destinations:

1. **Workspace** â€” icon: layers
2. **Generate** â€” icon: sparkles
3. **Timetable** â€” icon: calendar
4. **Settings** â€” icon: settings

The app header displays â€œirid.ai Timetableâ€ and a global search icon. On tablet and desktop, the bottom tabs may become a left navigation rail while preserving the same hierarchy and labels.

### Secondary routes

- Welcome/onboarding
- Global search modal
- Departments
- Semesters
- Sections
- Courses
- Teachers
- Assignments
- Rooms & labs
- Teaching day

Resource pages must have an explicit labeled Back control and also support native back gestures, Android hardware Back, and browser Back.

### Navigation model

```text
Onboarding
  -> Workspace
       -> Department register -> Record editor
       -> Semester register -> Record editor
       -> Section register -> Record editor
       -> Course register -> Record editor
       -> Teacher register -> Record editor
       -> Assignment register -> Record editor
       -> Room & lab register -> Record editor
       -> Teaching day editor
  -> Generate
       -> Timetable
  -> Timetable
       -> Session editor
  -> Settings
  -> Global search -> Any resource record
```

Do not hide core destinations in a hamburger menu or collapsed accordions.

---

## 5. Main user journeys

### Journey A â€” First-time UET Mardan generation

1. Complete or skip four onboarding slides.
2. Land on Workspace with UET Mardan selected.
3. See the Fall 2026 enrollment assumption warning.
4. Review readiness metrics and resource issue counts.
5. Open any register with issues, find a record, and correct it.
6. Save the workspace.
7. Open Generate.
8. Select at least one department.
9. Pass workspace and capacity checks.
10. Generate a complete draft.
11. Open Timetable, choose a class group and weekday, and review sessions.
12. Save and export the color PDF.

### Journey B â€” Build a manual workspace

1. Switch Workspace source from UET Mardan to Manual.
2. Enter an institution name.
3. Add records in dependency order: departments, semesters, sections, courses, teachers, rooms, assignments, and teaching day.
4. Save locally.
5. Generate and review a timetable.

The UI may offer contextual next-step suggestions, but must not force a rigid wizard because users need to revisit any register freely.

### Journey C â€” Correct a generated session

1. Open Timetable.
2. Select class group and weekday.
3. Choose Edit session.
4. Change day, start time, or compatible room.
5. Select Validate and apply.
6. If invalid, keep the editor open and explain the first conflict plus recovery.
7. If valid, update the draft and show that it still needs saving.

### Journey D â€” Recover or transfer data

1. Open Workspace or Settings.
2. Export the active workspace as JSON.
3. Import a valid JSON backup without changing record IDs or relationships.
4. Reject invalid JSON without replacing current data.
5. Confirm before restoring bundled data, clearing manual data, deleting a record, or deleting a generated draft.

---

## 6. Detailed screen specifications

## 6.1 Loading and app initialization

Purpose: cover the short period while preferences and the local workspace load.

Required UI:

- Centered brand or calendar mark.
- Short message such as â€œOpening your local workspaceâ€¦â€
- Subtle indeterminate progress indicator or skeleton.
- No false error state during normal loading.
- Match the saved/system theme before the main UI appears to avoid theme flashing.

Failure state:

- Explain that local data could not be opened.
- Offer Retry.
- Do not imply that cloud synchronization failed because no cloud service exists.

## 6.2 Onboarding â€” four slides

Shared layout:

- Brand in the top-left: â€œirid.ai Timetableâ€.
- Skip action in the top-right with a 44 x 44 px minimum target.
- Large icon or restrained abstract illustration.
- Eyebrow, headline, two-line explanation.
- Progress dots with an accessible text equivalent such as â€œStep 2 of 4â€.
- Primary Continue button; Back appears from slide 2 onward.
- Final primary action: â€œStart planningâ€.

Slides:

1. **WELCOME** â€” â€œPlan complete academic timetablesâ€
   Explain validated weekly schedules from organization or manual data.
2. **PRIVATE BY DESIGN** â€” â€œYour workspace stays localâ€
   Explain that records leave the device only through explicit export.
3. **CONSTRAINT AWARE** â€” â€œEvery draft is independently checkedâ€
   Mention rooms, capacity, collisions, breaks, and teaching limits.
4. **HUMAN CONTROL** â€” â€œReview before you rely on itâ€
   Make it clear that each schedule remains a coordinator-reviewed draft.

## 6.3 Workspace home

Purpose: establish current data source, save state, readiness, and routes to all input data.

Header:

- Eyebrow: â€œACADEMIC OPERATIONSâ€
- Title: â€œScheduling workspaceâ€
- Supporting text: â€œReview source data, resolve readiness issues, then generate a validated timetable.â€
- Saved/Unsaved status pill.

Summary metrics:

- Total resources.
- Assignment count.
- Readiness: Ready or number of issues.

Data source card:

- Segmented control or radio chips:
  - UET Mardan org data
  - Manual data
- Current source status pill.
- Explain that the two workspaces are stored separately.
- UET Mardan warning: Fall 2026 data is bundled; enrollment totals were unavailable, so 30-student section assumptions require review.
- Manual info: data is independent and can be entered or imported.

Workspace data card:

- Institution name field.
- Primary Save workspace button; disabled state reads â€œWorkspace savedâ€.
- Secondary actions: Import JSON and Export JSON.
- Manual-only quiet action: Load sample.
- Destructive action:
  - Organization: Restore bundled data.
  - Manual: Clear manual data.
- Explain: â€œLocal-only storage. Data leaves the device only when you export it.â€

Resource register links:

Each visible row/card includes icon, title, short description, count or issue badge, and chevron.

1. Departments â€” Owning academic units.
2. Semesters â€” Levels and active weekdays.
3. Sections â€” Class groups and student counts.
4. Courses â€” Duration, frequency, and room type.
5. Teachers â€” Home unit and scheduling preferences.
6. Assignments â€” Teacher, course, semester, and section.
7. Rooms & labs â€” Capacity and borrowing rules.
8. Teaching day â€” Hours and protected break.

Interaction states:

- Pull-to-refresh re-reads local storage; it never contacts a server.
- Switching source saves pending changes before loading the other workspace.
- Saving shows progress and then a toast.
- Destructive actions require a confirmation dialog naming the consequence.

## 6.4 Resource register template

Use the same pattern for departments, semesters, sections, courses, teachers, assignments, and rooms.

Header:

- Back control.
- Resource title and description.
- Count and/or issue summary.

Tools:

- Full-width search field with clear action.
- Primary â€œAdd [resource]â€ button.

Record list:

- Maximum 10 record summaries per page.
- Each row includes resource title, useful relationship metadata, issue marker when relevant, and chevron.
- Previous/Next pagination with â€œPage X of Yâ€ and total record count.
- Changing search resets to page 1.
- Empty search state: â€œNo matching recordsâ€ plus recovery guidance.
- Selecting a row opens a focused editor for only that record.

Record editor:

- Form fields in a logical order.
- Display record-specific validation near the form and near the relevant field when possible.
- Changes are local draft changes; make Unsaved state visible at the global level.
- Provide a distinct danger zone at the bottom.
- Delete confirmation must explain that dependent records or assignments can also be removed.
- After delete, offer one-level Undo in a toast where technically available.

### Department fields

- Code â€” uppercase.
- Department name.

### Semester fields

- Department.
- Semester number: 1â€“14.
- Active weekdays: Mondayâ€“Friday multi-select.
- Existing `active` status belongs to the data model; if exposed in a redesign, use a clearly labeled switch and do not change behavior without product approval.

### Section fields

- Semester.
- Section code â€” uppercase.
- Student count â€” numeric.

### Course fields

- Department.
- Course code â€” uppercase.
- Course name.
- Semester number: 1â€“14.
- Type: Lecture or Lab.
- Session duration: 0.5, 1, 1.5, 2, 2.5, or 3 hours.
- Sessions per week: 1â€“5.
- Selecting Lab initially sets sensible defaults of 3 hours and 1 session per week; the user can still review them.

### Teacher fields

- Teacher name.
- Home department.
- Scheduling type: Primary only or Secondary-capable.
- Preferred start time, optional, HH:MM.
- Preferred end time, optional, HH:MM.
- Preference priority: Low, Medium, High, Maximum.
- Maximum daily hours â€” decimal number.

### Assignment fields

- Teacher.
- Semester.
- Role: Primary or Secondary/cross-department.
- Course, filtered by role and department rules.
- Section: a specific section or All sections.

Changing teacher, semester, or role may clear incompatible downstream selections. The UI should warn or clearly refresh the affected fields.

### Room and lab fields

- Department.
- Room code â€” uppercase.
- Room name.
- Type: Lecture room or Lab.
- Capacity â€” numeric.
- â€œOther departments may borrowâ€ switch.
- Preserve any organization-specific sharing grants.

## 6.5 Teaching day

Purpose: define the global daily schedule window.

Required fields:

- Day starts â€” HH:MM.
- Break starts â€” HH:MM.
- Break duration â€” minutes.
- Day ends â€” HH:MM.

Show an information banner: changing these values invalidates the current generated draft because every session must remain inside the teaching window.

Prefer native or accessible time pickers on mobile, but keep a keyboard-accessible HH:MM entry fallback on web.

## 6.6 Generate

Purpose: guide the user through scope, readiness, and offline generation in three explicit steps.

Header:

- Eyebrow: â€œTIMETABLE GENERATORâ€
- Title: â€œBuild a complete draftâ€
- Supporting text: â€œSelect scope, pass readiness checks, then run a bounded offline search.â€
- Status pill: Ready or Action needed.

### Step 1 â€” Choose scope

- Department multi-select cards with code, name, and selected checkmark.
- Organization mode initially selects the first department for faster mobile generation.
- Manual mode initially selects all departments.
- At least one department is required.
- Explain that multiple departments should be combined when cross-department conflicts need to be solved together.

### Step 2 â€” Check readiness

Three check rows:

- Workspace records â€” Pass/Fix.
- Room and lab capacity â€” Pass/Fix.
- Complete-result policy â€” always communicates that partial or invalid drafts are never accepted.

Below the checks:

- Show up to the first five actionable validation errors.
- Capacity rows for each selected department and room type.
- Each capacity row shows required weekly hours, home capacity hours, shared capacity hours, and Fits or hours short.
- If assignments are not yet valid, explain that demand cannot be calculated.

### Step 3 â€” Generate

- Show expected session count when ready.
- Primary action:
  - First run: Generate timetable.
  - Existing result: Generate new arrangement.
- Disabled until scope, validation, and capacity checks pass.
- During work, replace static copy with clear progress such as â€œSearching for a new arrangement Â· attempt 4 of 20â€.
- Explain that previously accepted arrangements are excluded and only a new, complete, independently validated result is saved.
- If a draft exists, show Open current timetable as a secondary action.
- Optionally show how many previous arrangement fingerprints are remembered locally.

Generation success:

- Success banner with total session count.
- Clear route to Timetable.
- The new valid result is saved locally.

Generation failure:

- Preserve the previous valid draft.
- Show specific diagnostics and a recovery suggestion.
- Never render or save a partial result.

Footer information card:

- Title: â€œMobile solver boundaryâ€.
- Explain that large multi-department searches may take longer; the bounded local engine prioritizes privacy and responsiveness while still rejecting partial results.

## 6.7 Timetable â€” empty state

When no draft exists:

- Eyebrow: â€œTIMETABLE REVIEWâ€.
- Title: â€œNo timetable yetâ€.
- Calendar empty-state illustration/icon.
- Explain that resource readiness and generation come first.
- Primary action: Go to generation.

## 6.8 Timetable â€” generated draft

Purpose: review a dense schedule using a focused mobile agenda instead of a compressed weekly grid.

Header:

- Eyebrow: â€œVALIDATED LOCAL DRAFTâ€.
- Title: â€œWeekly timetableâ€.
- Total session count and generated timestamp.
- Status pill: Saved locally or Unsaved changes.

Draft action card:

- Seed and number of search attempts as secondary metadata.
- â€œConstraints passedâ€ success pill.
- Primary Save timetable changes button.
- Secondary Export color PDF button.
- Destructive Delete draft button.

Filters:

- Horizontally scrollable class-group chips. Label pattern: department code Â· semester Â· section.
- Horizontally scrollable weekday chips: Mon, Tue, Wed, Thu, Fri.
- Filter changes never mutate the timetable.

Agenda header:

- Full weekday name.
- Session count.
- First start time or No classes status.

Session row:

- Time rail with start and end time.
- Lecture/Lab status.
- Shared resource status when applicable.
- Course code and course name.
- Teacher name with person icon.
- Room code and room name with location icon.
- Plain-language note when a room or teacher comes from another department.
- Quiet Edit session action.
- Use a strong left border to visually organize sessions; warning-colored border for shared resources.

Empty day:

- â€œNo classes on this dayâ€.
- Suggest another weekday or class group.
- Reassure the user that filters do not alter the timetable.

### Session editor

Open inline or in a bottom sheet on phones; use a side panel on wide screens.

Fields:

- Day.
- Start time â€” HH:MM.
- Compatible room only; filter by room type, capacity, and borrowing permission.

Actions:

- Primary: Validate and apply.
- Secondary: Cancel.

Show an information banner that the change is accepted only if the complete timetable still passes every hard constraint. On validation failure, keep entered values, show the specific conflict, and suggest changing time, day, or room. On success, show that the edit passed validation but still needs saving.

### Export behavior

- Native: generate and open a landscape color PDF in the OS share sheet.
- Web: open print preview and instruct the user to choose Save as PDF.
- The PDF has one weekly page per class group with consistent course colors, session details, and visible breaks.

## 6.9 Global search

Presentation: full-screen modal on phone; centered command/search modal or dedicated page on desktop.

Required UI:

- Close control.
- Eyebrow: â€œGLOBAL SEARCHâ€.
- Title: â€œFind any resourceâ€.
- Search field with placeholder â€œSearch courses, teachers, roomsâ€¦â€
- Search begins after two characters.
- Search only the active local workspace.
- Maximum 50 results.
- Each result shows title, one-line detail, resource-type pill, and chevron.
- Selecting a result opens its focused resource editor.

States:

- Fewer than two characters: explain the minimum and local privacy.
- No results: suggest a course code, person, department, or room.
- Results: group by relevance if supported; otherwise preserve a consistent register order.

## 6.10 Settings

Header:

- Eyebrow: â€œAPP PREFERENCESâ€.
- Title: â€œSettingsâ€.
- Explain that appearance, feedback, local data, privacy, and release details live here.

Sections:

1. **Appearance**
   - Choices: System, Light, Dark.
   - Show the active resolved theme.
2. **Haptic feedback**
   - Switch.
   - Explain that supported native controls use subtle feedback and browsers may ignore it.
3. **Local data management**
   - Saved/Unsaved status.
   - Active source name.
   - Import JSON and Export JSON.
   - Restore bundled data or Clear manual data.
   - Recommend exporting a backup before clearing data.
4. **Privacy**
   - Success/information banner stating that no analytics or remote timetable API is enabled.
   - Explain that app/browser data can be removed by clearing local storage.
   - Clarify that images and biometric data are not used.
5. **Whatâ€™s new**
   - App version.
   - Short release summary.
   - Contact support action.

---

## 7. System states and feedback

Every important action needs a designed state, not only the happy path.

### Persistent status

- Data source: UET Mardan or Manual.
- Persistence: Saved, Unsaved, or Saving.
- Readiness: Ready or number of issues.
- Generated draft: none, available, or edited/unsaved.

### Banners

Use inline banners for information that should remain near its context:

- Information: blue icon and soft blue background.
- Success: green icon and soft green background.
- Warning: amber icon and soft amber background.
- Error: red icon and soft red background.

Each banner contains a recognizable icon and meaningful text. Never rely on color alone.

### Toasts

Use non-layout-shifting toasts for save, import, export, undo, and recoverable operation feedback.

- Appear above bottom navigation.
- Maximum two lines.
- Include icon, dismiss action, and optional Undo.
- Announce to screen readers.
- Default duration around 4.5 seconds, but do not auto-dismiss critical errors before they can be understood.

### Empty states

Use an icon, concise title, explanation, and a next action when one is available. Use a dashed or softly outlined surface rather than a large decorative illustration.

### Confirmation dialogs

Required for:

- Deleting a resource record.
- Deleting a generated timetable.
- Restoring bundled organization data.
- Clearing manual data.
- Replacing current data through import when applicable.

The dialog must name the item, explain dependent consequences, and use an explicit destructive verb. Cancel is the safe default.

### Offline behavior

Offline is the normal operating mode, not an error. Do not show a persistent â€œofflineâ€ warning. Only report a network issue if a user explicitly opens an external link or support email and that action fails.

---

## 8. Visual design direction

### Desired character

- Calm academic operations.
- Precise and trustworthy.
- Contemporary, restrained, and content-first.
- Dense enough for professional work but never cramped.
- Original visual identity; calendar hierarchy may feel familiar without copying Google Calendar branding or assets.

### Avoid

- Neon gradients, glassmorphism, oversized decorative blobs, and excessive shadows.
- Chatbot bubbles or â€œAI magicâ€ clichÃ©s.
- Data tables squeezed into phone widths.
- Color-only status indicators.
- Tiny gray text or low-contrast borders.
- Huge marketing-style headings inside operational screens.
- A different component style on every page.

### Color tokens â€” light theme

| Token | Value | Use |
|---|---:|---|
| Canvas | `#FAFAFA` | App background |
| Surface | `#FFFFFF` | Cards, fields, nav |
| Surface muted | `#F4F4F5` | Icon containers, subtle fills |
| Ink | `#18181B` | Primary text and dark action |
| Muted | `#71717A` | Secondary text |
| Subtle | `#A1A1AA` | Tertiary icons/text |
| Border | `#E4E4E7` | Standard dividers and outlines |
| Strong border | `#D4D4D8` | Emphasized boundaries |
| Accent | `#4F46E5` | Active/focus state |
| Accent soft | `#EEF2FF` | Accent background |
| Success | `#059669` | Valid, saved, complete |
| Warning | `#D97706` | Assumptions, shared resources |
| Danger | `#DC2626` | Errors and destructive actions |
| Info | `#2563EB` | Neutral guidance |

### Dark theme

- Canvas: `#09090B`.
- Surface: `#18181B`.
- Raised/surface muted: `#27272A`.
- Primary text: `#FAFAFA`.
- Secondary text: `#A1A1AA`.
- Border: `#3F3F46`.
- Strong border: `#52525B`.
- Active accent may use a lighter indigo such as `#A5B4FC` where contrast requires it.
- Create dark-theme semantic backgrounds rather than reusing very pale light-theme colors.

All text and interactive states must meet WCAG 2.2 AA contrast.

### Typography

Use the platform system font or Inter if a consistent cross-platform family is required.

| Style | Size / line | Weight | Use |
|---|---:|---:|---|
| Display | 28 / 34 | 700 | Screen titles |
| Title | 18 / 24 | 600 | Card/section headings |
| Body | 15 / 22 | 400 | Explanations and form content |
| Label | 13 / 18 | 500â€“600 | Controls and row titles |
| Caption | 12 / 16 | 500 | Metadata and status |

On onboarding only, the primary headline may increase to 34 / 40. Support dynamic type and text scaling without clipping.

### Spacing and geometry

- Base spacing scale: 4, 8, 16, 24, 32, 48.
- Page side padding: 16 px phone, 24 px tablet, 32 px desktop.
- Card padding: 16 px phone, 20â€“24 px wide screens.
- Standard card gap: 16 px.
- Radius scale: 6, 8, 12, 16, full pill.
- Minimum touch target: 44 x 44 px; prefer 48 x 48 px on Android.
- Borders should do most of the surface separation; shadows should be very subtle.

### Iconography

- Use one consistent outline icon family such as Ionicons.
- Use filled variants only for selected/confirmed state.
- Icons support labels; they do not replace important text.

---

## 9. Component inventory

Design reusable components and all their states:

- App header.
- Bottom tab bar and desktop navigation rail.
- Page intro with eyebrow, title, description, and status.
- Primary, secondary, quiet, and destructive buttons.
- Icon button.
- Text field, numeric field, time field, select, searchable select.
- Switch and checkbox.
- Segmented source selector.
- Filter chips and horizontal chip bar.
- Card and metric card.
- Resource navigation row.
- Record summary row.
- Status pill: neutral, success, warning, danger, info.
- Banner: info, success, warning, error.
- Toast with optional Undo.
- Empty state.
- Skeleton loader.
- Pagination.
- Step card and completion marker.
- Readiness check row.
- Capacity row.
- Agenda time rail and session card.
- Modal/bottom sheet/side panel.
- Confirmation dialog.
- Search result row.

For every interactive component, design default, pressed, focused, selected, disabled, loading, error, and dark-theme states as applicable.

---

## 10. Responsive behavior

### Phone: 320â€“599 px

- Single-column layout.
- Persistent bottom navigation.
- Full-width primary actions.
- Secondary actions may wrap into two columns or stack.
- Resource editors are full-screen focused views.
- Use horizontal scrolling for class groups and weekdays.
- Agenda view replaces a dense weekly timetable grid.
- Session edit may use an inline card or bottom sheet.

### Tablet: 600â€“1023 px

- Maximum content width around 960 px.
- Two-column metric and resource-card layouts when readable.
- Register list and editor may use master-detail layout.
- Bottom tabs may remain or become a compact rail.
- Keep forms to at most two columns and preserve logical reading order.

### Desktop web: 1024 px and above

- Left navigation rail or centered max-width workspace.
- Workspace dashboard may use two or three columns.
- Registers should use master-detail: searchable list on the left, focused editor on the right.
- Timetable filters can stay sticky while the agenda scrolls.
- Do not replace the focused agenda with an unreadably dense table; a weekly grid may be offered only as an additional wide-screen view.
- Support keyboard navigation, visible focus rings, browser Back, deep links, and print/PDF workflows.

---

## 11. Accessibility requirements

- Meet WCAG 2.2 AA.
- Minimum 44 x 44 px interactive targets.
- Visible 2 px focus indicator with sufficient contrast.
- Complete keyboard support on web.
- Logical heading structure and screen-reader labels.
- Announce errors, toasts, saving, generation progress, and completion.
- Do not use placeholder text as the only field label.
- Associate field errors with fields and provide a page-level error summary for long forms.
- Pair every status color with text and/or icon.
- Respect device font scaling and avoid fixed-height text containers.
- Respect reduced-motion settings; replace slide/fade motion with minimal transitions.
- Ensure horizontal chip bars remain usable by keyboard and screen reader.
- Label pagination state and disabled Previous/Next controls.
- Confirm destructive operations and place keyboard focus predictably after closing dialogs.

---

## 12. Content and writing guidelines

Voice: calm, direct, operational, and reassuring.

Use:

- â€œ3 issues need attention.â€
- â€œYour previous valid draft is unchanged.â€
- â€œSelect at least one department to continue.â€
- â€œThis change conflicts with Dr. Khanâ€™s class at 10:00. Choose another time or room.â€

Avoid:

- â€œOops!â€ for serious scheduling problems.
- â€œSomething went wrongâ€ without detail.
- Technical implementation terms such as schema, fingerprint, or localStorage in primary UI copy unless placed in advanced details.
- Claims that the timetable is perfect, final, or institutionally approved.

Buttons should use verbs: Save workspace, Add course, Generate timetable, Validate and apply, Export PDF, Delete draft.

---

## 13. Validation and business rules the UI must communicate

Generation cannot begin until:

- At least one department is selected.
- Required records and references are valid.
- Weekly lecture and lab demand fits compatible home plus authorized shared-room capacity.

Every accepted timetable must satisfy:

- Every required weekly session is present.
- Sessions use active weekdays and stay inside the teaching window.
- Sessions do not overlap the protected break.
- No section, teacher, or room collision exists.
- Room type and capacity are compatible.
- Cross-department room use is authorized.
- Teacher maximum daily hours are respected.
- Repeated sibling sessions occur on different days where required.
- The result is complete; no partial draft is accepted.

Teacher time preference is an optimization preference, not always a hard requirement. The UI must visually distinguish preferences from blocking constraints.

Changing a scheduling resource invalidates the current generated draft. The design should warn before or immediately after the change and never leave an old timetable appearing valid against new inputs.

---

## 14. Prototype and design deliverables

Ask the design AI to create:

1. A complete sitemap and user-flow diagram.
2. Low-fidelity wireframes for every screen and critical state.
3. A reusable component library with light/dark variants.
4. High-fidelity phone screens at 390 x 844.
5. Responsive tablet screens at 768 x 1024.
6. Responsive desktop screens at 1440 x 1024.
7. Clickable prototypes for the four main journeys in section 5.
8. Empty, loading, saving, success, warning, error, disabled, and destructive states.
9. Accessibility annotations: focus order, labels, contrast, touch targets, and dynamic text behavior.
10. Developer handoff with design tokens, spacing, typography, component states, and responsive rules.

Minimum high-fidelity screen set:

- Onboarding slide 1 and slide 4.
- Workspace ready state.
- Workspace with readiness issues.
- Resource register list.
- Resource record editor with validation error.
- Teaching day editor.
- Generate not ready.
- Generate in progress.
- Generate success.
- Timetable empty state.
- Timetable agenda with normal and shared-resource sessions.
- Session edit with validation error.
- Global search with results.
- Settings.
- Destructive confirmation dialog.
- Light and dark theme examples.

---

## 15. Copy-paste master prompt for an AI UI/UX tool

```text
Design a complete, production-ready mobile-first UI/UX system for â€œirid.ai Timetable,â€ a local-first academic timetable planning app for iOS, Android, and responsive web.

The primary user is an academic timetable coordinator. The app manages departments, semesters, sections, courses, teachers, teaching assignments, lecture rooms/labs, and teaching-day settings. It validates readiness, calculates room/lab capacity, generates a complete conflict-free timetable offline, lets the coordinator review one class group and weekday at a time, validates manual session edits, saves locally, imports/exports JSON, and exports a landscape color PDF. There is no account, cloud database, analytics, or normal network dependency.

The product must feel calm, precise, trustworthy, contemporary, and operational. Avoid a generic admin dashboard, student social-app styling, chatbot visuals, neon gradients, glassmorphism, excessive shadows, and cramped mobile tables. Use a content-first system with subtle borders, restrained cards, strong hierarchy, excellent empty/error states, and clear recovery guidance.

Primary navigation on phone is a four-item bottom bar: Workspace, Generate, Timetable, Settings. Include an app header with global search. On desktop, adapt this to a left navigation rail. Secondary routes are Departments, Semesters, Sections, Courses, Teachers, Assignments, Rooms & Labs, and Teaching Day. These routes must support explicit Back controls and native/browser back behavior.

Design all screens and states described in the attached UI/UX design brief, especially:
- Four-slide onboarding covering complete schedules, local privacy, constraint validation, and human review.
- Workspace dashboard with Saved/Unsaved state, resource metrics, readiness, separate UET Mardan and Manual data sources, institution name, import/export/save/restore actions, and eight visible resource-register links.
- Searchable resource registers with 10 records per page, Previous/Next pagination, issue markers, empty search state, Add action, and one focused record editor.
- Exact editors for department, semester, section, course, teacher, assignment, room/lab, and teaching-day fields.
- Three-step Generate flow: choose departments, check records and capacity, then generate. Include not-ready, disabled, progress, success, and failure states. A failed attempt must visibly preserve the previous valid draft.
- Timetable empty state and generated agenda. Include class-group chips, weekday chips, chronological time rail, session cards, shared-resource warnings, Save, Export PDF, Delete draft, and session editing for day/start/compatible room with validation feedback.
- Global local-only search and Settings for theme, haptics, local data, privacy, version, and support.
- Banners, toasts with optional Undo, skeletons, empty states, confirmation dialogs, and all default/pressed/focus/selected/disabled/loading/error states.

Use these light-theme foundations: canvas #FAFAFA, surface #FFFFFF, primary text/action #18181B, muted text #71717A, border #E4E4E7, active accent #4F46E5, success #059669, warning #D97706, danger #DC2626, info #2563EB. Also create a true dark theme using canvas #09090B, surface #18181B, raised #27272A, text #FAFAFA, muted #A1A1AA, and border #3F3F46. Meet WCAG 2.2 AA and never communicate status through color alone.

Use a system font or Inter. Type scale: display 28/34 bold, title 18/24 semibold, body 15/22 regular, label 13/18 medium, caption 12/16 medium. Use a 4/8/16/24/32/48 spacing scale, 12 px standard card radius, subtle borders, minimal shadows, and 44 px minimum touch targets. Support dynamic type, keyboard navigation, visible focus, screen-reader announcements, reduced motion, and responsive layouts at 390 px phone, 768 px tablet, and 1440 px desktop.

Create a sitemap, core user flows, low-fidelity wireframes, high-fidelity responsive screens, reusable components with variants, a clickable prototype, accessibility annotations, and developer-ready tokens/specifications. Use realistic UET Mardan academic content in examples. Preserve the distinction between blocking constraints and non-blocking preferences. Always show why an action is blocked and how to recover.
```

---

## 16. Design acceptance checklist

The design is ready for implementation only if:

- Every current route and form field is represented.
- The active data source and save state are always understandable.
- A user can find the reason generation is blocked.
- Failed import, edit, or generation states explicitly preserve valid work.
- Resource lists remain usable with hundreds of records.
- The timetable is readable on a 360 px-wide phone.
- Destructive actions are clearly separated and confirmed.
- Light and dark themes meet contrast requirements.
- Keyboard, screen reader, dynamic type, and reduced-motion behavior are annotated.
- Responsive designs are provided for phone, tablet, and desktop.
- Components and tokens are reusable rather than screen-specific.
- The prototype covers setup, correction, generation, review, edit, save, export, and recovery.
