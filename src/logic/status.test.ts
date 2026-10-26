import { deriveStatus } from './status'
import { clinicalCase, event, rom, start, time } from '../test/clinicalFixtures'

it('derives every status in the required precedence, regardless of input order', () => {
  const entry = clinicalCase({ ward: '7F' })
  expect(deriveStatus(entry, [], time(20))).toBe('Awaiting IOL')
  expect(deriveStatus(clinicalCase({ labourType: 'Spontaneous' }), [], time(20))).toBe('Admitted')
  const events = [event('IOL_STARTED', 1, { ward: '7E', bed: '12' }), rom(2), start(3), event('ESTABLISHED_LABOUR', 4), event('FULL_DILATATION', 5), event('ACTIVE_PUSHING', 6), event('DELIVERED', 7)]
  const statuses = ['IOL started', 'Post-ROM', 'On oxytocin', 'Established labour', 'Second stage – passive', 'Second stage – active', 'Delivered']
  statuses.forEach((status, index) => {
    expect(deriveStatus(entry, events.slice(0, index + 1).reverse(), time(20))).toBe(status)
  })
})

it('uses the latest oxytocin timestamp and ignores future/other-case events', () => {
  const entry = clinicalCase()
  const events = [event('OXYTOCIN_STOP', 3), start(1), event('OXYTOCIN_RATE', 2, { rateMlPerHr: 2 })]
  expect(deriveStatus(entry, events, time(4))).toBe('Admitted')
  expect(deriveStatus(entry, events, time(2))).toBe('On oxytocin')
  expect(deriveStatus(entry, [event('DELIVERED', 1, { caseId: 'other' }), event('DELIVERED', 10)], time(4))).toBe('Admitted')
})
