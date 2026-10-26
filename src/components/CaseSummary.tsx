import { bmi } from '../logic/bmi'
import { gestation } from '../logic/gestation'
import { hongKongDateTime } from '../logic/dates'
import { historyFlags } from '../config/picklists'
import type { Case } from '../logic/types'

export function VbacBadge({ historyFlags, banner = false }: { historyFlags: Case['historyFlags']; banner?: boolean }) {
  if (!historyFlags.includes('Previous CS')) return null
  return <span className={banner ? 'vbac-banner' : 'vbac-badge'}>VBAC{banner && ' · Previous CS'}</span>
}

export function CaseMeasurements({ entry, today }: { entry: Case; today: string }) {
  const ga = gestation(entry.edd, today)
  return <div className="case-measurements">
    <span>G{entry.gravida}P{entry.para}</span>
    <span>Gestation {ga ?? '—'}</span>
    <span>BMI {bmi(entry.weightKg, entry.heightCm) ?? '—'}</span>
  </div>
}

export function CaseSummary({ entry, today, full = false }: { entry: Case; today: string; full?: boolean }) {
  const available = new Set<string>(historyFlags)
  const currentFlags = entry.historyFlags.filter(flag => available.has(flag))
  const flags = full ? currentFlags : currentFlags.slice(0, 3)
  const scanGa = entry.usg?.gestationAtScan ?? (entry.usg ? gestation(entry.edd, entry.usg.date) : null)
  return <div className="stack summary-content">
    <p>{entry.labourType === 'Spontaneous' ? 'Spontaneous onset of labour' : `IOL${entry.iolIndication ? ` · ${entry.iolIndication === 'Other' ? entry.iolIndicationOther : entry.iolIndication}` : ' · Indication not recorded'}`}</p>
    {full && <p>Gestation today · {gestation(entry.edd, today) ?? '—'} · Maternal BMI · {bmi(entry.weightKg, entry.heightCm) ?? '—'}</p>}
    {!!flags.length && <div className="chips" aria-label="Antenatal history">
      {flags.map(flag => <span className="chip" key={flag}>{flag}</span>)}
      {!full && currentFlags.length > 3 && <span className="chip">+{currentFlags.length - 3}</span>}
    </div>}
    {entry.ward === '7F' && entry.plannedIolAt && <p>Planned IOL · {hongKongDateTime(entry.plannedIolAt)}</p>}
    {entry.usg && <p>USG at {scanGa ?? '—'} weeks: {entry.usg.efwGrams !== undefined ? `EFW ${entry.usg.efwGrams} g` : 'EFW not recorded'}{entry.usg.efwCentile !== undefined && ` · EFW centile ${entry.usg.efwCentile}`}{entry.usg.acCentile !== undefined && ` · AC centile ${entry.usg.acCentile}`}</p>}
    {full && <>
      {entry.age !== undefined && <p>Age · {entry.age} years</p>}
      {(entry.weightKg !== undefined || entry.heightCm !== undefined) && <p>Weight · {entry.weightKg ?? '—'} kg · Height · {entry.heightCm ?? '—'} cm</p>}
      {entry.historyNote && <p className="preserve-lines">History note · {entry.historyNote}</p>}
      {entry.usg?.date && <p>Scan date · {entry.usg.date}</p>}
      {entry.usg?.liquor && <p>{entry.usg.liquor.method} {entry.usg.liquor.valueCm} cm</p>}
      {entry.notes && <p className="preserve-lines">Notes · {entry.notes}</p>}
    </>}
  </div>
}
