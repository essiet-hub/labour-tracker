import { render, screen } from '@testing-library/react'
import { CaseSummary } from './CaseSummary'
import type { Case } from '../logic/types'

const entry: Case = {
  id: 'summary', createdAt: '', updatedAt: '', ward: '7F', bed: '12', initials: 'AB',
  gravida: 2, para: 1, edd: '2026-10-29', weightKg: 65, heightCm: 165,
  labourType: 'IOL', iolIndication: 'GDM + LGA', historyFlags: ['GDM', 'LGA', 'Antepartum haemorrhage'],
  usg: { date: '', gestationAtScan: '36+2', efwGrams: 3200, acCentile: 96, presentation: 'Cephalic', placenta: 'Anterior' },
}

it('shows onset, current gestation, BMI and scan gestation without EDC or retired labels', () => {
  const view = render(<CaseSummary entry={entry} today="2026-10-26" full />)
  expect(screen.getByText('IOL · GDM + LGA')).toBeInTheDocument()
  expect(screen.getByText('Gestation today · 39+4 · Maternal BMI · 23.9')).toBeInTheDocument()
  expect(screen.getByText('USG at 36+2 weeks: EFW 3200 g · AC centile 96')).toBeInTheDocument()
  expect(view.container).not.toHaveTextContent(/EDC|EDD|Cephalic|Anterior|Antepartum haemorrhage/)
  view.rerender(<CaseSummary entry={{ ...entry, labourType: 'Spontaneous' }} today="2026-10-27" full />)
  expect(screen.getByText('Spontaneous onset of labour')).toBeInTheDocument()
  expect(screen.getByText(/Gestation today · 39\+5/)).toBeInTheDocument()
  expect(screen.getByText(/USG at 36\+2 weeks/)).toBeInTheDocument()
})
