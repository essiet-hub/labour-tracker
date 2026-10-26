# Labour Case Tracker

A personal, phone-first reminder tool for obstetricians following women awaiting
or undergoing induction of labour, or in labour. Data stays only on the doctor's
own phone.

> This app is a personal reminder tool. It does not replace clinical judgement,
> the medical record or local protocols. Always verify timings.

**Status:** P2 cases complete: add/edit cases, ward lists, gestation and BMI,
ultrasound details and VBAC badges. GitHub Pages deployment has succeeded;
real-device checks remain pending. Clinical events, flags and charting are still
to come. See [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md)
for what comes next and [labour-tracker-claude-code-prompt.md](labour-tracker-claude-code-prompt.md)
for the full requirements.

## Run it locally

You need [Node.js](https://nodejs.org/) 24 or later (this installs `npm` too).

```sh
npm ci           # install dependencies (first time, or after pulling changes)
npm run dev      # start the app at the address it prints
npm test         # run the unit tests
npm run lint     # check code style
npm run build    # type-check and build into dist/
```

## Folders

| Folder | What lives there |
|---|---|
| `src/config/` | Pick-lists and default clinical thresholds |
| `src/logic/` | Clinical rules (pure functions) and their tests |
| `src/db/` | On-device database and migrations |
| `src/components/` | Shared UI pieces |
| `src/screens/` | The app's screens |
| `src/styles/` | Global CSS and design tokens |

## Publish and install

The repository must be public. In GitHub, open **Settings → Pages → Build and
deployment** and choose **GitHub Actions** as the source. Push to `main` to run
lint, tests and the production build, then deploy to:
https://essiet-hub.github.io/labour-tracker/

The repository path is set in `vite.config.ts` (`/labour-tracker/`). If the
repository name changes, update the base path, manifest scope/start URL and
service-worker navigation allowlist together.

On iPhone, open the URL in Safari, then **Share → Add to Home Screen**. On
Android, open it in Chrome and choose **Install app** or **Add to Home screen**
from the browser menu. Open once online and allow the service worker to finish
caching, then check that it opens in airplane mode. Check the real devices and
hospital Wi-Fi before relying on offline availability.

Updates wait for your tap on **New version available – tap to update**. To test
this, keep an installed production app open, bump the version in `package.json`
using `npm version patch --no-git-tag-version`, and deploy again. Reopen the app
to check for an update; it should offer the banner without reloading by itself.
The service worker is enabled in production builds, not `npm run dev`.

Run `npm run build` then `npm run preview` to check the production app locally at
`/labour-tracker/`. In browser developer tools, confirm the manifest, service
worker and precached assets, then test offline mode and inspect Network for
requests to other origins. No external fonts, scripts or analytics are used.

Icons are generated from `public/icon.svg` with `npm run generate-pwa-assets`.
Commit the generated files so builds do not need to generate them again.

## Storage

Cases are stored only on this device. Clearing browser data will erase them.
Changing phones does not transfer cases. Safari storage may be evicted after
non-use; installing to the home screen reduces this risk. There is no export or
backup. Use bed number and initials only, including in notes.

## Add and review cases

Tap **+ New case** on Home. Enter bed number, 1–4 initials and G/P, then either
EDC or gestation today in weeks and days (0–6). Manual gestation advances each
day, including after restarting the app. BMI updates from weight and height.
Expand **Latest ultrasound** to enter EFW, EFW centile, AC centile and liquor.
Scan gestation can come from the scan date or be entered manually; a scan date
is optional when entering scan gestation manually. Manual scan gestation stays
fixed. Summaries show onset or IOL with its indication, today's gestation, BMI
and “USG at … weeks: EFW …”. EDC is available in the edit form.
Selecting **Previous CS** shows a VBAC badge and banner.

Cases appear in the 6EF, 7E or 7F ward section. Tap a case to open its details;
tap its summary to edit. **Delete case** requires a separate confirmation and
deletes the case and its associated events and acknowledgements. Spontaneous
labour cases can be placed in 7E or 6EF; choosing Spontaneous switches 7F to 7E.

All dates used for gestation and all planned IOL times use Asia/Hong_Kong.
Plausibility warnings ask you to check an entry but still allow saving it.

## Change settings and maintain storage

Open the cog button on Home to change settings. Tap **Save settings** to apply
them. Theme follows the system by default; Light and Dark are explicit overrides.
**Reset to defaults** restores every preference and clinical threshold.
**Erase all data** requires typing `ERASE` and also resets disclaimer acceptance.

Default thresholds are in `src/config/defaults.ts`. The first-stage values follow
the local decisions in the implementation plan; other clinical values follow
the requirements. Confirm values against local protocol before using them.
Pick-lists and plausibility ranges are in `src/config/picklists.ts`. Gestation,
BMI and form validation are pure functions in `src/logic/` with unit tests.
Flag calculations have not been implemented yet.

Database version 2 merges existing GDM history subtypes into GDM. Retired history
and ultrasound values are retained in storage but omitted from controls and
summaries.

The database schema is in `src/db/db.ts`. Never remove the existing Dexie version
or delete the database to add a field. Add a new version with an upgrade function
when existing records need backfilling, and test that old data survives the
upgrade. Optional fields that need no backfill can use the existing store.

The remaining maintenance guidance is added as the clinical phases are implemented.
