import type { Case, LabourEvent } from '../logic/types'

export const hourMs = 3_600_000
export const time = (hours: number) => Date.parse('2026-10-26T00:00:00Z') + hours * hourMs
export const at = (hours: number) => new Date(time(hours)).toISOString()
export function clinicalCase(overrides: Partial<Case> = {}): Case {
  return { id: 'case', createdAt: at(0), updatedAt: at(0), ward: '7E', bed: '12', initials: 'AB', gravida: 1, para: 0, edd: '2026-10-29', labourType: 'IOL', historyFlags: [], ...overrides }
}
export function event(type: LabourEvent['type'], hours: number, fields: Record<string, unknown> = {}): LabourEvent {
  return { id: `${type}-${hours}`, caseId: 'case', at: at(hours), createdAt: at(hours), type, ...fields } as LabourEvent
}
export const ve = (hours: number, dilatationCm: number, id?: string) => event('VE', hours, { dilatationCm, ...(id ? { id } : {}) })
export const rom = (hours = 0) => event('AROM', hours, { liquor: 'Clear' })
export const start = (hours: number) => event('OXYTOCIN_START', hours, { rateMlPerHr: 1 })
