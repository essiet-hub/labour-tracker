import { plausibleRanges } from '../config/picklists'
import { dateDay } from './gestation'
import type { CaseInput } from './types'

export function validateCase(value: CaseInput) {
  const errors: Record<string, string> = {}
  const warnings: string[] = []
  if (!value.bed.trim()) errors.bed = 'Enter a bed number.'
  if (!/^[a-z]{1,4}$/i.test(value.initials.trim())) errors.initials = 'Enter 1–4 letters for initials.'
  if (dateDay(value.edd) === null) errors.edd = 'Enter a valid EDD.'
  if (!Number.isInteger(value.gravida) || value.gravida < 1) errors.gravida = 'Gravida must be a whole number of at least 1.'
  if (!Number.isInteger(value.para) || value.para < 0) errors.para = 'Para must be a whole number of at least 0.'
  if (value.age !== undefined && (!Number.isInteger(value.age) || value.age <= 0)) errors.age = 'Enter a positive whole number for age.'
  if (value.labourType === 'Spontaneous' && value.ward === '7F') errors.ward = 'Spontaneous labour cases must be in 7E or 6EF.'
  if (value.labourType === 'IOL' && value.iolIndication === 'Other' && !value.iolIndicationOther?.trim()) errors.iolIndicationOther = 'Describe the IOL indication.'
  if (value.plannedIolAt && !Number.isFinite(Date.parse(value.plannedIolAt))) errors.plannedIolAt = 'Enter a valid planned IOL date and time.'
  if (value.usg && dateDay(value.usg.date) === null) errors.usgDate = 'Enter a valid ultrasound date.'
  if (value.para > value.gravida - 1) warnings.push('Para is greater than gravida − 1. Please check.')
  const checks = [
    [value.weightKg, plausibleRanges.weightKg, 'Weight is outside 30–250 kg. Please check.'],
    [value.heightCm, plausibleRanges.heightCm, 'Height is outside 120–210 cm. Please check.'],
    [value.usg?.efwGrams, plausibleRanges.efwGrams, 'EFW is outside 300–6000 g. Please check.'],
  ] as const
  for (const [number, [min, max], warning] of checks) {
    if (number !== undefined && (!Number.isFinite(number) || number < min || number > max)) warnings.push(warning)
  }
  return { errors, warnings }
}
