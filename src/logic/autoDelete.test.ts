import { casesToAutoDelete } from './autoDelete'
import { at, clinicalCase, time } from '../test/clinicalFixtures'

it.each([24, 48, 72] as const)('deletes only delivered cases at the %s-hour retention boundary', hours => {
  const delivered = clinicalCase({ deliveredAt: at(0) })
  expect(casesToAutoDelete([delivered, clinicalCase({ id: 'active' })], hours, time(hours) - 1)).toEqual([])
  expect(casesToAutoDelete([delivered, clinicalCase({ id: 'active' })], hours, time(hours))).toEqual(['case'])
  expect(casesToAutoDelete([clinicalCase({ deliveredAt: 'invalid' }), clinicalCase({ deliveredAt: at(100) })], hours, time(hours))).toEqual([])
})
