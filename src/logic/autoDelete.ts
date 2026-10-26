import { hourMs } from './events'
import type { Case, Settings } from './types'

// Selection only: P4 performs deletion in a database transaction.
export function casesToAutoDelete(cases: readonly Case[], retentionHours: Settings['autoDeleteHoursAfterDelivery'], now: number): string[] {
  return cases.filter(entry => entry.deliveredAt && Number.isFinite(Date.parse(entry.deliveredAt)) && now >= Date.parse(entry.deliveredAt) + retentionHours * hourMs).map(entry => entry.id)
}
