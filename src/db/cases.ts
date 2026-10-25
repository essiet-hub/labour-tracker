import { db } from './db'
import type { TrackerDatabase } from './db'
import type { Case, CaseInput } from '../logic/types'
import { validateCase } from '../logic/caseValidation'

function normalise(input: CaseInput): CaseInput {
  const errors = validateCase(input).errors
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0])
  return { ...input, bed: input.bed.trim(), initials: input.initials.trim().toUpperCase() }
}

export async function createCase(input: CaseInput, database: TrackerDatabase = db): Promise<Case> {
  const now = new Date().toISOString()
  const entry: Case = { ...normalise(input), id: crypto.randomUUID(), createdAt: now, updatedAt: now }
  await database.cases.add(entry)
  return entry
}

export async function updateCase(id: string, input: CaseInput, database: TrackerDatabase = db): Promise<Case> {
  return database.transaction('rw', database.cases, async () => {
    const existing = await database.cases.get(id)
    if (!existing) throw new Error('This case no longer exists.')
    const entry: Case = { ...existing, ...normalise(input), updatedAt: new Date().toISOString() }
    await database.cases.put(entry)
    return entry
  })
}

export async function deleteCase(id: string, database: TrackerDatabase = db) {
  await database.transaction('rw', database.cases, database.events, database.acks, async () => {
    await database.events.where('caseId').equals(id).delete()
    await database.acks.where('caseId').equals(id).delete()
    await database.cases.delete(id)
  })
}
