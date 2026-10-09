# irid.ai Timetable Mobile

Standalone Expo/React Native timetable planning app. It does not import from, write to, or change the dependencies of the repository's existing frontend, auth service, backend, or Python timetable package.

## Data model

The app is local-first. It keeps two independent versioned JSON workspaces in the native app's private document directory or in origin-scoped browser storage on the web:

- **UET Mardan org data** — a bundled Fall 2026 snapshot mapped from the repository's executable organization import, including departments, semesters, sections, courses, teachers, section assignments, rooms/labs, and explicit room-sharing grants.
- **Manual data** — an empty, user-managed workspace (or an imported JSON backup).

Switching modes saves pending changes and does not overwrite the other workspace. Users can explicitly export or import the active JSON file. No hosted database, account, secret, or biometric data is required.

The organization import did not contain live enrollment totals. The bundled snapshot therefore starts each section at 30 students, matching the source lab-capacity default, and flags that value for review. This is a scheduling assumption, not a claim about current enrollment.

## Run

```powershell
cd timetable-mobile
npm install
npm start
```

Use Expo Go or an Android/iOS simulator. Run `npm run check` for type and domain tests.

For a physical phone that cannot reach the computer over LAN, use `npm run start:tunnel`, keep the terminal open, and scan the newly generated QR code. Use `npm run start:tunnel:clear` only when the Metro cache itself is stale. If ngrok is unstable and both devices share the same private Wi-Fi, use `npm run start:lan` to avoid the external tunnel.

The bundled UET Mardan snapshot is resource-only: it contains scheduling inputs and no generated timetable. The current data revision performs a one-time removal of older locally saved drafts and arrangement history while preserving resource edits. After that migration, new results are created only when the user presses Generate.

## Mobile navigation

Setup opens as a visible resource hub. Departments, Semesters, Sections, Courses, Teachers, Assignments, Rooms/Labs, and Teaching Day each have their own page and Back control. Android hardware Back returns to the previous resource or top-level location without discarding edits.

The product interaction model uses Google Calendar mobile as a reference for schedule hierarchy, visible day switching, chronological agenda rows, and predictable navigation. It does not copy Google branding or assets. The visual system is original to irid.ai and emphasizes calm operational status, explicit recovery, and local-data trust.

Large resource collections use a fixed ten-record page with text search, Previous/Next controls, total counts, and a focused single-record editor. The generated timetable renders only the selected class group and weekday. This keeps the UET Mardan assignment catalog responsive while making source, saved/unsaved state, readiness, borrowed resources, and validation results visible in text as well as color.

## Solver scope

Generation runs offline with bounded, seeded multi-attempt search plus an independent hard-constraint validator. One or more departments can be selected, which keeps large organization runs practical on a phone. It enforces the current manual workflow's session completeness, active weekdays, break/day window, teacher/section/room collision, room type/capacity/borrowing, teacher daily limit, different-day sibling sessions, and section compactness rules. It prioritizes home rooms and teacher time preferences.

Each accepted arrangement receives a canonical fingerprint that ignores transient session IDs and row order. The app remembers up to 5,000 fingerprints and rejects them during later generation requests, so **Generate new arrangement** does not silently return an already accepted combination. If bounded search cannot find an unseen valid result, the current draft is preserved and the app reports that explicitly.

The repository's Python OR-Tools CP-SAT service remains preferable for very large institution-wide datasets because it can prove infeasibility and optimize globally. The mobile app never silently returns a partial timetable: all required sessions must be placed and validated or generation fails with actionable diagnostics.

## Web deployment

Create the production website locally with:

```powershell
npm run build:web
```

The static output is written to `dist/`. The configured base path is `/timetable`, matching this repository's GitHub Pages URL:

```text
https://zahir-ahmad9897.github.io/timetable/
```

The workflow in `.github/workflows/deploy-pages.yml` verifies and deploys the site on every push to `main`. For the first deployment, open **Settings -> Pages** in the GitHub repository and select **GitHub Actions** as the source if it is not already enabled.

The web build stores organization and manual workspaces separately in browser `localStorage`. JSON backups and CSV timetables download through the browser; importing uses the browser file picker. Browser data is specific to the current browser profile and site origin, so export a JSON backup before clearing site data or changing deployment domains.

## Privacy and deployment

All workspace and generated timetable data remains on the device or in the current browser profile unless the user chooses Export. GitHub Pages serves only the static application bundle; there is no application server, hosted database, analytics integration, or database cost. For team sync later, add an authenticated API rather than embedding credentials in the app.
