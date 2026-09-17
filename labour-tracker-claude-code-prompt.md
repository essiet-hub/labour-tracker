# Build prompt: Labour Case Tracker (personal, phone-first web app for obstetricians)

## Your role and how to work

You are building a small, production-quality web app for obstetricians in a Hong Kong public hospital. Read this whole document before writing any code.

1. First, reply with a short **implementation plan**: tech stack confirmation, folder structure, data model, screen list, and any questions or ambiguities you find. Wait for my approval before coding.
2. Build in small, testable steps. Commit after each working step.
3. Write unit tests for all clinical-timing logic (sections 7 and 8) before wiring it into the UI.
4. At the end, give me a README (see section 11) written for a clinician maintaining the app with Claude Code, not a professional developer.

Use British English spelling throughout the UI (labour, haemorrhage, centile). Use 24-hour time. Assume the Hong Kong time zone (Asia/Hong_Kong). **English only** – no translations or language switcher.

---

## 1. Purpose

A **personal case tracker** that lets each obstetrician keep track of the women they are looking after who are:

- waiting to start induction of labour (IOL), or
- being induced (from AROM onwards), or
- in labour (spontaneous or induced).

It is an **aide-memoire for the individual doctor**. It is **not** the medical record, not a ward board, and not shared between doctors. Official documentation remains in the hospital system and the formal partogram.

The purpose is to maintain a record of the labour progress: including but not limited to time of spontaneous/ aritificial rupture of membrane, start of syntocinon infusion, time of regular contractions, timed vaginal examinations. And also to record the salient points of the patient's antenatal history.

### Explicitly out of scope – do not build

- Cervical ripening tracking (Propess, prostin, misoprostol, balloon).
- Ward board, multi-user view, real-time sync.
- Automatic transfer alerts (midwives often arrange transfers themselves).
- Handover summary generation or copy-to-clipboard summaries.
- Delivery details (mode, blood loss, birthweight, Apgar, cord gases, perineum) and any logbook or statistics.
- Full twin-labour support (twins is a history flag only).
- GBS antibiotic timing, oxytocin rate reminders or maximum-rate flags.
- Abdominal palpation in fifths (station only).
- Maternal observations, fluid balance, full CTG documentation.
- PIN / Face ID app lock.
- Data export, import or backup.
- Any server, login, cloud storage, analytics or translations.

---

## 2. Users, devices and environment

- Users: obstetricians only. Several colleagues open the **same URL**, but each doctor's data lives **only on their own phone**.
- Devices: **personal phones, a mix of iPhone (Safari) and Android (Chrome)**. Test both engines (WebKit and Chromium).
- Primary context: **at the bedside**, often one-handed, day and night.
- Network: **hospital Wi-Fi**. The app must load from GitHub Pages once, then work **fully offline**. If the network drops mid-shift, nothing should break.
- Capacity: a doctor follows **up to 20 active cases** at once (plus recently delivered ones awaiting auto-deletion). The UI must stay fast and readable at that number.


- User will input data on one device and later continue with the same device only. 

---

## 3. Privacy and data rules (non-negotiable)

- Patient identification is **bed number + initials only**. There are **no fields** for name, HKID, hospital number, date of birth or phone number. Do not add any.
- All data stored **locally in the browser** (IndexedDB). No network requests after the app has loaded, apart from the service worker's update check against the app's own origin: no analytics, no external fonts, no CDNs, no third-party scripts. Bundle all assets.
- Show a small persistent note in Settings and on first launch: "Cases are stored only on this device. Clearing browser data will erase them."
- **Losing data (e.g. changing phones) is acceptable.** No export or backup.
- **Auto-delete** delivered cases a set time after delivery (default **72 hours**, editable in Settings: 24 / 48 / 72 h).
- Manual **Delete case** (with confirmation) and **Erase all data** (with a typed confirmation, e.g. type `ERASE`).
- First-launch disclaimer the user must accept: "This app is a personal reminder tool. It does not replace clinical judgement, the medical record or local protocols. Always verify timings."

---

## 4. Tech stack (recommended; propose changes in your plan if you have a strong reason)

- Vite + React + TypeScript (strict mode)
- IndexedDB via Dexie (with `dexie-react-hooks` for live queries)
- `vite-plugin-pwa` for manifest + service worker: offline support, **add to home screen** on iOS and Android, and an **update prompt** (see 10.2)
- Styling: CSS modules or a small hand-written design-token file; no CSS framework loaded from a CDN
- Charts: hand-written SVG (no chart library)
- `date-fns` (or equivalent) for time maths
- Vitest + React Testing Library for tests; Playwright smoke test in Chromium and WebKit if practical
- **Hosting: free GitHub Pages.** Configure Vite's `base` for the repository path and add a GitHub Actions workflow that runs tests, builds and deploys on every push to `main`.

Call `navigator.storage.persist()` where supported. Note in the README that on iOS, data in a normal Safari tab may be evicted after a period of non-use and that installing to the home screen reduces this risk.

---

## 5. Locations (wards)

Every case belongs to exactly one ward at a time:

| Code | Name shown in app | Meaning |
|---|---|---|
| `7F` | 7F Antenatal – awaiting IOL | Booked for IOL, not yet started |
| `7E` | 7E First stage | Where most inductions start (AROM / oxytocin), early labour |
| `6EF` | 6EF Labour ward | Some inductions start here; women transferred here in advanced labour, with epidural, or with CTG concerns |

Transfers are recorded manually by the doctor (see Transfer event). **No automatic transfer prompts.**

---

## 6. Data model

### 6.1 Case

```ts
type Ward = '7F' | '7E' | '6EF';

interface Case {
  id: string;                 // uuid
  createdAt: string;          // ISO datetime
  updatedAt: string;
  ward: Ward;
  bed: string;                // free text, e.g. "12" or "A3"
  initials: string;           // 1–4 letters, uppercased

  // Maternal
  age?: number;               // years
  gravida: number;            // G
  para: number;               // P (0 = nulliparous)
  edd: string;                // ISO date; gestation today is derived from this
  weightKg?: number;          // current weight at admission
  heightCm?: number;
  // BMI is derived, never stored: weight / (height m)^2, 1 decimal place

  // Reason for being here
  labourType: 'IOL' | 'Spontaneous';
  iolIndication?: IolIndication;
  iolIndicationOther?: string;
  plannedIolAt?: string;      // ISO datetime, mainly for 7F cases

  // Antenatal history
  historyFlags: HistoryFlag[];
  historyNote?: string;

  // Latest ultrasound
  usg?: {
    date: string;             // ISO date; gestation at scan derived from EDD
    efwGrams?: number;
    efwCentile?: number;
    presentation?: 'Cephalic' | 'Breech' | 'Transverse' | 'Oblique' | 'Unstable';
    liquor?: { method: 'AFI' | 'DVP'; valueCm: number };
    placenta?: 'Anterior' | 'Posterior' | 'Fundal' | 'Lateral' | 'Low-lying' | 'Praevia';
  };

  notes?: string;

  deliveredAt?: string;       // set by Delivered event; drives archive + auto-delete
}
```

Pick-lists (keep them together in one constants file so they are easy to edit):

- **IolIndication**: Post-dates, SROM, Gestational diabetes, Pre-existing diabetes, Gestational hypertension / pre-eclampsia, Chronic hypertension, FGR / SGA, Suspected macrosomia, Reduced fetal movements, Oligohydramnios, Advanced maternal age, Obstetric cholestasis, Maternal request, Other (free text).
- **HistoryFlag** (tap-to-select chips): Previous CS, Other uterine surgery, GBS positive, GBS unknown, GDM – diet, GDM – insulin/metformin, Pre-existing diabetes, Hypertension / PET, FGR / SGA, Rh negative, Antepartum haemorrhage, Low-lying placenta, Twins, Previous PPH, Previous shoulder dystocia, Thrombocytopenia, Other (use note).

### 6.2 VBAC banner

If `historyFlags` includes **Previous CS**, show a prominent, consistent **VBAC** banner:

- on the case row on the home screen (a distinct badge next to bed + initials), and
- across the top of the case detail screen, below the sticky header.

The banner is informational only (no extra rules or reminders). It must be distinguishable without relying on colour (text label "VBAC").

### 6.3 Events (timeline)

Each case has a time-ordered list of events. Every event has an editable timestamp (default = now), an optional note, and can be edited or deleted.

```ts
interface BaseEvent {
  id: string;
  caseId: string;
  at: string;          // ISO datetime, editable
  note?: string;
  createdAt: string;
}

type Liquor = 'Clear' | 'Blood-stained' | 'Meconium – light' | 'Meconium – thick' | 'Scanty / none seen';

type LabourEvent =
  | BaseEvent & { type: 'IOL_STARTED'; ward: '7E' | '6EF'; bed: string }
  | BaseEvent & { type: 'AROM'; liquor: Liquor }
  | BaseEvent & { type: 'SROM'; liquor: Liquor }
  | BaseEvent & { type: 'OXYTOCIN_START'; rateMlPerHr: number }
  | BaseEvent & { type: 'OXYTOCIN_RATE'; rateMlPerHr: number }
  | BaseEvent & { type: 'OXYTOCIN_STOP'; reason?: string }
  | BaseEvent & { type: 'CONTRACTIONS'; per10min: number; regular: boolean }
  | BaseEvent & { type: 'VE'; dilatationCm: number; station?: number; position?: FetalPosition }
  | BaseEvent & { type: 'ESTABLISHED_LABOUR' }   // see 7.1
  | BaseEvent & { type: 'EPIDURAL' }
  | BaseEvent & { type: 'CTG_CONCERN'; classification?: 'Suspicious' | 'Pathological' }
  | BaseEvent & { type: 'MATERNAL_PYREXIA'; temperatureC?: number }
  | BaseEvent & { type: 'MATERNAL_PYREXIA_RESOLVED' }
  | BaseEvent & { type: 'REMINDER'; label: string; dueAt: string; doneAt?: string }
  | BaseEvent & { type: 'TRANSFER'; toWard: Ward; toBed: string }
  | BaseEvent & { type: 'FULL_DILATATION' }
  | BaseEvent & { type: 'ACTIVE_PUSHING' }
  | BaseEvent & { type: 'DELIVERED' }             // time only – no delivery details
  | BaseEvent & { type: 'NOTE' };
```

Input details:

- **Oxytocin rate is in mL/h only.** Numeric input, step 0.5. No mU/min conversion.
- **VE dilatation**: 0–10 cm, 2 cm steps; large stepper or chip row.
- **Station** (the only descent measure): −3, −2, −1, 0, +1, +2, +3.
- **FetalPosition**: OA, LOA, ROA, OT, LOT, ROT, OP, LOP, ROP, Not determined.
- **Maternal pyrexia**: a one-tap button; temperature is optional (numeric, 1 decimal place). A separate "Pyrexia resolved" action clears the flag.
- **Reminder**: a short free-text label (max 60 characters) and a due time (quick picks: +30 min, +1 h, +2 h, +4 h, or custom). Can be marked done, edited or deleted.
- **Transfer** and **IOL_STARTED** update `case.ward` and `case.bed`.
- **DELIVERED** records the time only and sets `case.deliveredAt`.

### 6.4 Derived case status (never stored; computed from events)

In order of precedence:

1. `Delivered` – has DELIVERED
2. `Second stage – active` – has ACTIVE_PUSHING
3. `Second stage – passive` – has FULL_DILATATION
4. `Established labour` – has ESTABLISHED_LABOUR
5. `On oxytocin` – latest oxytocin event is START or RATE (not STOP)
6. `Post-ROM` – has AROM or SROM
7. `IOL started` – has IOL_STARTED
8. `Awaiting IOL` – IOL case in 7F with none of the above
9. `Admitted` – otherwise

### 6.5 Settings (stored locally)

```ts
interface Settings {
  veIntervalHours: number;                 // default 4
  reassessAfterSuspectedDelayHours: number;// default 2
  veAfterOxytocinForDelayHours: number;    // default 4
  romAlertHours: number[];                 // default [18, 24]
  oxytocinAfterAromHours: number;          // default 2 (IOL cases only)
  tachysystolePer10: number;               // default 5 (flag if > this)
  firstStageMinCmPer4h: number;            // default 2
  confirmedDelayMinCm: number;             // default 1
  secondStage: {
    nullipSuspectMin: number;              // default 60
    nullipDelayMin: number;                // default 120
    parousSuspectMin: number;              // default 30
    parousDelayMin: number;                // default 60
  };
  autoDeleteHoursAfterDelivery: 24 | 48 | 72; // default 72
  vibrateOnRedFlag: boolean;               // default true
  theme: 'system' | 'light' | 'dark';
}
```

Include a **Reset to defaults** button. Note beside the clinical settings that they should match local protocol.

---

## 7. Labour progress logic (NICE intrapartum care)

Put all of this in a pure, framework-free module (e.g. `src/logic/progress.ts`) with thorough unit tests. The UI shows results as **advisory flags**, never as instructions.

### 7.1 Start of established first stage

- When a VE with dilatation **≥ 4 cm** is saved and no ESTABLISHED_LABOUR event exists, show a prompt: "Mark established labour from this VE?" (Yes / Not yet). Yes creates ESTABLISHED_LABOUR at that VE's time.
- The doctor can also add ESTABLISHED_LABOUR manually with any time.

### 7.2 First-stage delay

Using VEs from the established-labour time onwards:

- **Suspected delay**: when a VE is recorded, find the VE nearest to 4 h earlier (within the established first stage). If the interval is ≥ 3.5 h and progress is **< `firstStageMinCmPer4h` cm per 4 h** (pro-rate the threshold to the actual interval), flag "Suspected delay in first stage". Also flag if a VE shows no change over ≥ 4 h.
- After suspected delay, set **next VE due** at `reassessAfterSuspectedDelayHours` (default 2 h).
- **Confirmed delay**: at that reassessment VE, if progress since the suspected-delay VE is **< `confirmedDelayMinCm` cm**, flag "Delay confirmed".
- If OXYTOCIN_START (or a rate increase) is recorded after a delay flag, set next VE due at `veAfterOxytocinForDelayHours` (default 4 h).
- Apply the same rule to nulliparous and parous women; display parity next to the flag so the doctor can interpret it.

### 7.3 Second-stage timings

- Passive second stage starts at FULL_DILATATION; active second stage starts at ACTIVE_PUSHING.
- Show live elapsed timers for both.
- Flags based on active pushing duration and parity (para 0 = nulliparous, para ≥ 1 = parous):

| | Suspected delay | Delay |
|---|---|---|
| Nulliparous | ≥ 60 min | ≥ 120 min |
| Parous | ≥ 30 min | ≥ 60 min |

(Values from Settings.)

### 7.4 Tests required

Write Vitest cases covering at least: normal progress (no flag); 1 cm in 4 h (suspected); exactly 2 cm in 4 h (no flag); non-4-hour intervals; reassessment with < 1 cm (confirmed) and ≥ 1 cm (not confirmed); VEs before established labour ignored; second-stage thresholds for para 0 and para 2; edited event times re-ordering correctly; pyrexia flag raised and cleared; reminder due, overdue and done; VBAC banner shown only when Previous CS is selected.

---

## 8. Reminders and flags

Compute these from events + current time (re-evaluate every 30 s while the app is open, and immediately when the app returns to the foreground). Show them as badges on the case row and in a flag strip at the top of the case screen.

| Flag | Rule | Level |
|---|---|---|
| VE due / overdue | last VE + `veIntervalHours` (or the interval set by 7.2); only once ROM or established labour exists | Amber when due within 30 min, red when overdue |
| ROM duration | time since AROM/SROM exceeds each value in `romAlertHours` (18 h, 24 h) | Amber at first, red at second |
| Oxytocin not started | IOL case, AROM recorded, no OXYTOCIN_START within `oxytocinAfterAromHours` and no established labour | Amber |
| Tachysystole | latest CONTRACTIONS > `tachysystolePer10` per 10 min | Red, shown immediately on save |
| Maternal pyrexia | MATERNAL_PYREXIA recorded and not followed by MATERNAL_PYREXIA_RESOLVED; show temperature and time if entered | Red, stays until resolved (cannot be hidden by acknowledging) |
| Custom reminder | REMINDER not done; show label and due time | Amber within 15 min of due, red when overdue |
| First-stage delay | from 7.2 | Amber (suspected) / red (confirmed) |
| Second-stage delay | from 7.3 | Amber / red |
| Planned IOL time passed | 7F case with `plannedIolAt` in the past and no IOL_STARTED | Amber |

- Flags other than pyrexia can be **acknowledged** (hides the badge until the condition changes or the next threshold is reached). Custom reminders are cleared by marking them **Done**.
- **No transfer alerts.**
- In-app only; do not rely on push notifications. If the app is open and visible, vibrate once via `navigator.vibrate` when a flag first turns red (setting `vibrateOnRedFlag`; note that iOS ignores vibration).

---

## 9. Screens and UX

Design for a phone first: one-handed use, tap targets ≥ 44 px, primary actions within thumb reach (bottom of screen), high contrast, readable in a dim delivery room. Respect reduced motion. Visible keyboard focus on desktop.

Visual direction: a calm, clinical, uncluttered tool. Status, flags and the VBAC banner should be the most prominent things on screen. Use colour for urgency (amber/red) but always pair it with text or an icon. Avoid decorative gradients and generic card-heavy dashboards. Use the system font stack (no downloaded web fonts). Before coding the UI, propose a small token set (4–6 colours for light and dark, type scale, spacing) in your plan.

### 9.1 Home – My cases

- Header: app name and Settings icon.
- Three collapsible sections in this order: **6EF Labour ward**, **7E First stage**, **7F Antenatal – awaiting IOL**, each with a case count. (Most acute first.)
- Within a section, sort by: red flags first, then amber, then soonest "next due".
- **Case row** shows:
  - Bed + initials (large), **VBAC badge** if applicable, G_P_ (e.g. G2P1), gestation today (e.g. 39+4)
  - BMI, EFW (g) with scan gestation
  - Indication (or "Spontaneous labour"), key history chips (max 3 + "+n")
  - Status, time since ROM, current oxytocin rate (mL/h), last VE (e.g. "6 cm, −1, OA at 14:20")
  - Next due item with countdown (VE or custom reminder, whichever is sooner); flag badges
  - For 7F cases: planned IOL date/time
- Floating **+ New case** button.
- A collapsed **Delivered** section at the bottom showing delivery time and when each case will be auto-deleted.
- Empty state: "No cases yet. Add a case to start tracking."
- Must remain easy to scan with 20 active cases.

### 9.2 New / edit case form

Single scrollable form, completable in about a minute, with appropriate keyboard types (numeric keypad for numbers):

1. Ward (segmented control: 7F / 7E / 6EF), Bed, Initials
2. Age, Gravida, Para, EDD (date picker; show derived gestation today live)
3. Weight (kg), Height (cm) → live BMI
4. Labour type (IOL / Spontaneous) → if IOL: indication pick-list (+ Other text), planned IOL date/time (shown when ward = 7F)
5. Antenatal history chips + note (selecting Previous CS shows a preview of the VBAC badge)
6. Latest ultrasound (collapsible): date (show derived gestation at scan), EFW g, centile, presentation, liquor (AFI/DVP + value), placenta
7. Notes

Validation: bed and initials required; G ≥ 1; warn (don't block) if P > G − 1; EDD required; plausible-range warnings for weight (30–250 kg), height (120–210 cm), EFW (300–6000 g).

### 9.3 Case detail

- Sticky header: bed + initials, ward, G_P_, gestation, BMI, EFW, status.
- **VBAC banner** (if applicable).
- **Flag strip** (section 8), with active custom reminders listed and a "Done" button on each.
- **Summary block**: indication, history chips, USG details, notes (tap to edit).
- **Progress chart** (section 9.4).
- **Timeline**: reverse chronological list of events with time, icon and details; tap to edit or delete; show time between consecutive VEs.
- **Bottom action bar** with large buttons, most relevant first for the current status:
  - 7F: **Start IOL** (choose 7E or 6EF + bed), **Reminder**, Transfer, Note
  - Otherwise: **VE**, **AROM/SROM**, **Oxytocin** (start / change rate / stop), **Contractions**, **Pyrexia**, **Reminder**, **More** (Epidural, CTG concern, Transfer, Established labour, Full dilatation, Active pushing, Delivered, Pyrexia resolved, Note)
- Each action opens a bottom sheet with minimal inputs and a time field defaulting to now (with quick "−15 min / −30 min" buttons). The Pyrexia button can save in one tap, with temperature optional.

### 9.4 Progress chart (SVG)

- X axis: time (hours), starting from the earlier of ESTABLISHED_LABOUR or the first VE; Y axis: cervical dilatation 0–10 cm.
- Plot VEs as points joined by a line; show station as a small secondary marker or in a tooltip.
- From the established-labour VE, draw a dashed **reference line at 0.5 cm/h** (2 cm per 4 h).
- Vertical markers for AROM/SROM, oxytocin start and rate changes (labelled in mL/h), epidural, pyrexia, transfer, full dilatation, active pushing.
- Shade segments flagged as suspected or confirmed delay.
- Scales to phone width; scrolls horizontally inside its own container if long.

### 9.5 Settings

All values in 6.5, dark mode, vibration on/off, auto-delete period, storage note, **Load demo data** / **Clear demo data** (clearly labelled fictitious cases for showing colleagues), Erase all data, app version, disclaimer text.

---

## 10. Non-functional requirements

### 10.1 Performance and reliability

- First load on hospital Wi-Fi under 3 s; subsequent launches instant from cache.
- Works fully offline after first load.
- With 20 active cases, each with up to 60 events, the home screen renders and scrolls smoothly on a mid-range phone.
- Timers and flags update without reload and survive app restart (all state derived from stored events and the clock).
- Correct behaviour when the phone sleeps and wakes (recalculate on `visibilitychange`).

### 10.2 Updates and maintenance

- Use `vite-plugin-pwa` in **prompt** mode: when a new version is deployed, show a non-blocking banner "New version available – tap to update". Never reload automatically while the user is entering data.
- Show the app version (from `package.json`) in Settings.
- **Database migrations**: use Dexie versioning so future changes to the data model never wipe existing cases.
- Code must be easy for a clinician to maintain with Claude Code: clear folder structure, clinical rules isolated in `src/logic/`, pick-lists and default thresholds in `src/config/`, short comments explaining each clinical rule and its source (NICE).

### 10.3 Compatibility and quality

- Supported: current iOS Safari (including home-screen mode) and current Android Chrome; desktop Chrome/Safari/Edge as a bonus.
- Handle iPhone safe areas (notch, home indicator) in the bottom action bar.
- No console errors; TypeScript strict mode; ESLint clean.
- Accessible labels on all controls; colour is never the only signal.
- Lighthouse accessibility and PWA-installability checks pass on mobile.
- Test at a 375 px-wide viewport and in dark mode.
- No app lock / PIN.

---

## 11. README contents

1. What the app is and is not (disclaimer).
2. How to run locally, run tests and build.
3. How to deploy to **GitHub Pages** (repository settings, the Actions workflow, the `base` path) and how colleagues open and install it on iPhone and Android.
4. How updates reach users (the update banner).
5. Where to change pick-lists and default thresholds.
6. How to add a new field safely (Dexie migration).
7. Storage caveats: data stays on the phone only; clearing browser data or changing phones loses it; iOS eviction and the benefit of installing to the home screen.
8. Check that hospital Wi-Fi can reach `*.github.io` before relying on it.

---

## 12. Acceptance checklist

- [ ] I can add a 7F case with bed, initials, G/P, EDD, weight, height, indication, history chips and latest USG (EFW), and see BMI and gestation calculated.
- [ ] Selecting Previous CS shows a VBAC badge on the case row and a VBAC banner on the case screen.
- [ ] I can tap **Start IOL**, choose 7E or 6EF, and the case moves to that section.
- [ ] I can record AROM, oxytocin start and rate changes in mL/h, contractions and VEs (dilatation, station, position), each with an editable time.
- [ ] Recording a VE ≥ 4 cm offers to mark established labour.
- [ ] The chart plots dilatation with a 2 cm / 4 h reference line and event markers.
- [ ] Suspected and confirmed first-stage delay flags follow section 7.2 and are covered by tests.
- [ ] Second-stage timers and parity-specific flags work.
- [ ] One tap on **Pyrexia** raises a red flag that stays until I record **Pyrexia resolved**.
- [ ] I can set a custom reminder with a label and time; it turns amber, then red, and clears when marked done.
- [ ] VE due, ROM 18/24 h, oxytocin-not-started, tachysystole and planned-IOL-passed flags work and can be acknowledged.
- [ ] I can transfer a case between 7F, 7E and 6EF manually; there are no automatic transfer alerts.
- [ ] **Delivered** records the time only; delivered cases are archived and auto-deleted after the set period; Erase all works.
- [ ] No handover summary, delivery details, export, app lock or cervical ripening features exist.
- [ ] No network requests after load except the app's own update check; no identifiers beyond bed and initials.
- [ ] Works offline, installs to the home screen on iPhone and Android, and shows the update banner after a new deploy.
- [ ] Runs smoothly with 20 active cases.
- [ ] The GitHub Actions workflow tests, builds and deploys to GitHub Pages.
