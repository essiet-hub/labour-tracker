import { edcFromGestation, gestation, parseGestation } from './gestation'

describe('gestation from EDD', () => {
  it.each([
    ['2026-10-28', '2026-10-25', '39+4'],
    ['2026-10-28', '2026-10-28', '40+0'],
    ['2026-10-28', '2026-11-04', '41+0'],
    ['2026-10-28', '2026-10-01', '36+1'],
    ['2024-03-01', '2024-02-29', '39+6'],
    ['2026-01-01', '2025-12-31', '39+6'],
  ])('EDD %s at %s is %s', (edd, onDate, expected) => {
    expect(gestation(edd, onDate)).toBe(expected)
  })

  it.each(['', 'not-a-date', '2026-02-30', '2026-13-01'])('rejects invalid date %s', value => {
    expect(gestation(value, '2026-10-25')).toBeNull()
    expect(gestation('2026-10-25', value)).toBeNull()
  })

  it('does not display negative gestation', () => {
    expect(gestation('2027-12-01', '2026-10-25')).toBeNull()
  })
})

it('converts manual gestation today into a date that advances correctly', () => {
  expect(edcFromGestation('39', '4', '2026-10-26')).toBe('2026-10-29')
  expect(gestation(edcFromGestation('39', '4', '2026-10-26') ?? '', '2026-10-27')).toBe('39+5')
  expect(edcFromGestation('40', '0', '2026-10-26')).toBe('2026-10-26')
  expect(edcFromGestation('41', '0', '2026-10-26')).toBe('2026-10-19')
  expect(edcFromGestation('39', '6', '2024-02-29')).toBe('2024-03-01')
})

it.each([['', '0'], ['39', ''], ['-1', '0'], ['39', '7'], ['39.5', '0'], ['39', '-1']])('rejects invalid manual weeks/days %s / %s', (weeks, days) => {
  expect(edcFromGestation(weeks, days, '2026-10-26')).toBeNull()
})

it('parses scan gestation as whole weeks plus 0–6 days', () => {
  expect(parseGestation('36+2')).toEqual({ weeks: 36, days: 2 })
  expect(parseGestation('36+7')).toBeNull()
  expect(parseGestation('36.2')).toBeNull()
})
