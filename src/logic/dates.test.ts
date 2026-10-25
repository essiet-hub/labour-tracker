import { hongKongDate, hongKongDateTime, toHongKongInput } from './dates'

it('uses Hong Kong calendar dates across midnight', () => {
  expect(hongKongDate(new Date('2026-10-25T15:59:00Z'))).toBe('2026-10-25')
  expect(hongKongDate(new Date('2026-10-25T16:00:00Z'))).toBe('2026-10-26')
})

it('formats planned IOL times in Hong Kong using 24-hour time', () => {
  expect(toHongKongInput('2026-10-25T16:00:00Z')).toBe('2026-10-26T00:00')
  expect(hongKongDateTime('2026-10-25T16:00:00Z')).toContain('00:00')
})
