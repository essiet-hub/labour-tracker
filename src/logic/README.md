# logic

Pure clinical rules with no React or database code: derived case status, labour
progress (NICE intrapartum care), flags and reminders, gestation and BMI. Every
rule has unit tests next to it (`*.test.ts`).

First-stage rules follow the local decisions in `IMPLEMENTATION-PLAN.md`, which
override the original NICE-derived first-stage wording in the requirements.
Fixed warning windows are in `src/config/defaults.ts`; editable thresholds are
in the `Settings` returned by `defaultSettings()`.

All clock arguments (`now`) are epoch milliseconds. Stored event times and
returned deadlines are ISO datetime strings. Events are sorted on a copy,
invalid/future timestamps are excluded and original arrays remain untouched.
The public case-level helpers filter by case ID. `firstStageProgress` expects
events for one case; use `caseEvents` before calling it with a shared event list.

- `deriveStatus(case, events, now)` follows the requirements' precedence.
- `firstStageProgress(events, settings, now)` returns phase, active VEs, current
  delay, chart segments and next VE due. Only a start after a current delay
  extends the next VE interval, anchored to the last VE; a subsequent VE resets
  it to the normal interval. Rate changes are irrelevant to flags and timing.
- `secondStageProgress(case, events, settings, now)` returns elapsed passive and
  active minutes and a parity-specific flag level. Passive duration stops at
  pushing; delivery freezes both durations and clears the flag.
- `computeFlags(case, events, settings, acks, now)` produces advisory text and
  urgency, with a stable `id` and a `threshold` fingerprint of the condition.
  Pyrexia cannot be acknowledged. Reminders are completed with Done.
- `acknowledgementFor(caseId, flag, now)` prepares a row for the existing `acks`
  table, or returns null when acknowledgement is unavailable. Match both `id`
  and `threshold` to persist a hidden badge; use both for red-flag vibration
  tracking too, so a recurrence/escalation can be distinguished.
- `nextDue(case, events, settings, now)` selects the earliest unfinished VE or
  reminder, including overdue items. Acknowledgements hide badges, not deadlines.
- `sortCases(cases, events, settings, acks, now)` orders red, amber, then earliest
  next due, with a stable bed/ID fallback.
- `casesToAutoDelete(cases, retentionHours, now)` selects IDs only; database
  deletion and its dependent records are handled in P4.

Boundary conventions: VE amber starts 30 minutes before due; reminder amber
starts 15 minutes before due. Both turn red strictly after due. ROM and active
pushing alerts apply at their thresholds. Retention expires at its threshold.
Current flags clear on delivery; historical chart delay segments are retained.
