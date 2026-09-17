# Labour Case Tracker

A personal, phone-first reminder tool for obstetricians following women awaiting
or undergoing induction of labour, or in labour. Data stays only on the doctor's
own phone.

> This app is a personal reminder tool. It does not replace clinical judgement,
> the medical record or local protocols. Always verify timings.

**Status:** Stage 1 (project setup). See [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md)
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

The full README (deployment, installing on phones, updates, storage caveats) is
written in Phase 7.
