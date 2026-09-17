# Implementation plan – Labour Case Tracker

Requirements: [labour-tracker-claude-code-prompt.md](labour-tracker-claude-code-prompt.md).
Each stage and phase ends with a working, deployable app: lint, tests and build
pass, and the work is committed to `main`.

| Stage / phase | Status |
|---|---|
| Stage 1 – Project setup | ✅ Done |
| Stage 2 – Placeholder PWA on GitHub Pages | ⬜ |
| P1 – Foundations | ⬜ |
| P2 – Cases | ⬜ |
| P3 – Clinical logic (tests first) | ⬜ |
| P4 – Events and timeline | ⬜ |
| P5 – Flags and reminders in the UI | ⬜ |
| P6 – Progress chart | ⬜ |
| P7 – Hardening and handover | ⬜ |

---

## Agreed decisions

Agreed on 2026-09-17. **Where these differ from the requirements prompt, these win.**

1. **First-stage progress has two phases** (replaces the prompt's single
   4-hourly NICE rule in sections 6.5, 7.2 and 8). VE dilatation is entered in
   **1 cm steps (0–10)**.

   | | Latent phase (< 4 cm) | Active phase (≥ 4 cm) |
   |---|---|---|
   | Starts | first VE / ROM | ESTABLISHED_LABOUR (offered when a VE ≥ 4 cm is saved – 7.1) |
   | VE due | every **4 h** | every **2 h** |
   | Expected progress | none – **no slow-progress flag** | **1 cm per hour** |
   | Delay flag | only **"Not in active phase 12 h after ROM"** | suspected / confirmed delay (below) |

   - **VE due:** timed from the last VE (or from ROM if there is no VE yet).
     Applies only once ROM or a VE has been recorded. Amber within 30 min,
     red when overdue.
   - **Not in active phase 12 h after ROM:** AROM/SROM recorded, 12 h have
     passed, and there is no ESTABLISHED_LABOUR. **Amber.** It can be
     acknowledged, and it clears when established labour is recorded.
   - **Suspected delay (active phase):** each new active-phase VE is compared
     with the previous active-phase VE. Expected progress is
     `1 cm/h × interval`, capped so it never goes past 10 cm. If progress is
     below that, flag "Suspected delay in first stage" (amber). If the VEs are
     less than 1.5 h apart, compare with the latest active-phase VE at least
     1.5 h earlier instead; if there isn't one, don't assess.
   - **Confirmed delay:** at the next VE after a suspected delay, progress since
     the suspected-delay VE is < 1 cm (`confirmedDelayMinCm`) → "Delay
     confirmed" (red).
   - **After oxytocin is started following a delay flag**, the next VE is due at
     +4 h instead of +2 h (`veAfterOxytocinForDelayHours`).
   - **Chart reference line:** 1 cm/h from the established-labour VE.
   - **Settings** (replacing `veIntervalHours`, `firstStageMinCmPer4h` and
     `reassessAfterSuspectedDelayHours`):
     - `latentVeIntervalHours` = 4
     - `activeVeIntervalHours` = 2
     - `activeMinCmPerHour` = 1
     - `latentMaxHoursAfterRom` = 12
     - `confirmedDelayMinCm` = 1 (unchanged)
     - `veAfterOxytocinForDelayHours` = 4 (unchanged)
   - **Tests** (replacing the first-stage items in 7.4):
     - latent phase: slow or no progress raises no flag; VE due at 4 h
     - ROM + 12 h without established labour → flag; cleared by established
       labour
     - active phase: VE due at 2 h
     - 2 cm in 2 h → no flag; 1 cm in 2 h → suspected delay
     - 3 h interval pro-rated (3 cm → no flag, 2 cm → suspected delay)
     - VEs < 1.5 h apart; 9 cm → 10 cm cap
     - confirmed (< 1 cm) and not confirmed (≥ 1 cm) at the next VE
     - VEs before established labour are ignored for delay
     - oxytocin started after a delay → next VE at +4 h
2. **Flag acknowledgements are stored** in their own `acks` database table,
   keyed by case, flag and threshold (e.g. `ROM:18`). An acknowledged flag stays
   hidden after a restart, and reappears when the condition changes or the next
   threshold is reached.
3. **Oxytocin rate changes never affect flags.** Only `OXYTOCIN_START` after a
   delay flag moves the next VE to +4 h (`veAfterOxytocinForDelayHours`).
   Rate changes are still recorded and shown on the timeline and chart.
4. **"No change over ≥ 4 h"** isn't needed as a separate rule. In the active
   phase it's covered by the 1 cm/h rule; in the latent phase nothing is flagged
   (decision 1).
5. **Spontaneous-labour cases never go on 7F.** They are added only when admitted
   to the first-stage ward:
   - new/edit case form: choosing *Spontaneous* removes 7F from the ward options
     (and switches the ward to 7E if 7F was selected)
   - Transfer offers 7F only for IOL cases that haven't started IOL
   - status "Admitted" applies to a case in 7E/6EF that has no labour events
     yet
6. **Passive second stage** shows a timer only. Delay flags use active pushing
   time (section 7.3).
7. **Node.js** is needed on the Mac for local development (`brew install node@24`,
   or the installer from nodejs.org). GitHub Actions does the official builds.

---

## Stage 2 – Placeholder PWA on GitHub Pages

Goal: prove the full delivery path (build → deploy → install → offline → update)
before writing any clinical features.

### One-off setup on GitHub

- The repository must be **public**. Free GitHub Pages doesn't work on private
  repos, and the repo never contains patient data.
- Settings → Pages → Build and deployment → Source: **GitHub Actions**.

### Tasks

1. Install `vite-plugin-pwa` and `@vite-pwa/assets-generator`.
2. `vite.config.ts`:
   - `base: '/labour-tracker/'`
   - `VitePWA({ registerType: 'prompt', ... })`
   - manifest: name "Labour Case Tracker", short name "Labour", `display:
     standalone`, `start_url` and `scope` equal to the base path, theme and
     background colours, `lang: en-GB`
   - Workbox precaches every built asset. No runtime caching of other origins.
3. Icons: one source SVG in `public/`, then generate 192/512 px icons, a maskable
   icon, the Apple touch icon (180 px) and a favicon with the assets generator.
4. `index.html`: Apple meta tags (`apple-mobile-web-app-capable`, status-bar style,
   title) and `theme-color` for light and dark.
5. Placeholder page: app name, "Coming soon", the app version (injected from
   `package.json` with Vite `define`).
6. `UpdateBanner` component using `useRegisterSW` from `virtual:pwa-register/react`.
   It shows the non-blocking message "New version available – tap to update",
   and updates only when tapped.
7. Workflow `.github/workflows/deploy.yml`, triggered on push to `main`:
   - `npm ci` → lint → test → build
   - `actions/upload-pages-artifact` → `actions/deploy-pages`
   - permissions: `pages: write`, `id-token: write`
   - Only one deploy runs at a time. `ci.yml` stays for pull requests.
8. No URL routing: screens are switched with in-app state, so GitHub Pages
   needs no 404 fallback for deep links.

### Done when

- [ ] `https://essiet-hub.github.io/labour-tracker/` loads.
- [ ] It installs to the home screen on an **iPhone (Safari)** and an **Android
      phone (Chrome)**, with the correct icon and name, and opens without browser
      bars.
- [ ] With airplane mode on, the installed app still opens.
- [ ] After a second push (bump the version), an open app shows the update banner.
      Tapping it loads the new version.
- [ ] The DevTools Network tab shows no requests to any other origin.
- [ ] The app loads on **hospital Wi-Fi** (`*.github.io` is reachable).

---

## Stage 3 – Build phases

### P1 – Foundations

- **Design tokens** in `src/styles/tokens.css`:
  - 4–6 colours each for light and dark (background, surface, text, muted,
    amber, red, accent)
  - type scale and spacing scale
  - minimum tap target of 44 px
  - `prefers-reduced-motion` and visible focus styles
  - Propose the token set first and get approval before building UI.
- **Dexie database** `src/db/db.ts` (version 1), with tables:
  - `cases`
  - `events` (indexed by `caseId`, `at`)
  - `settings` (a single row)
  - `acks`
  - `meta` (whether the disclaimer has been accepted)
- `navigator.storage.persist()` on start-up.
- `src/config/defaults.ts`: default `Settings` with a comment giving the source
  of each clinical value (NICE, or the local first-stage rules – decision 1).
- **App shell**: a simple in-app screen switcher (Home ↔ Settings for now) and a
  header with a Settings icon.
- **First-launch disclaimer** that must be accepted, plus the storage note.
- **Settings screen**:
  - every value in section 6.5, with the first-stage settings from decision 1,
    and a note that clinical values should match local protocol
  - Reset to defaults
  - theme (system/light/dark), vibration, auto-delete period (24/48/72 h)
  - storage note, app version, disclaimer text
  - **Erase all data** (type `ERASE` to confirm)
- **Tests:** settings load with defaults, save and reset; Erase all clears every
  table.

Done when settings survive an app restart, Erase all works, and dark mode
switches correctly.

### P2 – Cases

- `src/config/picklists.ts`: IOL indications, history flags, fetal positions,
  liquor, presentation, placenta, wards (codes and display names).
- `src/logic/gestation.ts` and `src/logic/bmi.ts`, tested first:
  - gestation today and at scan, from EDD (format `39+4`)
  - BMI to 1 decimal place
- **Case form** (new and edit), in the order of section 9.2:
  - segmented ward control (7F hidden for spontaneous labour – decision 5);
    numeric keypads for number fields
  - live gestation and BMI
  - IOL indication (+ Other text); planned IOL time shown only when ward is 7F
  - history chips, with a VBAC badge preview
  - collapsible ultrasound section; notes
  - **Validation:**
    - bed, initials and EDD are required
    - initials are 1–4 letters, stored in capitals
    - G ≥ 1
    - warnings only (never blocking): P > G − 1, weight, height, EFW outside
      plausible ranges
- **Home screen**:
  - three collapsible sections (6EF, 7E, 7F), each with a case count
  - case rows with the fields available so far: bed + initials, VBAC badge, GₓPₓ,
    gestation, BMI, EFW + scan gestation, indication, up to 3 history chips
    + "+n", planned IOL time
  - floating **+ New case** button; empty-state message
- **VBAC**: a badge on the row and a banner under the case header, with the text
  label "VBAC".
- **Case detail**: sticky header and summary block (tap to edit). Delete case,
  with confirmation.
- **Tests:** gestation/BMI edge cases, form validation, VBAC shown only with
  Previous CS.

Done when acceptance items 1–2 pass.

### P3 – Clinical logic (pure functions, tests first, no UI)

- `src/logic/types.ts`: `Case`, the `LabourEvent` union and `Settings`, exactly
  as in section 6. (Types can be written in P1 if convenient.)
- `src/logic/status.ts`: derived status in the order of precedence from 6.4.
- `src/logic/progress.ts`, sections 7.1–7.3:
  - whether to offer "established labour" (VE ≥ 4 cm, no ESTABLISHED_LABOUR yet)
  - phase (latent / active) and next-VE-due interval (4 h / 2 h / 4 h after
    oxytocin for delay)
  - active-phase VEs (from established labour onwards, sorted by `at`)
  - suspected delay (< 1 cm/h against the previous active-phase VE, pro-rated,
    capped at 10 cm) and confirmed delay (< 1 cm at the next VE)
  - "not in active phase 12 h after ROM"
  - (all of this follows decision 1; rate changes never matter – decision 3)
  - second-stage passive and active elapsed times; parity-specific flags
- `src/logic/flags.ts`, section 8:
  - one function `computeFlags(case, events, settings, acks, now)` that returns
    `{ id, kind, level, label, detail, dueAt? }[]`
  - `nextDue(...)` for the countdown
  - `sortCases(...)`: red, then amber, then soonest due
  - acknowledgement rules; pyrexia can't be acknowledged
- `src/logic/autoDelete.ts`: which delivered cases are past the retention period.
- **Tests**: every case in section 7.4, with the first-stage cases replaced by
  the decision 1 list, plus:
  - ROM 18/24 h
  - oxytocin not started (IOL only; cleared by established labour)
  - tachysystole (> 5, not ≥ 5)
  - planned IOL time passed
  - VE due and overdue boundaries (30 min), in both latent and active phases
  - reminder amber at 15 min
  - acknowledgement reappearing at the next threshold
  - status precedence
  - auto-delete boundary

Done when all tests pass and acceptance item 7 is covered.

### P4 – Events and timeline

- **Data layer:** `src/db/events.ts` handles adding, editing and deleting events.
  In the same database transaction it:
  - keeps `case.ward` / `case.bed` in step with IOL_STARTED and TRANSFER
  - keeps `case.deliveredAt` in step with DELIVERED
  - updates `updatedAt`
  - recalculates ward, bed and deliveredAt if one of those events is edited or
    deleted
- **Shared input components**:
  - bottom sheet
  - time field (default now, **−15 min / −30 min**, custom)
  - dilatation stepper (0–10, 1 cm)
  - station chips (−3…+3), position chips, liquor chips
  - oxytocin rate input (mL/h, step 0.5, numeric keypad)
- **Action bar** (bottom, safe-area aware), which changes with status:
  - 7F: **Start IOL** (ward 7E/6EF + bed), Reminder, Transfer, Note
  - Transfer offers 7F only for IOL cases that haven't started IOL (decision 5)
  - Otherwise: **VE**, **AROM/SROM**, **Oxytocin** (start / change rate / stop),
    **Contractions**, **Pyrexia** (one-tap save, temperature optional),
    **Reminder**, **More** (the other events)
- **Timeline**: newest first; each entry shows time, icon and details, and can be
  tapped to edit or delete. The time between consecutive VEs is shown.
- **Home**:
  - case rows gain status, time since ROM, current oxytocin rate, last VE
    (e.g. "6 cm, −1, OA at 14:20")
  - collapsed **Delivered** section showing delivery time and auto-delete time
- **Auto-delete** runs on start-up and on every refresh tick.
- **Tests:** ward/bed/deliveredAt stay correct after editing or deleting events;
  editing an event's time re-orders the timeline.

Done when acceptance items 3, 4, 12 and 13 pass.

### P5 – Flags and reminders in the UI

- `useNow()` hook: ticks every 30 s and immediately on `visibilitychange` /
  `focus`.
- **Flag strip** on the case screen and **badges** on case rows (icon + text +
  colour). Home sections are sorted by `sortCases`.
- **Acknowledge** button on each flag except pyrexia.
- **Custom reminders**:
  - label (max 60 characters) and due time (+30 min / +1 h / +2 h / +4 h / custom)
  - listed in the flag strip with a **Done** button; can be edited or deleted
- **Next-due countdown** on the case row (VE or reminder, whichever is sooner).
- **Established labour prompt** after saving a VE ≥ 4 cm ("Mark established
  labour from this VE?" Yes / Not yet).
- **Second-stage timers** (passive and active), updating live.
- **Tachysystole**: the flag appears as soon as the contractions entry is saved.
- **Vibration**: `navigator.vibrate` once when a flag *first* turns red, if the
  setting is on and the page is visible. The IDs of flags already red are
  remembered so the phone doesn't vibrate again.

Done when acceptance items 5 and 8–11 pass.

### P6 – Progress chart

- `src/components/ProgressChart.tsx`, hand-written SVG:
  - **Axes:** X = hours from the earlier of ESTABLISHED_LABOUR or the first VE;
    Y = 0–10 cm
  - **VE data:** points joined by a line; station as a small secondary marker,
    with details on tap
  - **Reference line:** dashed, 1 cm/h (from the setting), starting from the
    established-labour VE
  - **Event markers** (vertical): AROM/SROM, oxytocin start and rate changes
    (labelled in mL/h), epidural, pyrexia, transfer, full dilatation, active
    pushing
  - **Delay shading:** suspected and confirmed delay segments (from `progress.ts`)
  - **Layout:** fits phone width; long labours scroll sideways inside their own
    box
  - **Accessibility:** a text summary for screen readers
- **Tests:** scale maths (pure helper), and the chart renders with 0, 1 and many
  VEs.

Done when acceptance item 6 passes.

### P7 – Hardening and handover

- **Demo data:**
  - **Load demo data** / **Clear demo data** in Settings
  - clearly labelled fictitious cases (a `demo` marker), covering every status
    and flag
- **Performance:**
  - test with 20 active cases × 60 events on a mid-range phone
  - memoise flag calculations
  - avoid re-rendering every row on each tick
- **Accessibility:**
  - labels on all controls
  - colour never the only signal
  - 375 px width, dark mode, safe areas, reduced motion, keyboard focus
- **Playwright** smoke test in Chromium and WebKit (phone viewports). The test
  adds a case, starts IOL, records AROM, oxytocin and a VE, and checks the flag.
  It runs in CI.
- **Lighthouse** mobile check: accessibility and installability.
- **Privacy check:** no requests to other origins; no ID fields beyond bed and
  initials.
- **README** (section 11):
  - what the app is and isn't
  - running, testing and building
  - GitHub Pages deployment and installing on iPhone and Android
  - how updates arrive
  - where to change pick-lists and thresholds
  - adding a field safely (Dexie migration)
  - storage caveats, including iOS eviction
  - hospital Wi-Fi check
- Work through the full acceptance checklist (section 12).

Done when every item in section 12 is ticked.
