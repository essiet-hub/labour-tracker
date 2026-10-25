import { defaultSettings } from '../config/defaults'
import type { Settings } from '../logic/types'
import { db } from './db'
import type { TrackerDatabase } from './db'

export async function loadSettings(database: TrackerDatabase = db): Promise<Settings> {
  const row = await database.settings.get('settings')
  const defaults = defaultSettings()
  if (!row) return defaults
  const { id, ...stored } = row
  void id
  // Missing fields receive defaults without discarding existing preferences.
  return { ...defaults, ...stored, secondStage: { ...defaults.secondStage, ...stored.secondStage } }
}

export async function saveSettings(settings: Settings, database: TrackerDatabase = db) {
  await database.settings.put({ ...settings, id: 'settings' })
}

export async function resetSettings(database: TrackerDatabase = db) {
  const settings = defaultSettings()
  await saveSettings(settings, database)
  return settings
}

export async function acceptDisclaimer(database: TrackerDatabase = db) {
  await database.meta.put({ key: 'disclaimerAccepted', value: true })
}

export async function eraseAllData(confirmation: string, database: TrackerDatabase = db) {
  if (confirmation !== 'ERASE') throw new Error('Type ERASE to confirm.')
  await database.transaction('rw', database.tables, async () => {
    for (const table of database.tables) await table.clear()
  })
}

export async function requestPersistentStorage() {
  try {
    await navigator.storage?.persist?.()
  } catch {
    // Persistence is best-effort; browsers may decline or not support it.
  }
}
