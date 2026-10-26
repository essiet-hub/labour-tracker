const dayMs = 86_400_000

export function parseGestation(value: string): { weeks: number; days: number } | null {
  if (!/^\d+\+[0-6]$/.test(value)) return null
  const [weeks, days] = value.split('+').map(Number)
  if (weeks === undefined || days === undefined || !Number.isSafeInteger(weeks)) return null
  return { weeks, days }
}

// Store the equivalent EDC so manually entered gestation keeps advancing daily.
export function edcFromGestation(weeks: string, days: string, onDate: string): string | null {
  const parsed = parseGestation(`${weeks}+${days}`)
  const day = dateDay(onDate)
  if (!parsed || day === null) return null
  const result = new Date((day + 280 - parsed.weeks * 7 - parsed.days) * dayMs)
  if (!Number.isFinite(result.getTime())) return null
  const date = result.toISOString().slice(0, 10)
  return dateDay(date) === null ? null : date
}

export function dateDay(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const at = Date.parse(`${value}T00:00:00Z`)
  if (!Number.isFinite(at) || new Date(at).toISOString().slice(0, 10) !== value) return null
  return at / dayMs
}

// Calendar days from EDD (40+0); UTC arithmetic avoids device-zone/DST shifts.
export function gestation(edd: string, onDate: string): string | null {
  const due = dateDay(edd)
  const today = dateDay(onDate)
  if (due === null || today === null) return null
  const days = 280 + today - due
  if (days < 0) return null
  return `${Math.floor(days / 7)}+${days % 7}`
}
