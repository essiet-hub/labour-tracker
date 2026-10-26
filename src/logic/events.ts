import type { LabourEvent } from './types'

// A single deterministic chronology for edited/backdated events. Never sort in place.
export function orderedEvents(events: readonly LabourEvent[], now: number): LabourEvent[] {
  return events.filter(event => Number.isFinite(Date.parse(event.at)) && Date.parse(event.at) <= now)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
}

export function caseEvents(caseId: string, events: readonly LabourEvent[], now: number) {
  return orderedEvents(events.filter(event => event.caseId === caseId), now)
}

export const hourMs = 3_600_000
export const minuteMs = 60_000
