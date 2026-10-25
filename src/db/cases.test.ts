import 'fake-indexeddb/auto'
import { TrackerDatabase } from './db'
import { createCase, deleteCase, updateCase } from './cases'
import type { CaseInput } from '../logic/types'

let db: TrackerDatabase
const input: CaseInput = { ward: '7F', bed: ' 12 ', initials: 'ab', gravida: 1, para: 0, edd: '2026-10-28', labourType: 'IOL', historyFlags: ['Previous CS'] }
beforeEach(() => { db = new TrackerDatabase(`case-test-${crypto.randomUUID()}`) })
afterEach(async () => { await db.delete() })

it('normalises, persists and edits a case without changing its identity', async () => {
  const created = await createCase(input, db)
  expect(created).toMatchObject({ bed: '12', initials: 'AB' })
  db.close()
  await db.open()
  expect(await db.cases.get(created.id)).toEqual(created)
  const edited = await updateCase(created.id, { ...input, bed: '13', historyFlags: [] }, db)
  expect(edited).toMatchObject({ id: created.id, createdAt: created.createdAt, bed: '13', historyFlags: [] })
  expect(await db.cases.count()).toBe(1)
})

it('deletes only the selected case and its dependent records', async () => {
  const one = await createCase(input, db)
  const two = await createCase({ ...input, bed: '14' }, db)
  for (const entry of [one, two]) {
    await db.events.add({ id: `note-${entry.id}`, caseId: entry.id, type: 'NOTE', at: entry.createdAt, createdAt: entry.createdAt })
    await db.acks.add({ caseId: entry.id, flagId: 'ROM', threshold: '18', acknowledgedAt: entry.createdAt })
  }
  await deleteCase(one.id, db)
  expect(await db.cases.toArray()).toEqual([two])
  expect((await db.events.toArray()).map(event => event.caseId)).toEqual([two.id])
  expect((await db.acks.toArray()).map(ack => ack.caseId)).toEqual([two.id])
})
