# Labour Case Tracker

A personal, phone-first reminder tool for obstetricians following women awaiting
or undergoing induction of labour, or in labour. Data stays only on the doctor's
own phone.

> This app is a personal reminder tool. It does not replace clinical judgement,
> the medical record or local protocols. Always verify timings.

**Status:** Stage 2 placeholder PWA implemented; deployment and device checks pending. See [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md)
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

## Publish and install the placeholder

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
backup. The placeholder does not yet accept case data.

The remaining maintenance guidance is added as the database and clinical phases
are implemented.
