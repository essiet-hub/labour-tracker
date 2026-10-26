import { firstStageProgress, secondStageProgress, shouldOfferEstablishedLabour } from './progress'
import { defaultSettings } from '../config/defaults'
import { at, clinicalCase, event, rom, start, time, ve } from '../test/clinicalFixtures'

const settings = defaultSettings()
const established = event('ESTABLISHED_LABOUR', 0)

it('offers established labour only for VE ≥4 cm without an existing established event', () => {
  expect(shouldOfferEstablishedLabour(ve(0, 3), [])).toBe(false)
  expect(shouldOfferEstablishedLabour(ve(0, 4), [])).toBe(true)
  expect(shouldOfferEstablishedLabour(ve(0, 4), [established])).toBe(false)
  expect(shouldOfferEstablishedLabour(rom(), [])).toBe(false)
})

it('never flags latent slow progress and schedules 4-hour VEs only after ROM or a VE', () => {
  expect(firstStageProgress([], settings, time(10)).nextVeDueAt).toBeUndefined()
  expect(firstStageProgress([rom()], settings, time(3)).nextVeDueAt).toBe(at(4))
  const progress = firstStageProgress([ve(0, 1), ve(4, 1)], settings, time(5))
  expect(progress.phase).toBe('latent')
  expect(progress.delay).toBeUndefined()
  expect(progress.nextVeDueAt).toBe(at(8))
})

it('schedules active VEs at 2 hours and ignores VEs before established labour', () => {
  const progress = firstStageProgress([ve(-2, 1), established, ve(0, 4)], settings, time(1))
  expect(progress.activeVes.map(entry => entry.at)).toEqual([at(0)])
  expect(progress.delay).toBeUndefined()
  expect(progress.nextVeDueAt).toBe(at(2))
})

it.each([[2, 6, false], [2, 5, true], [3, 7, false], [3, 6, true]] as const)('assesses %sh progress to %scm (suspected=%s)', (hours, cm, suspected) => {
  expect(!!firstStageProgress([established, ve(0, 4), ve(hours, cm)], settings, time(hours)).delay).toBe(suspected)
})

it('uses the latest VE at least 1.5 hours earlier for close-spaced VEs', () => {
  expect(firstStageProgress([established, ve(0, 4), ve(1, 4)], settings, time(1)).delay).toBeUndefined()
  expect(firstStageProgress([established, ve(0, 4), ve(1, 5), ve(2, 6)], settings, time(2)).delay).toBeUndefined()
  expect(firstStageProgress([established, ve(0, 4), ve(1, 5), ve(2, 5)], settings, time(2)).delay?.level).toBe('amber')
})

it('confirms delay when the next VE progresses <1 cm, even if closely spaced', () => {
  const progress = firstStageProgress([established, ve(0, 4), ve(2, 5), ve(2.5, 5)], settings, time(2.5))
  expect(progress.delay?.level).toBe('red')
  expect(progress.segments.map(segment => segment.level)).toEqual(['amber', 'red'])
})

it('does not confirm delay with ≥1cm progress at reassessment', () => {
  expect(firstStageProgress([established, ve(0, 4), ve(2, 5), ve(3, 6)], settings, time(3)).delay?.level).toBe('amber')
  expect(firstStageProgress([established, ve(0, 4), ve(2, 5), ve(4, 7)], settings, time(4)).delay).toBeUndefined()
})

it('caps expected progress at 10cm and stops first-stage VE due after full dilatation/pushing/delivery', () => {
  expect(firstStageProgress([established, ve(0, 9), ve(2, 10)], settings, time(2)).delay).toBeUndefined()
  for (const type of ['FULL_DILATATION', 'ACTIVE_PUSHING', 'DELIVERED'] as const) {
    const progress = firstStageProgress([established, ve(0, 4), ve(2, 5), event(type, 3)], settings, time(5))
    expect(progress.nextVeDueAt).toBeUndefined()
    expect(progress.delay).toBeUndefined()
  }
})

it('only a start after a delay extends the next VE; rate changes and earlier starts never do', () => {
  const base = [established, ve(0, 4), ve(2, 5)]
  expect(firstStageProgress([...base, start(1)], settings, time(3)).nextVeDueAt).toBe(at(4))
  expect(firstStageProgress([...base, event('OXYTOCIN_RATE', 3, { rateMlPerHr: 3 })], settings, time(3)).nextVeDueAt).toBe(at(4))
})

it('anchors the 4-hour interval to the last VE, and applies it only to the next VE', () => {
  const base = [established, ve(0, 4), ve(2, 5), start(3)]
  expect(firstStageProgress(base, settings, time(3)).nextVeDueAt).toBe(at(6))
  expect(firstStageProgress([...base, event('OXYTOCIN_RATE', 4, { rateMlPerHr: 4 })], settings, time(4)).nextVeDueAt).toBe(at(6))
  expect(firstStageProgress([...base, ve(6, 6)], settings, time(6)).nextVeDueAt).toBe(at(8))
})

it('reassesses ≥1cm progress against 1cm/hour, allowing a new suspected delay', () => {
  const result = firstStageProgress([established, ve(0, 4), ve(2, 5), ve(4, 6)], settings, time(4))
  expect(result.delay?.level).toBe('amber')
  expect(result.delay?.at).toBe(at(4))
})

it('reorders edited timestamps without mutating the input', () => {
  const events = [ve(4, 8), established, ve(0, 4), ve(2, 6)]
  const before = structuredClone(events)
  expect(firstStageProgress(events, settings, time(4)).delay).toBeUndefined()
  expect(events).toEqual(before)
  const edited = events.map(entry => entry.type === 'VE' && entry.dilatationCm === 6 ? { ...entry, at: at(3) } : entry)
  expect(firstStageProgress(edited, settings, time(3)).delay?.level).toBe('amber')
})

it.each([[0, 60, 120], [2, 30, 60]])('uses active pushing thresholds for para %s', (para, suspect, delay) => {
  const entry = clinicalCase({ para })
  const events = [event('FULL_DILATATION', 0), event('ACTIVE_PUSHING', 1)]
  expect(secondStageProgress(entry, [event('FULL_DILATATION', 0)], settings, time(10)).level).toBeUndefined()
  expect(secondStageProgress(entry, events, settings, time(1) + suspect * 60_000 - 1).level).toBeUndefined()
  expect(secondStageProgress(entry, events, settings, time(1) + suspect * 60_000).level).toBe('amber')
  expect(secondStageProgress(entry, events, settings, time(1) + delay * 60_000).level).toBe('red')
})

it('freezes passive time at pushing and active time at delivery', () => {
  const result = secondStageProgress(clinicalCase(), [event('FULL_DILATATION', 0), event('ACTIVE_PUSHING', 1), event('DELIVERED', 2)], settings, time(5))
  expect(result.passiveMinutes).toBe(60)
  expect(result.activeMinutes).toBe(60)
  expect(result.level).toBeUndefined()
})

it('honours configured progress rates and VE intervals', () => {
  const custom = { ...settings, activeMinCmPerHour: 0.5, activeVeIntervalHours: 3, latentVeIntervalHours: 5, veAfterOxytocinForDelayHours: 6 }
  expect(firstStageProgress([established, ve(0, 4), ve(2, 5)], custom, time(2)).delay).toBeUndefined()
  expect(firstStageProgress([established, ve(0, 4)], custom, time(1)).nextVeDueAt).toBe(at(3))
  expect(firstStageProgress([rom()], custom, time(1)).nextVeDueAt).toBe(at(5))
  expect(firstStageProgress([established, ve(0, 4), ve(2, 4), start(3)], custom, time(3)).nextVeDueAt).toBe(at(8))
})

it('clears a confirmed delay after adequate progress and ignores future VEs', () => {
  const base = [established, ve(0, 4), ve(2, 5), ve(4, 5), ve(6, 7)]
  expect(firstStageProgress(base, settings, time(4)).delay?.level).toBe('red')
  expect(firstStageProgress(base, settings, time(6)).delay).toBeUndefined()
})
