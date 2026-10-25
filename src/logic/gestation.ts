const dayMs = 86_400_000

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
