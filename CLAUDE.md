# Labour Case Tracker – notes for Claude Code

- Requirements: `labour-tracker-claude-code-prompt.md` (source of truth).
- Stages, phases and agreed decisions: `IMPLEMENTATION-PLAN.md`. Tick off phases there as they finish.
- British English in the UI, 24-hour time, Asia/Hong_Kong. English only.
- Privacy: bed number + initials only. No network requests after load, no CDNs, no analytics.
- Clinical rules go in `src/logic/` as pure functions with Vitest tests written first.
  Pick-lists and default thresholds go in `src/config/`.
- Before committing: `npm run lint && npm test && npm run build`.
