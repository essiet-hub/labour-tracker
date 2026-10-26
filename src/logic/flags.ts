import { clinicalWindows } from '../config/defaults'
import { hongKongDateTime } from './dates'
import { caseEvents, hourMs, minuteMs } from './events'
import { firstStageProgress, secondStageProgress } from './progress'
import type { Acknowledgement, Case, LabourEvent, Settings } from './types'

export type FlagKind = 'VE' | 'ROM' | 'OXYTOCIN_NOT_STARTED' | 'TACHYSYSTOLE' | 'PYREXIA' | 'REMINDER' | 'FIRST_STAGE_DELAY' | 'LATENT_ROM' | 'SECOND_STAGE_DELAY' | 'PLANNED_IOL'
export interface ClinicalFlag {
  id: string
  kind: FlagKind
  level: 'amber' | 'red'
  label: string
  detail: string
  dueAt?: string
  threshold: string
  canAcknowledge: boolean
}
export interface DueItem {
  id: string
  kind: 'VE' | 'REMINDER'
  label: string
  dueAt: string
}

// IDs identify a flag; threshold fingerprints identify its current condition.
// This lets stored acknowledgements expire on edits, recurrence or escalation.
function flag(kind: FlagKind, level: ClinicalFlag['level'], label: string, detail: string, condition: unknown, dueAt?: string, id: string = kind): ClinicalFlag {
  return { id, kind, level, label, detail, threshold: JSON.stringify([level, condition]), canAcknowledge: kind !== 'PYREXIA' && kind !== 'REMINDER', ...(dueAt ? { dueAt } : {}) }
}

export function acknowledgementFor(caseId: string, flag: ClinicalFlag, now: number): Acknowledgement | null {
  return flag.canAcknowledge ? { caseId, flagId: flag.id, threshold: flag.threshold, acknowledgedAt: new Date(now).toISOString() } : null
}

// Requirements section 8 and IMPLEMENTATION-PLAN decisions override the original
// first-stage rules. All times are supplied by the caller; no clock/storage I/O.
export function computeFlags(entry: Case, events: readonly LabourEvent[], settings: Settings, acks: readonly Acknowledgement[], now: number): ClinicalFlag[] {
  const ordered = caseEvents(entry.id, events, now)
  if (ordered.some(event => event.type === 'DELIVERED')) return []
  const result: ClinicalFlag[] = []
  const first = firstStageProgress(ordered, settings, now)
  const second = secondStageProgress(entry, ordered, settings, now)
  const rom = ordered.find(event => event.type === 'AROM' || event.type === 'SROM')
  const arom = ordered.find(event => event.type === 'AROM')
  const active = ordered.some(event => event.type === 'ESTABLISHED_LABOUR')

  if (first.nextVeDueAt && now >= Date.parse(first.nextVeDueAt) - clinicalWindows.veWarningMinutes * minuteMs) {
    const level = now > Date.parse(first.nextVeDueAt) ? 'red' : 'amber'
    result.push(flag('VE', level, level === 'red' ? 'VE overdue' : 'VE due', `Due ${hongKongDateTime(first.nextVeDueAt)}`, first.veDueCondition, first.nextVeDueAt))
  }
  if (rom) {
    const thresholds = [...settings.romAlertHours].filter(value => Number.isFinite(value) && value > 0).sort((a, b) => a - b)
    const reached = thresholds.findLastIndex(hours => now >= Date.parse(rom.at) + hours * hourMs)
    const hours = thresholds[reached]
    if (hours !== undefined) {
      const dueAt = new Date(Date.parse(rom.at) + hours * hourMs).toISOString()
      result.push(flag('ROM', reached === 0 ? 'amber' : 'red', `ROM ≥ ${hours} h`, `Rupture recorded ${hongKongDateTime(rom.at)}`, [rom.id, rom.at, hours], dueAt))
    }
  }
  if (first.latentRomAlertAt && now >= Date.parse(first.latentRomAlertAt)) {
    result.push(flag('LATENT_ROM', 'amber', `Not in active phase ${settings.latentMaxHoursAfterRom} h after ROM`, 'Established labour has not been recorded.', [rom?.id, first.latentRomAlertAt], first.latentRomAlertAt))
  }
  if (entry.labourType === 'IOL' && arom && !active && first.phase !== 'second' && !ordered.some(event => event.type === 'OXYTOCIN_START') && now >= Date.parse(arom.at) + settings.oxytocinAfterAromHours * hourMs) {
    const dueAt = new Date(Date.parse(arom.at) + settings.oxytocinAfterAromHours * hourMs).toISOString()
    result.push(flag('OXYTOCIN_NOT_STARTED', 'amber', 'Oxytocin not started', `AROM recorded ${hongKongDateTime(arom.at)}`, [arom.id, arom.at, settings.oxytocinAfterAromHours], dueAt))
  }
  const contractions = ordered.findLast(event => event.type === 'CONTRACTIONS')
  if (contractions?.type === 'CONTRACTIONS' && contractions.per10min > settings.tachysystolePer10) {
    result.push(flag('TACHYSYSTOLE', 'red', 'Tachysystole', `${contractions.per10min} contractions per 10 minutes at ${hongKongDateTime(contractions.at)}`, [contractions.id, contractions.at, contractions.per10min, settings.tachysystolePer10]))
  }
  const pyrexia = ordered.findLast(event => event.type === 'MATERNAL_PYREXIA' || event.type === 'MATERNAL_PYREXIA_RESOLVED')
  if (pyrexia?.type === 'MATERNAL_PYREXIA') {
    result.push(flag('PYREXIA', 'red', 'Maternal pyrexia', `${pyrexia.temperatureC !== undefined ? `${pyrexia.temperatureC.toFixed(1)} °C · ` : ''}${hongKongDateTime(pyrexia.at)}`, [pyrexia.id, pyrexia.at, pyrexia.temperatureC]))
  }
  for (const reminder of ordered) {
    if (reminder.type !== 'REMINDER' || (reminder.doneAt && Date.parse(reminder.doneAt) <= now) || !Number.isFinite(Date.parse(reminder.dueAt))) continue
    if (now < Date.parse(reminder.dueAt) - clinicalWindows.reminderWarningMinutes * minuteMs) continue
    result.push(flag('REMINDER', now > Date.parse(reminder.dueAt) ? 'red' : 'amber', reminder.label, `Due ${hongKongDateTime(reminder.dueAt)}`, [reminder.at, reminder.label, reminder.dueAt], reminder.dueAt, `REMINDER:${reminder.id}`))
  }
  if (first.delay) {
    const delay = first.delay
    result.push(flag('FIRST_STAGE_DELAY', delay.level, delay.level === 'red' ? 'Delay confirmed' : 'Suspected delay in first stage', `Para ${entry.para} · ${delay.progressCm} cm in ${Number(delay.hours.toFixed(2))} h; expected ${Number(delay.expectedCm.toFixed(2))} cm`, [entry.para, delay.condition]))
  }
  if (second.level) {
    result.push(flag('SECOND_STAGE_DELAY', second.level, second.level === 'red' ? 'Delay in active second stage' : 'Suspected delay in active second stage', `Para ${entry.para} · ${Math.floor(second.activeMinutes)} minutes of active pushing`, [second.pushingAt, entry.para, second.level === 'red' ? second.delayMinutes : second.suspectMinutes]))
  }
  if (entry.labourType === 'IOL' && entry.ward === '7F' && entry.plannedIolAt && now > Date.parse(entry.plannedIolAt) && !ordered.some(event => event.type === 'IOL_STARTED')) {
    result.push(flag('PLANNED_IOL', 'amber', 'Planned IOL time passed', `Planned ${hongKongDateTime(entry.plannedIolAt)}`, entry.plannedIolAt, entry.plannedIolAt))
  }
  return result.filter(flag => !flag.canAcknowledge || !acks.some(ack => ack.caseId === entry.id && ack.flagId === flag.id && ack.threshold === flag.threshold && Date.parse(ack.acknowledgedAt) <= now))
}

// Actual due items stay eligible for the countdown even if their badge is hidden.
export function nextDue(entry: Case, events: readonly LabourEvent[], settings: Settings, now: number): DueItem | undefined {
  const ordered = caseEvents(entry.id, events, now)
  if (ordered.some(event => event.type === 'DELIVERED')) return undefined
  const items: DueItem[] = []
  const dueAt = firstStageProgress(ordered, settings, now).nextVeDueAt
  if (dueAt) items.push({ id: 'VE', kind: 'VE', label: 'VE', dueAt })
  for (const event of ordered) {
    if (event.type === 'REMINDER' && (!event.doneAt || Date.parse(event.doneAt) > now) && Number.isFinite(Date.parse(event.dueAt))) items.push({ id: `REMINDER:${event.id}`, kind: 'REMINDER', label: event.label, dueAt: event.dueAt })
  }
  return items.sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt) || a.id.localeCompare(b.id))[0]
}

export function sortCases(cases: readonly Case[], events: readonly LabourEvent[], settings: Settings, acks: readonly Acknowledgement[], now: number): Case[] {
  const scored = cases.map(entry => {
    const flags = computeFlags(entry, events, settings, acks, now)
    const urgency = flags.some(flag => flag.level === 'red') ? 2 : flags.length ? 1 : 0
    const due = nextDue(entry, events, settings, now)
    return { entry, urgency, due: due ? Date.parse(due.dueAt) : Infinity }
  })
  return scored.sort((a, b) => b.urgency - a.urgency || a.due - b.due || a.entry.bed.localeCompare(b.entry.bed, 'en-GB', { numeric: true }) || a.entry.id.localeCompare(b.entry.id)).map(value => value.entry)
}
