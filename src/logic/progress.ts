import { caseEvents, hourMs, minuteMs, orderedEvents } from './events'
import { clinicalWindows } from '../config/defaults'
import type { Case, LabourEvent, Settings } from './types'

export type VeEvent = Extract<LabourEvent, { type: 'VE' }>
export type FirstStagePhase = 'latent' | 'active' | 'second' | 'delivered'
export interface DelayAssessment {
  level: 'amber' | 'red'
  at: string
  eventId: string
  from: string
  fromEventId: string
  progressCm: number
  expectedCm: number
  hours: number
  // Includes clinical values and source timestamps so an edit invalidates an ack.
  condition: string
}
export interface DelaySegment {
  from: string
  to: string
  level: 'amber' | 'red'
  fromEventId: string
  toEventId: string
}

export function shouldOfferEstablishedLabour(ve: LabourEvent, events: readonly LabourEvent[]): boolean {
  return ve.type === 'VE' && ve.dilatationCm >= 4 && !events.some(event => event.caseId === ve.caseId && event.type === 'ESTABLISHED_LABOUR')
}

// Single-case input. Local first-stage rules: IMPLEMENTATION-PLAN decisions 1, 3, 9.
export function firstStageProgress(events: readonly LabourEvent[], settings: Settings, now: number) {
  const ordered = orderedEvents(events, now)
  const established = ordered.find(event => event.type === 'ESTABLISHED_LABOUR')
  const rom = ordered.find(event => event.type === 'AROM' || event.type === 'SROM')
  const delivery = ordered.find(event => event.type === 'DELIVERED')
  const second = ordered.find(event => event.type === 'FULL_DILATATION' || event.type === 'ACTIVE_PUSHING')
  const endAt = Math.min(second ? Date.parse(second.at) : Infinity, delivery ? Date.parse(delivery.at) : Infinity)
  const activeVes: VeEvent[] = []
  const segments: DelaySegment[] = []
  let delay: DelayAssessment | undefined
  let previousVe: VeEvent | undefined
  let extendedInterval = false

  for (const event of ordered) {
    if (Date.parse(event.at) > endAt) break
    if (event.type === 'OXYTOCIN_START' && delay && Date.parse(event.at) > Date.parse(delay.at)) extendedInterval = true
    // OXYTOCIN_RATE intentionally has no timing or flag effect (decision 3).
    if (event.type !== 'VE') continue
    previousVe = event
    extendedInterval = false
    if (!established || Date.parse(event.at) < Date.parse(established.at)) continue

    const previous = activeVes.at(-1)
    let baseline: VeEvent | undefined
    let expectedCm = 0
    let level: DelayAssessment['level'] = 'amber'
    // The next VE after a delay checks the absolute 1cm reassessment threshold.
    if (delay && previous && event.dilatationCm - previous.dilatationCm < settings.confirmedDelayMinCm) {
      baseline = previous
      expectedCm = settings.confirmedDelayMinCm
      level = 'red'
    } else {
      baseline = activeVes.findLast(ve => Date.parse(event.at) - Date.parse(ve.at) >= clinicalWindows.activeComparisonMinimumHours * hourMs)
      if (baseline) expectedCm = Math.min(10 - baseline.dilatationCm, settings.activeMinCmPerHour * (Date.parse(event.at) - Date.parse(baseline.at)) / hourMs)
    }
    delay = undefined
    if (baseline && event.dilatationCm < 10 && event.dilatationCm - baseline.dilatationCm < expectedCm) {
      delay = {
        level, at: event.at, eventId: event.id, from: baseline.at, fromEventId: baseline.id,
        progressCm: event.dilatationCm - baseline.dilatationCm, expectedCm,
        hours: (Date.parse(event.at) - Date.parse(baseline.at)) / hourMs,
        condition: JSON.stringify([baseline.id, baseline.at, baseline.dilatationCm, event.id, event.at, event.dilatationCm, level, expectedCm]),
      }
      segments.push({ from: baseline.at, to: event.at, level, fromEventId: baseline.id, toEventId: event.id })
    }
    activeVes.push(event)
  }

  const phase: FirstStagePhase = delivery ? 'delivered' : second ? 'second' : established ? 'active' : 'latent'
  const intervalHours = extendedInterval ? settings.veAfterOxytocinForDelayHours : established ? settings.activeVeIntervalHours : settings.latentVeIntervalHours
  const anchor = previousVe?.at ?? rom?.at
  const ended = phase === 'second' || phase === 'delivered'
  const nextVeDueAt = !ended && anchor && (previousVe?.dilatationCm ?? 0) < 10 ? new Date(Date.parse(anchor) + intervalHours * hourMs).toISOString() : undefined
  return {
    phase, activeVes, segments, delay: ended ? undefined : delay, nextVeDueAt,
    veDueCondition: [previousVe?.id ?? rom?.id, anchor, intervalHours, phase],
    latentRomAlertAt: phase === 'latent' && rom ? new Date(Date.parse(rom.at) + settings.latentMaxHoursAfterRom * hourMs).toISOString() : undefined,
  }
}

// Requirements section 7.3: passive time has no delay flag. Active time uses parity.
export function secondStageProgress(entry: Case, events: readonly LabourEvent[], settings: Settings, now: number) {
  const ordered = caseEvents(entry.id, events, now)
  const full = ordered.find(event => event.type === 'FULL_DILATATION')
  const pushing = ordered.find(event => event.type === 'ACTIVE_PUSHING')
  const delivered = ordered.find(event => event.type === 'DELIVERED')
  const end = delivered ? Date.parse(delivered.at) : now
  const passiveMinutes = full ? Math.max(0, Math.min(end, pushing ? Date.parse(pushing.at) : Infinity) - Date.parse(full.at)) / minuteMs : 0
  const activeMinutes = pushing ? Math.max(0, end - Date.parse(pushing.at)) / minuteMs : 0
  const suspectMinutes = entry.para === 0 ? settings.secondStage.nullipSuspectMin : settings.secondStage.parousSuspectMin
  const delayMinutes = entry.para === 0 ? settings.secondStage.nullipDelayMin : settings.secondStage.parousDelayMin
  const level: 'amber' | 'red' | undefined = pushing && !delivered ? activeMinutes >= delayMinutes ? 'red' : activeMinutes >= suspectMinutes ? 'amber' : undefined : undefined
  return { passiveMinutes, activeMinutes, level, pushingAt: pushing?.at, suspectMinutes, delayMinutes }
}
