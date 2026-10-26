import { validateCase } from './caseValidation'
import type { CaseInput } from './types'

const valid: CaseInput = { ward: '7F', bed: '12', initials: 'AB', gravida: 1, para: 0, edd: '2026-10-28', labourType: 'IOL', historyFlags: [] }

it('accepts a minimal case', () => {
  expect(validateCase(valid)).toEqual({ errors: {}, warnings: [] })
})

it('requires bed, one to four letters for initials, EDD and integer G ≥ 1 / P ≥ 0', () => {
  expect(validateCase({ ...valid, bed: ' ', initials: 'A12', edd: '2026-02-30', gravida: 0, para: -1 }).errors).toMatchObject({
    bed: expect.any(String), initials: expect.any(String), edd: expect.any(String), gravida: expect.any(String), para: expect.any(String),
  })
  expect(validateCase({ ...valid, initials: 'ABCDE', gravida: 1.5, para: 0.5 }).errors).toHaveProperty('initials')
})

it('keeps plausibility warnings non-blocking', () => {
  const result = validateCase({ ...valid, para: 2, weightKg: 29, heightCm: 211, usg: { date: '2026-10-20', efwGrams: 7000 } })
  expect(result.errors).toEqual({})
  expect(result.warnings).toHaveLength(4)
})

it('allows plausible-range boundaries', () => {
  for (const [weightKg, heightCm, efwGrams] of [[30, 120, 300], [250, 210, 6000]]) {
    expect(validateCase({ ...valid, weightKg, heightCm, usg: { date: '2026-10-20', efwGrams } }).warnings).toEqual([])
  }
})

it('requires Other indication text and a valid date for ultrasound data', () => {
  const result = validateCase({ ...valid, iolIndication: 'Other', usg: { date: '', efwGrams: 3200 } })
  expect(result.errors).toHaveProperty('iolIndicationOther')
  expect(result.errors).toHaveProperty('usgDate')
})

it('does not allow a spontaneous labour case on 7F', () => {
  expect(validateCase({ ...valid, labourType: 'Spontaneous' }).errors).toHaveProperty('ward')
})

it('accepts manual scan gestation without a scan date and validates days and AC centile', () => {
  expect(validateCase({ ...valid, usg: { date: '', gestationAtScan: '36+2', acCentile: 95 } }).errors).toEqual({})
  expect(validateCase({ ...valid, usg: { date: '', gestationAtScan: '36+7', acCentile: 101 } }).errors).toMatchObject({ scanWeeks: expect.any(String), acCentile: expect.any(String) })
})
