import { caseEvents } from './events'
import type { Case, LabourEvent } from './types'

export type CaseStatus = 'Delivered' | 'Second stage – active' | 'Second stage – passive' | 'Established labour' | 'On oxytocin' | 'Post-ROM' | 'IOL started' | 'Awaiting IOL' | 'Admitted'

// Requirements section 6.4: status is derived, never stored.
export function deriveStatus(entry: Case, events: readonly LabourEvent[], now: number): CaseStatus {
  const ordered = caseEvents(entry.id, events, now)
  const has = (type: LabourEvent['type']) => ordered.some(event => event.type === type)
  if (has('DELIVERED')) return 'Delivered'
  if (has('ACTIVE_PUSHING')) return 'Second stage – active'
  if (has('FULL_DILATATION')) return 'Second stage – passive'
  if (has('ESTABLISHED_LABOUR')) return 'Established labour'
  const oxytocin = ordered.findLast(event => event.type === 'OXYTOCIN_START' || event.type === 'OXYTOCIN_RATE' || event.type === 'OXYTOCIN_STOP')
  if (oxytocin && oxytocin.type !== 'OXYTOCIN_STOP') return 'On oxytocin'
  if (has('AROM') || has('SROM')) return 'Post-ROM'
  if (has('IOL_STARTED')) return 'IOL started'
  return entry.labourType === 'IOL' && entry.ward === '7F' ? 'Awaiting IOL' : 'Admitted'
}
