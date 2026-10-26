import { acknowledgementFor, computeFlags, nextDue, sortCases } from './flags'
import { defaultSettings } from '../config/defaults'
import { at, clinicalCase, event, rom, start, time, ve } from '../test/clinicalFixtures'
import type { Acknowledgement, LabourEvent } from './types'

const settings = defaultSettings()
const entry = clinicalCase()
const flags = (events: LabourEvent[], hours: number, acks: Acknowledgement[] = []) => computeFlags(entry, events, settings, acks, time(hours))

it('raises ROM flags at 18 and 24 hours, using the earliest rupture', () => {
  expect(flags([rom()], 18 - 1 / 3_600_000).some(flag => flag.kind === 'ROM')).toBe(false)
  expect(flags([rom(), rom(5)], 18).find(flag => flag.kind === 'ROM')?.level).toBe('amber')
  expect(flags([rom()], 24).filter(flag => flag.kind === 'ROM')).toMatchObject([{ level: 'red' }])
})

it('flags ROM without active phase at 12 hours and clears it with established labour', () => {
  expect(flags([rom()], 11.99).some(flag => flag.kind === 'LATENT_ROM')).toBe(false)
  expect(flags([rom(), ve(4, 2)], 12).find(flag => flag.kind === 'LATENT_ROM')?.level).toBe('amber')
  expect(flags([rom(), event('ESTABLISHED_LABOUR', 11)], 12).some(flag => flag.kind === 'LATENT_ROM')).toBe(false)
})

it.each([[false, 4], [true, 2]] as const)('has exact due-window boundaries (active=%s)', (active, interval) => {
  const events = active ? [event('ESTABLISHED_LABOUR', 0), ve(0, 4)] : [ve(0, 2)]
  expect(flags(events, interval - 0.5 - 1 / 3_600_000).some(flag => flag.kind === 'VE')).toBe(false)
  expect(flags(events, interval - 0.5).find(flag => flag.kind === 'VE')?.level).toBe('amber')
  expect(flags(events, interval).find(flag => flag.kind === 'VE')?.level).toBe('amber')
  expect(flags(events, interval + 1 / 3_600_000).find(flag => flag.kind === 'VE')?.level).toBe('red')
})

it('flags oxytocin not started only after IOL AROM and clears with a start or established labour', () => {
  expect(flags([rom()], 1.99).some(flag => flag.kind === 'OXYTOCIN_NOT_STARTED')).toBe(false)
  expect(flags([rom()], 2).some(flag => flag.kind === 'OXYTOCIN_NOT_STARTED')).toBe(true)
  for (const extra of [start(1), event('ESTABLISHED_LABOUR', 1)]) expect(flags([rom(), extra], 3).some(flag => flag.kind === 'OXYTOCIN_NOT_STARTED')).toBe(false)
  expect(computeFlags(clinicalCase({ labourType: 'Spontaneous' }), [rom()], settings, [], time(3)).some(flag => flag.kind === 'OXYTOCIN_NOT_STARTED')).toBe(false)
  expect(flags([event('SROM', 0, { liquor: 'Clear' })], 3).some(flag => flag.kind === 'OXYTOCIN_NOT_STARTED')).toBe(false)
})

it('tachysystole is strictly >5 and follows the latest contractions timestamp', () => {
  const normal = event('CONTRACTIONS', 0, { per10min: 5, regular: true })
  const high = event('CONTRACTIONS', 1, { per10min: 6, regular: true })
  expect(flags([normal], 0).some(flag => flag.kind === 'TACHYSYSTOLE')).toBe(false)
  expect(flags([high, normal], 1).find(flag => flag.kind === 'TACHYSYSTOLE')?.level).toBe('red')
  expect(flags([high, { ...normal, at: at(2) }], 2).some(flag => flag.kind === 'TACHYSYSTOLE')).toBe(false)
})

it('pyrexia can never be acknowledged and resolves/reoccurs from events', () => {
  const fever = event('MATERNAL_PYREXIA', 0, { temperatureC: 38.2 })
  const flag = flags([fever], 0).find(flag => flag.kind === 'PYREXIA')
  expect(flag).toMatchObject({ level: 'red', canAcknowledge: false, detail: expect.stringContaining('38.2') })
  if (!flag) throw new Error('Missing pyrexia flag')
  expect(acknowledgementFor(entry.id, flag, time(0))).toBeNull()
  expect(flags([fever], 1, [{ caseId: entry.id, flagId: flag.id, threshold: flag.threshold, acknowledgedAt: at(0) }]).some(value => value.kind === 'PYREXIA')).toBe(true)
  const resolved = event('MATERNAL_PYREXIA_RESOLVED', 1)
  expect(flags([resolved, fever], 2).some(value => value.kind === 'PYREXIA')).toBe(false)
  expect(flags([fever, resolved, event('MATERNAL_PYREXIA', 2)], 2).some(value => value.kind === 'PYREXIA')).toBe(true)
})

it('reminders are amber within 15 minutes, red only overdue, and removed when done', () => {
  const reminder = event('REMINDER', 0, { label: 'Review', dueAt: at(1) })
  expect(flags([reminder], 0.75 - 1 / 3_600_000)).toEqual([])
  expect(flags([reminder], 0.75)).toMatchObject([{ kind: 'REMINDER', level: 'amber' }])
  expect(flags([reminder], 1)).toMatchObject([{ kind: 'REMINDER', level: 'amber' }])
  expect(flags([reminder], 1 + 1 / 3_600_000)).toMatchObject([{ kind: 'REMINDER', level: 'red' }])
  expect(flags([{ ...reminder, type: 'REMINDER', label: 'Review', dueAt: at(1), doneAt: at(1) }], 2)).toEqual([])
})

it('flags planned IOL only once its time has passed on 7F without a start', () => {
  const awaiting = clinicalCase({ ward: '7F', plannedIolAt: at(1) })
  expect(computeFlags(awaiting, [], settings, [], time(1))).toEqual([])
  expect(computeFlags(awaiting, [], settings, [], time(1) + 1)).toMatchObject([{ kind: 'PLANNED_IOL', level: 'amber' }])
  expect(computeFlags(awaiting, [event('IOL_STARTED', 1, { ward: '7E', bed: '2' })], settings, [], time(2))).toEqual([])
  expect(computeFlags({ ...awaiting, ward: '7E' }, [], settings, [], time(2))).toEqual([])
})

it('acknowledgements survive serialisation and reappear at the next threshold or changed condition', () => {
  const events = [rom()]
  const flag = flags(events, 18).find(value => value.kind === 'ROM')
  if (!flag) throw new Error('Missing ROM flag')
  const ack = acknowledgementFor(entry.id, flag, time(18))
  if (!ack) throw new Error('Missing acknowledgement')
  const saved: Acknowledgement[] = JSON.parse(JSON.stringify([ack]))
  expect(flags(events, 19, saved).some(value => value.kind === 'ROM')).toBe(false)
  expect(flags(events, 24, saved).find(value => value.kind === 'ROM')?.level).toBe('red')
  expect(flags([rom(-1)], 19, saved).some(value => value.kind === 'ROM')).toBe(true)
  expect(computeFlags(entry, events, { ...settings, romAlertHours: [17, 24] }, saved, time(19)).some(value => value.kind === 'ROM')).toBe(true)
  expect(computeFlags({ ...entry, id: 'other' }, [rom(0), { ...rom(0), caseId: 'other' }], settings, saved, time(19)).some(value => value.kind === 'ROM')).toBe(true)
})

it('reappears when a previously acknowledged tachysystole condition recurs', () => {
  const high = event('CONTRACTIONS', 0, { per10min: 6, regular: true })
  const flag = flags([high], 0)[0]
  if (!flag) throw new Error('Missing flag')
  const ack = acknowledgementFor(entry.id, flag, time(0))
  if (!ack) throw new Error('Missing acknowledgement')
  expect(flags([high], 1, [ack])).toEqual([])
  expect(flags([high, event('CONTRACTIONS', 1, { per10min: 4, regular: true }), event('CONTRACTIONS', 2, { per10min: 6, regular: true })], 2, [ack])).toMatchObject([{ kind: 'TACHYSYSTOLE' }])
})

it('acknowledged VE amber reappears when overdue or the VE source changes', () => {
  const events = [ve(0, 2)]
  const flag = flags(events, 3.5)[0]
  if (!flag) throw new Error('Missing VE flag')
  const ack = acknowledgementFor(entry.id, flag, time(3.5))
  if (!ack) throw new Error('Missing acknowledgement')
  expect(flags(events, 4, [ack])).toEqual([])
  expect(flags(events, 4.01, [ack])).toMatchObject([{ kind: 'VE', level: 'red' }])
  expect(flags([ve(0, 2, 'replacement-ve')], 4, [ack])).toMatchObject([{ kind: 'VE', level: 'amber' }])
})

it('second-stage amber acknowledgements expire at the parity-specific red threshold', () => {
  const events = [event('ACTIVE_PUSHING', 0)]
  const flag = flags(events, 1)[0]
  if (!flag) throw new Error('Missing second-stage flag')
  const ack = acknowledgementFor(entry.id, flag, time(1))
  if (!ack) throw new Error('Missing acknowledgement')
  expect(flags(events, 1.5, [ack])).toEqual([])
  expect(flags(events, 2, [ack])).toMatchObject([{ kind: 'SECOND_STAGE_DELAY', level: 'red' }])
})

it('uses configured thresholds without mutating settings or events', () => {
  const custom = { ...settings, romAlertHours: [1, 2], latentMaxHoursAfterRom: 3, oxytocinAfterAromHours: 4, tachysystolePer10: 6 }
  const events = [rom(), event('CONTRACTIONS', 0, { per10min: 6, regular: true })]
  const before = structuredClone({ custom, events })
  const result = computeFlags(entry, events, custom, [], time(2))
  expect(result).toMatchObject([{ kind: 'ROM', level: 'red' }])
  expect({ custom, events }).toEqual(before)
})

it('includes parity with first-stage delay and suppresses it in second stage', () => {
  const events = [event('ESTABLISHED_LABOUR', 0), ve(0, 4), ve(2, 5)]
  expect(flags(events, 2).find(flag => flag.kind === 'FIRST_STAGE_DELAY')).toMatchObject({ level: 'amber', detail: expect.stringContaining('Para 0') })
  expect(flags([...events, event('ACTIVE_PUSHING', 3)], 3).some(flag => flag.kind === 'FIRST_STAGE_DELAY' || flag.kind === 'VE')).toBe(false)
})

it('returns no flags after delivery and ignores future/foreign events', () => {
  const fever = event('MATERNAL_PYREXIA', 0)
  expect(flags([fever, rom(), event('DELIVERED', 1)], 30)).toEqual([])
  expect(flags([{ ...fever, caseId: 'foreign' }, event('MATERNAL_PYREXIA', 5)], 1)).toEqual([])
})

it('finds the earliest VE/reminder deadline, including overdue items, independent of acknowledgements', () => {
  const reminder = event('REMINDER', 0, { label: 'Review', dueAt: at(3) })
  expect(nextDue(entry, [rom(), reminder], settings, time(1))).toMatchObject({ kind: 'REMINDER', dueAt: at(3) })
  expect(nextDue(entry, [ve(0, 2)], settings, time(5))).toMatchObject({ kind: 'VE', dueAt: at(4) })
  expect(nextDue(entry, [], settings, time(1))).toBeUndefined()
  expect(nextDue(entry, [rom(), { ...reminder, type: 'REMINDER', label: 'Review', dueAt: at(3), doneAt: at(2) }], settings, time(3))).toMatchObject({ kind: 'VE', dueAt: at(4) })
  expect(nextDue(entry, [rom(), reminder, event('DELIVERED', 2)], settings, time(3))).toBeUndefined()
})

it('sorts red, then amber, then soonest due, without mutating inputs', () => {
  const cases = ['later', 'early', 'amber', 'red'].map(id => clinicalCase({ id }))
  const events = [
    event('REMINDER', 0, { caseId: 'later', label: 'Later', dueAt: at(6) }),
    event('REMINDER', 0, { caseId: 'early', label: 'Earlier', dueAt: at(5) }),
    event('REMINDER', 0, { caseId: 'amber', label: 'Soon', dueAt: at(1) }),
    event('MATERNAL_PYREXIA', 0, { caseId: 'red' }),
  ]
  expect(sortCases(cases, events, settings, [], time(0.9)).map(value => value.id)).toEqual(['red', 'amber', 'early', 'later'])
  expect(cases.map(value => value.id)).toEqual(['later', 'early', 'amber', 'red'])
})
