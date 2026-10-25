export function hongKongDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Hong_Kong', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

export function hongKongDateTime(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Hong_Kong', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(value))
}

export function toHongKongInput(value?: string): string {
  if (!value) return ''
  const at = new Date(value)
  if (!Number.isFinite(at.getTime())) return ''
  // Hong Kong is UTC+08:00 throughout the year.
  return new Date(at.getTime() + 8 * 3_600_000).toISOString().slice(0, 16)
}
