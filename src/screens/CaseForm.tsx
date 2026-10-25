import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { historyFlags, iolIndications, placentas, presentations, wards } from '../config/picklists'
import { VbacBadge } from '../components/CaseSummary'
import { createCase, updateCase } from '../db/cases'
import { bmi } from '../logic/bmi'
import { validateCase } from '../logic/caseValidation'
import { toHongKongInput } from '../logic/dates'
import { gestation } from '../logic/gestation'
import type { Case, CaseInput, Ward } from '../logic/types'

interface Draft {
  ward: Ward
  bed: string
  initials: string
  age: string
  gravida: string
  para: string
  edd: string
  weightKg: string
  heightCm: string
  labourType: Case['labourType']
  iolIndication: NonNullable<Case['iolIndication']> | ''
  iolIndicationOther: string
  plannedIolAt: string
  historyFlags: Case['historyFlags']
  historyNote: string
  usgDate: string
  efwGrams: string
  efwCentile: string
  presentation: NonNullable<Case['usg']>['presentation'] | ''
  liquorMethod: 'AFI' | 'DVP'
  liquorValue: string
  placenta: NonNullable<Case['usg']>['placenta'] | ''
  notes: string
}

const optionalNumber = (value: string) => value.trim() === '' ? undefined : Number(value)

function initialDraft(entry?: Case): Draft {
  return {
    ward: entry?.ward ?? '7F', bed: entry?.bed ?? '', initials: entry?.initials ?? '',
    age: entry?.age?.toString() ?? '', gravida: entry?.gravida.toString() ?? '1', para: entry?.para.toString() ?? '0',
    edd: entry?.edd ?? '', weightKg: entry?.weightKg?.toString() ?? '', heightCm: entry?.heightCm?.toString() ?? '',
    labourType: entry?.labourType ?? 'IOL', iolIndication: entry?.iolIndication ?? '',
    iolIndicationOther: entry?.iolIndicationOther ?? '', plannedIolAt: toHongKongInput(entry?.plannedIolAt),
    historyFlags: entry?.historyFlags ?? [], historyNote: entry?.historyNote ?? '',
    usgDate: entry?.usg?.date ?? '', efwGrams: entry?.usg?.efwGrams?.toString() ?? '',
    efwCentile: entry?.usg?.efwCentile?.toString() ?? '', presentation: entry?.usg?.presentation ?? '',
    liquorMethod: entry?.usg?.liquor?.method ?? 'AFI', liquorValue: entry?.usg?.liquor?.valueCm.toString() ?? '',
    placenta: entry?.usg?.placenta ?? '', notes: entry?.notes ?? '',
  }
}

function toInput(draft: Draft): CaseInput {
  const hasUsg = [draft.usgDate, draft.efwGrams, draft.efwCentile, draft.presentation, draft.liquorValue, draft.placenta].some(Boolean)
  const planned = draft.plannedIolAt ? Date.parse(`${draft.plannedIolAt}+08:00`) : NaN
  return {
    ward: draft.ward, bed: draft.bed, initials: draft.initials,
    age: optionalNumber(draft.age), gravida: draft.gravida === '' ? NaN : Number(draft.gravida), para: draft.para === '' ? NaN : Number(draft.para),
    edd: draft.edd, weightKg: optionalNumber(draft.weightKg), heightCm: optionalNumber(draft.heightCm),
    labourType: draft.labourType,
    iolIndication: draft.labourType === 'IOL' ? draft.iolIndication || undefined : undefined,
    iolIndicationOther: draft.labourType === 'IOL' && draft.iolIndication === 'Other' ? draft.iolIndicationOther.trim() || undefined : undefined,
    plannedIolAt: draft.labourType === 'IOL' && draft.ward === '7F' && draft.plannedIolAt ? (Number.isFinite(planned) ? new Date(planned).toISOString() : draft.plannedIolAt) : undefined,
    historyFlags: draft.historyFlags, historyNote: draft.historyNote.trim() || undefined,
    usg: hasUsg ? {
      date: draft.usgDate, efwGrams: optionalNumber(draft.efwGrams), efwCentile: optionalNumber(draft.efwCentile),
      presentation: draft.presentation || undefined, placenta: draft.placenta || undefined,
      liquor: draft.liquorValue !== '' ? { method: draft.liquorMethod, valueCm: Number(draft.liquorValue) } : undefined,
    } : undefined,
    notes: draft.notes.trim() || undefined,
  }
}

export function CaseForm({ entry, today, onSaved, onCancel, onDirty }: {
  entry?: Case; today: string; onSaved: (entry: Case) => void; onCancel: () => void; onDirty: (dirty: boolean) => void
}) {
  const [draft, setDraft] = useState(() => initialDraft(entry))
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saveError, setSaveError] = useState('')
  const errorSummary = useRef<HTMLDivElement>(null)
  const input = toInput(draft)
  const { errors, warnings } = validateCase(input)
  const ga = gestation(draft.edd, today)
  const scanGa = gestation(draft.edd, draft.usgDate)

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft(previous => ({ ...previous, [key]: value }))
    onDirty(true)
    setSaveError('')
  }

  function changeLabourType(value: Draft['labourType']) {
    setDraft(previous => ({ ...previous, labourType: value, ward: value === 'Spontaneous' && previous.ward === '7F' ? '7E' : previous.ward }))
    onDirty(true)
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    if (Object.keys(errors).length) {
      // Focus after React renders the summary containing the validation errors.
      window.requestAnimationFrame(() => errorSummary.current?.focus())
      return
    }
    setBusy(true)
    try {
      const saved = entry ? await updateCase(entry.id, input) : await createCase(input)
      onDirty(false)
      onSaved(saved)
    } catch {
      setSaveError('This case could not be saved. Your entries are still here; please try again.')
    } finally { setBusy(false) }
  }

  function textField(key: 'bed' | 'initials' | 'edd' | 'usgDate' | 'plannedIolAt', label: string, type = 'text') {
    const error = submitted ? errors[key] : undefined
    return <div className="field">
      <label htmlFor={`case-${key}`}>{label}</label>
      <input id={`case-${key}`} type={type} value={draft[key]} required={['bed', 'initials', 'edd'].includes(key)}
        autoComplete="off" autoCapitalize={key === 'initials' ? 'characters' : undefined}
        aria-invalid={!!error} aria-describedby={error ? `error-${key}` : undefined}
        onChange={event => set(key, key === 'initials' ? event.target.value.toUpperCase() : event.target.value)} />
      {error && <span id={`error-${key}`} className="error">{error}</span>}
    </div>
  }

  function numberField(key: 'age' | 'gravida' | 'para' | 'weightKg' | 'heightCm' | 'efwGrams' | 'efwCentile' | 'liquorValue', label: string, integer = false) {
    const error = submitted ? errors[key] : undefined
    return <div className="field">
      <label htmlFor={`case-${key}`}>{label}</label>
      <input id={`case-${key}`} type="number" inputMode={integer ? 'numeric' : 'decimal'} step={integer ? '1' : 'any'}
        required={key === 'gravida' || key === 'para'} value={draft[key]}
        aria-invalid={!!error} aria-describedby={error ? `error-${key}` : undefined}
        onChange={event => set(key, event.target.value)} />
      {error && <span id={`error-${key}`} className="error">{error}</span>}
    </div>
  }

  return <form className="case-form stack" noValidate onSubmit={event => void save(event)}>
    <p className="muted">Bed number and initials only. Do not enter names or hospital identifiers in notes.</p>
    {submitted && Object.keys(errors).length > 0 && <div className="notice error" role="alert" ref={errorSummary} tabIndex={-1}>
      <p>Please check the following:</p><ul>{Object.entries(errors).map(([key, message]) => <li key={key}><a href={`#case-${key}`}>{message}</a></li>)}</ul>
    </div>}
    <fieldset disabled={busy}>
      <legend>Location</legend>
      <div className="segmented" role="group" aria-label="Ward">
        {[...wards].reverse().filter(ward => draft.labourType === 'IOL' || ward.code !== '7F').map(ward => <button id={`case-ward-${ward.code}`} key={ward.code} type="button" aria-pressed={draft.ward === ward.code} onClick={() => set('ward', ward.code)}>{ward.code}</button>)}
      </div>
      <div className="field-row">{textField('bed', 'Bed number *')}{textField('initials', 'Initials *')}</div>
    </fieldset>
    <fieldset disabled={busy}>
      <legend>Maternal details</legend>
      {numberField('age', 'Age (years)', true)}
      <div className="field-row">{numberField('gravida', 'Gravida *', true)}{numberField('para', 'Para *', true)}</div>
      {textField('edd', 'EDD *', 'date')}
      <p className="derived" aria-live="polite">Gestation today · <strong>{ga ?? '—'}</strong></p>
      <div className="field-row">{numberField('weightKg', 'Weight (kg)')}{numberField('heightCm', 'Height (cm)')}</div>
      <p className="derived" aria-live="polite">BMI · <strong>{bmi(input.weightKg, input.heightCm) ?? '—'}</strong></p>
    </fieldset>
    <fieldset disabled={busy}>
      <legend>Labour type</legend>
      <div className="segmented" role="group" aria-label="Labour type">
        {(['IOL', 'Spontaneous'] as const).map(value => <button key={value} type="button" aria-pressed={draft.labourType === value} onClick={() => changeLabourType(value)}>{value}</button>)}
      </div>
      {draft.labourType === 'IOL' && <>
        <label className="field"><span>IOL indication</span><select value={draft.iolIndication} onChange={event => set('iolIndication', event.target.value as Draft['iolIndication'])}>
          <option value="">Select indication</option>{iolIndications.map(value => <option key={value}>{value}</option>)}
        </select></label>
        {draft.iolIndication === 'Other' && <label className="field"><span>Other IOL indication *</span><input id="case-iolIndicationOther" value={draft.iolIndicationOther} onChange={event => set('iolIndicationOther', event.target.value)} aria-invalid={submitted && !!errors.iolIndicationOther} />
          {submitted && errors.iolIndicationOther && <span className="error">{errors.iolIndicationOther}</span>}
        </label>}
        {draft.ward === '7F' && <>{textField('plannedIolAt', 'Planned IOL date and time (Hong Kong)', 'datetime-local')}<p className="muted">All times are Hong Kong time (24-hour).</p></>}
      </>}
    </fieldset>
    <fieldset disabled={busy}>
      <legend>Antenatal history</legend>
      <div className="chips history-picker">{historyFlags.map(flag => <button key={flag} type="button" aria-pressed={draft.historyFlags.includes(flag)} onClick={() => set('historyFlags', draft.historyFlags.includes(flag) ? draft.historyFlags.filter(value => value !== flag) : [...draft.historyFlags, flag])}>{flag}</button>)}</div>
      <VbacBadge historyFlags={draft.historyFlags} />
      <label className="field"><span>History note</span><textarea value={draft.historyNote} onChange={event => set('historyNote', event.target.value)} rows={2} /></label>
    </fieldset>
    <details className="usg-section" open={entry?.usg ? true : undefined}>
      <summary>Latest ultrasound</summary>
      <fieldset disabled={busy}>
        <legend className="sr-only">Latest ultrasound details</legend>
        {textField('usgDate', 'Ultrasound date', 'date')}
        <p className="derived" aria-live="polite">Gestation at scan · <strong>{scanGa ?? '—'}</strong></p>
        <div className="field-row">{numberField('efwGrams', 'EFW (g)', true)}{numberField('efwCentile', 'EFW centile')}</div>
        <label className="field"><span>Presentation</span><select value={draft.presentation} onChange={event => set('presentation', event.target.value as Draft['presentation'])}><option value="">Not recorded</option>{presentations.map(value => <option key={value}>{value}</option>)}</select></label>
        <div className="field-row">
          <label className="field"><span>Liquor measure</span><select value={draft.liquorMethod} onChange={event => set('liquorMethod', event.target.value as Draft['liquorMethod'])}><option>AFI</option><option>DVP</option></select></label>
          {numberField('liquorValue', 'Liquor (cm)')}
        </div>
        <label className="field"><span>Placenta</span><select value={draft.placenta} onChange={event => set('placenta', event.target.value as Draft['placenta'])}><option value="">Not recorded</option>{placentas.map(value => <option key={value}>{value}</option>)}</select></label>
      </fieldset>
    </details>
    <label className="field"><span>Notes</span><textarea disabled={busy} value={draft.notes} onChange={event => set('notes', event.target.value)} rows={3} /></label>
    {warnings.length > 0 && <aside className="notice warning" aria-label="Please check" aria-live="polite"><p>Please check (you can still save):</p><ul>{warnings.map(warning => <li key={warning}>{warning}</li>)}</ul></aside>}
    <div className="save-bar">
      {saveError && <p className="error" role="alert">{saveError}</p>}
      <div className="actions"><button type="button" disabled={busy} onClick={onCancel}>Cancel</button><button type="submit" disabled={busy} className="primary">{busy ? 'Saving…' : 'Save case'}</button></div>
    </div>
  </form>
}
