import 'fake-indexeddb/auto'
import { TrackerDatabase } from './db'
import { acceptDisclaimer, eraseAllData, loadSettings, resetSettings, saveSettings } from './settings'
import { defaultSettings } from '../config/defaults'

let db: TrackerDatabase
beforeEach(() => { db = new TrackerDatabase(`test-${crypto.randomUUID()}`) })
afterEach(async () => { await db.delete() })

it('loads defaults, saves settings across a reopen, and resets them', async () => {
  expect(await loadSettings(db)).toEqual(defaultSettings())
  await saveSettings({ ...defaultSettings(), theme: 'dark', latentVeIntervalHours: 5 }, db)
  db.close()
  await db.open()
  expect(await loadSettings(db)).toMatchObject({ theme: 'dark', latentVeIntervalHours: 5 })
  expect(await resetSettings(db)).toEqual(defaultSettings())
  expect(await loadSettings(db)).toEqual(defaultSettings())
})

it('requires the exact confirmation and erases every table including consent', async () => {
  await saveSettings(defaultSettings(), db)
  await acceptDisclaimer(db)
  await db.cases.add({ id: 'case-1', createdAt: '', updatedAt: '', ward: '7E', bed: '1', initials: 'AB', gravida: 1, para: 0, edd: '2026-10-25', labourType: 'Spontaneous', historyFlags: [] })
  await db.events.add({ id: 'event-1', caseId: 'case-1', at: '', createdAt: '', type: 'NOTE' })
  await db.acks.add({ caseId: 'case-1', flagId: 'ROM', threshold: '18', acknowledgedAt: '' })
  await expect(eraseAllData('erase', db)).rejects.toThrow('Type ERASE')
  expect(await db.cases.count()).toBe(1)
  await eraseAllData('ERASE', db)
  for (const table of db.tables) expect(await table.count()).toBe(0)
})
