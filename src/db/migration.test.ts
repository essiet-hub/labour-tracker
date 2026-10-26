import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { TrackerDatabase } from './db'

it('upgrades existing GDM labels without losing cases or older ultrasound fields', async () => {
  const name = `migration-${crypto.randomUUID()}`
  const old = new Dexie(name)
  old.version(1).stores({ cases: 'id, ward, deliveredAt', events: 'id, caseId, at, [caseId+at]', settings: 'id', acks: '[caseId+flagId+threshold], caseId', meta: 'key' })
  await old.table('cases').put({ id: 'old-case', edd: '2026-11-01', historyFlags: ['GDM – diet', 'GDM – insulin/metformin', 'Previous CS', 'Antepartum haemorrhage'], usg: { date: '2026-10-01', presentation: 'Cephalic', placenta: 'Anterior', efwGrams: 2500 } })
  old.close()
  const upgraded = new TrackerDatabase(name)
  try {
    const entry = await upgraded.cases.get('old-case')
    expect(entry).toMatchObject({ edd: '2026-11-01', historyFlags: ['GDM', 'Previous CS', 'Antepartum haemorrhage'], usg: { presentation: 'Cephalic', placenta: 'Anterior', efwGrams: 2500 } })
  } finally { await upgraded.delete() }
})
