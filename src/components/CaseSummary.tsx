import { bmi } from '../logic/bmi'
import { gestation } from '../logic/gestation'
import { hongKongDateTime } from '../logic/dates'
import type { Case } from '../logic/types'

export function VbacBadge({ historyFlags, banner = false }: { historyFlags: Case['historyFlags']; banner?: boolean }) {
  if (!historyFlags.includes('Previous CS')) return null
  return <span className={banner ? 'vbac-banner' : 'vbac-badge'}>VBAC{banner && ' · Previous CS'}</span>
}

export function CaseMeasurements({ entry, today }: { entry: Case; today: string }) {
  const ga = gestation(entry.edd, today)
  const scanGa = entry.usg ? gestation(entry.edd, entry.usg.date) : null
  return <div className="case-measurements">
    <span>G{entry.gravida}P{entry.para}</span>
    <span>Gestation {ga ?? '—'}</span>
    <span>BMI {bmi(entry.weightKg, entry.heightCm) ?? '—'}</span>
    {entry.usg?.efwGrams !== undefined && <span>EFW {entry.usg.efwGrams} g{scanGa && ` at ${scanGa}`}</span>}
  </div>
}

export function CaseSummary({ entry, full = false }: { entry: Case; full?: boolean }) {
  const flags = full ? entry.historyFlags : entry.historyFlags.slice(0, 3)
  return <div className="stack summary-content">
    <p>{entry.labourType === 'Spontaneous' ? 'Spontaneous labour' : `IOL${entry.iolIndication ? ` · ${entry.iolIndication === 'Other' ? entry.iolIndicationOther : entry.iolIndication}` : ' · Indication not recorded'}`}</p>
    {!!flags.length && <div className="chips" aria-label="Antenatal history">
      {flags.map(flag => <span className="chip" key={flag}>{flag}</span>)}
      {!full && entry.historyFlags.length > 3 && <span className="chip">+{entry.historyFlags.length - 3}</span>}
    </div>}
    {entry.ward === '7F' && entry.plannedIolAt && <p>Planned IOL · {hongKongDateTime(entry.plannedIolAt)}</p>}
    {full && <>
      {entry.age !== undefined && <p>Age · {entry.age} years</p>}
      <p>EDD · {entry.edd}</p>
      {(entry.weightKg !== undefined || entry.heightCm !== undefined) && <p>Weight · {entry.weightKg ?? '—'} kg · Height · {entry.heightCm ?? '—'} cm</p>}
      {entry.historyNote && <p className="preserve-lines">History note · {entry.historyNote}</p>}
      {entry.usg && <div className="stack">
        <p><strong>Latest ultrasound</strong> · {entry.usg.date}</p>
        <p>{[
          entry.usg.efwGrams !== undefined ? `EFW ${entry.usg.efwGrams} g` : '',
          entry.usg.efwCentile !== undefined ? `Centile ${entry.usg.efwCentile}` : '',
          entry.usg.presentation,
          entry.usg.liquor ? `${entry.usg.liquor.method} ${entry.usg.liquor.valueCm} cm` : '',
          entry.usg.placenta ? `${entry.usg.placenta} placenta` : '',
        ].filter(Boolean).join(' · ') || 'No further ultrasound details recorded.'}</p>
      </div>}
      {entry.notes && <p className="preserve-lines">Notes · {entry.notes}</p>}
    </>}
  </div>
}
