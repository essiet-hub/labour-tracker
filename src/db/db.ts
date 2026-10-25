import Dexie from 'dexie'
import type { Table } from 'dexie'
import type { Acknowledgement, Case, LabourEvent, Settings } from '../logic/types'

export class TrackerDatabase extends Dexie {
  cases!: Table<Case, string>
  events!: Table<LabourEvent, string>
  settings!: Table<Settings & { id: 'settings' }, string>
  acks!: Table<Acknowledgement, [string, string, string]>
  meta!: Table<{ key: string; value: boolean }, string>

  constructor(name = 'labour-case-tracker') {
    super(name)
    this.version(1).stores({
      cases: 'id, ward, deliveredAt',
      events: 'id, caseId, at, [caseId+at]',
      settings: 'id',
      acks: '[caseId+flagId+threshold], caseId',
      meta: 'key',
    })
  }
}

export const db = new TrackerDatabase()
