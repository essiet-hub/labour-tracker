import { useState } from 'react'
import type { FormEvent } from 'react'
import { disclaimer, storageNote } from '../config/defaults'
import { eraseAllData, resetSettings, saveSettings } from '../db/settings'
import type { Settings } from '../logic/types'

const firstStageFields = [
  ['latentVeIntervalHours', 'Latent phase: VE interval (hours)'],
  ['activeVeIntervalHours', 'Active phase: VE interval (hours)'],
  ['activeMinCmPerHour', 'Active phase: expected progress (cm/hour)'],
  ['latentMaxHoursAfterRom', 'ROM without active phase alert (hours)'],
  ['confirmedDelayMinCm', 'Progress to avoid confirmed delay (cm)'],
  ['veAfterOxytocinForDelayHours', 'VE after oxytocin started for delay (hours)'],
] as const

const secondStageFields = [
  ['nullipSuspectMin', 'Para 0: suspected delay (minutes)'],
  ['nullipDelayMin', 'Para 0: delay (minutes)'],
  ['parousSuspectMin', 'Para ≥ 1: suspected delay (minutes)'],
  ['parousDelayMin', 'Para ≥ 1: delay (minutes)'],
] as const

function NumberField({ name, label, value, step = 'any', min = '0.01' }: {
  name: string; label: string; value: number; step?: string; min?: string
}) {
  return <label className="field">
    <span>{label}</span>
    <input name={name} type="number" inputMode="decimal" required min={min} step={step} defaultValue={value} />
  </label>
}

export function SettingsScreen({ settings, onSaved, onErased, onDirty }: {
  settings: Settings
  onSaved: (settings: Settings) => void
  onErased: () => void
  onDirty: (dirty: boolean) => void
}) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [formKey, setFormKey] = useState(0)

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const number = (key: string) => Number(values.get(key))
    const romText = String(values.get('romAlertHours') ?? '')
    const romAlertHours = romText.split(',').map(value => value.trim() === '' ? NaN : Number(value))
    if (romAlertHours.length < 2 || romAlertHours.some((value, index) => !Number.isFinite(value) || value <= 0 || value <= (romAlertHours[index - 1] ?? 0))) {
      setError('Enter at least two ROM thresholds in increasing order, separated by commas.')
      return
    }
    const next: Settings = {
      ...settings,
      ...Object.fromEntries(firstStageFields.map(([key]) => [key, number(key)])),
      romAlertHours,
      oxytocinAfterAromHours: number('oxytocinAfterAromHours'),
      tachysystolePer10: number('tachysystolePer10'),
      secondStage: {
        nullipSuspectMin: number('nullipSuspectMin'),
        nullipDelayMin: number('nullipDelayMin'),
        parousSuspectMin: number('parousSuspectMin'),
        parousDelayMin: number('parousDelayMin'),
      },
      autoDeleteHoursAfterDelivery: number('retention') as Settings['autoDeleteHoursAfterDelivery'],
      theme: String(values.get('theme')) as Settings['theme'],
      vibrateOnRedFlag: values.has('vibration'),
    }
    if (next.secondStage.nullipDelayMin <= next.secondStage.nullipSuspectMin || next.secondStage.parousDelayMin <= next.secondStage.parousSuspectMin) {
      setError('Second-stage delay thresholds must be later than suspected delay thresholds.')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await saveSettings(next)
      onSaved(next)
      onDirty(false)
      setMessage('Settings saved.')
    } catch {
      setError('Settings could not be saved. Keep this screen open and try again.')
    } finally { setBusy(false) }
  }

  async function reset() {
    setBusy(true)
    setError('')
    try {
      const defaults = await resetSettings()
      onSaved(defaults)
      onDirty(false)
      setFormKey(key => key + 1)
      setMessage('Default settings restored.')
    } catch { setError('Defaults could not be saved. Try again.') }
    finally { setBusy(false) }
  }

  async function erase() {
    setBusy(true)
    setError('')
    try {
      await eraseAllData(confirmation)
      onErased()
    } catch { setError('Data could not be erased. Try again.') }
    finally { setBusy(false) }
  }

  return <div className="stack">
    <p className="notice">Clinical values should match local protocol. Changes apply to all cases.</p>
    <form key={formKey} className="settings-form stack" onSubmit={event => void save(event)} onChange={() => { onDirty(true); setMessage('Unsaved changes.'); setError('') }}>
      <fieldset disabled={busy}>
        <legend>Appearance and storage</legend>
        <label className="field"><span>Theme</span>
          <select name="theme" defaultValue={settings.theme}>
            <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
          </select>
        </label>
        <label className="check-field"><input name="vibration" type="checkbox" defaultChecked={settings.vibrateOnRedFlag} />Vibrate on a new red flag</label>
        <p className="muted">Only while the app is visible. iPhone does not support vibration.</p>
        <label className="field"><span>Delete cases after delivery</span>
          <select name="retention" defaultValue={settings.autoDeleteHoursAfterDelivery}>
            <option value="24">24 hours</option><option value="48">48 hours</option><option value="72">72 hours</option>
          </select>
        </label>
      </fieldset>
      <fieldset disabled={busy}>
        <legend>First stage</legend>
        {firstStageFields.map(([key, label]) => <NumberField key={key} name={key} label={label} value={settings[key]} />)}
      </fieldset>
      <fieldset disabled={busy}>
        <legend>Other flags</legend>
        <label className="field"><span>ROM alert thresholds (hours, separated by commas)</span>
          <input name="romAlertHours" required defaultValue={settings.romAlertHours.join(', ')} aria-describedby="rom-help" />
        </label>
        <p id="rom-help" className="muted">At least two increasing values. First threshold amber; later thresholds red.</p>
        <NumberField name="oxytocinAfterAromHours" label="IOL: oxytocin not started after AROM (hours)" value={settings.oxytocinAfterAromHours} />
        <NumberField name="tachysystolePer10" label="Tachysystole: more than this many contractions in 10 minutes" value={settings.tachysystolePer10} step="1" min="0" />
      </fieldset>
      <fieldset disabled={busy}>
        <legend>Active second stage</legend>
        <p className="muted">Timings apply to active pushing. Passive second stage has a timer only.</p>
        {secondStageFields.map(([key, label]) => <NumberField key={key} name={key} label={label} value={settings.secondStage[key]} step="1" min="1" />)}
      </fieldset>
      <div className="save-bar">
        <div aria-live="polite">{message && <p role="status">{message}</p>}</div>
        {error && <p role="alert" className="error">{error}</p>}
        <button type="submit" className="primary" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
      </div>
    </form>
    <button type="button" disabled={busy} onClick={() => void reset()}>Reset to defaults</button>
    <section aria-labelledby="about-heading">
      <h2 id="about-heading">About this app</h2>
      <p>{disclaimer}</p>
      <p className="notice">{storageNote}</p>
      <p className="muted">Installing to the home screen reduces the risk of browser storage eviction. Data does not transfer to another phone.</p>
      <p className="version">Version {__APP_VERSION__}</p>
    </section>
    <section aria-labelledby="erase-heading" className="stack">
      <h2 id="erase-heading">Erase all data</h2>
      <p>This permanently deletes all cases, events, acknowledgements and settings on this device.</p>
      <label className="field"><span>Type ERASE to confirm</span><input autoComplete="off" spellCheck={false} value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label>
      <button type="button" className="danger" disabled={busy || confirmation !== 'ERASE'} onClick={() => void erase()}>Erase all data</button>
    </section>
  </div>
}
