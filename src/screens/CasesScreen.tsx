import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { wards } from '../config/picklists'
import { CaseMeasurements, CaseSummary, VbacBadge } from '../components/CaseSummary'
import { UpdateBanner } from '../components/UpdateBanner'
import { db } from '../db/db'
import { deleteCase } from '../db/cases'
import { useToday } from '../hooks/useToday'
import type { Case } from '../logic/types'
import { CaseForm } from './CaseForm'

type View = { kind: 'home' | 'new' } | { kind: 'detail' | 'edit'; id: string }

export function CasesScreen({ onSettings }: { onSettings: () => void }) {
  const [view, setView] = useState<View>({ kind: 'home' })
  const [dirty, setDirty] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const heading = useRef<HTMLHeadingElement>(null)
  const today = useToday()
  const data = useLiveQuery(async () => {
    try { return { entries: await db.cases.toArray(), error: '' } }
    catch { return { entries: [] as Case[], error: 'Cases could not be loaded. Reload the app to try again.' } }
  }, [])
  const entries = data?.entries ?? []
  const selected = 'id' in view ? entries.find(entry => entry.id === view.id) : undefined

  useEffect(() => { heading.current?.focus() }, [view])

  function navigate(next: View) {
    if (dirty && !window.confirm('Discard unsaved case changes?')) return
    setDirty(false)
    setConfirmDelete(false)
    setError('')
    setView(next)
  }

  async function remove() {
    if (!selected) return
    setDeleting(true)
    try {
      await deleteCase(selected.id)
      setConfirmDelete(false)
      setView({ kind: 'home' })
    } catch { setError('This case could not be deleted. Please try again.') }
    finally { setDeleting(false) }
  }

  const title = view.kind === 'home' ? 'Labour Case Tracker' : view.kind === 'new' ? 'New case' : view.kind === 'edit' ? 'Edit case' : selected ? `Bed ${selected.bed} · ${selected.initials}` : 'Case details'

  return <>
    <header className="app-header case-header">
      <div className="stack header-copy">
        <h1 ref={heading} tabIndex={-1}>{title}</h1>
        {view.kind === 'detail' && selected && <>
          <span className="muted">{wards.find(ward => ward.code === selected.ward)?.label}</span>
          <CaseMeasurements entry={selected} today={today} />
        </>}
      </div>
      {view.kind === 'home' ? <button type="button" aria-label="Settings" onClick={onSettings}><span aria-hidden="true">⚙</span></button> : <button type="button" disabled={deleting} onClick={() => navigate({ kind: 'home' })}>Home</button>}
    </header>
    <UpdateBanner />
    {data?.error && <p role="alert" className="error">{data.error}</p>}
    {!data && <p role="status">Loading cases…</p>}
    {data && view.kind === 'home' && <>
      <h2>My cases</h2>
      {entries.length === 0 && !data.error && <p className="empty-state">No cases yet. Add a case to start tracking.</p>}
      <div className="ward-list">
        {wards.map(ward => {
          const cases = entries.filter(entry => entry.ward === ward.code && !entry.deliveredAt).sort((a, b) => a.bed.localeCompare(b.bed, 'en-GB', { numeric: true }) || a.initials.localeCompare(b.initials))
          return <details key={ward.code} className="ward-section" open>
            <summary>{ward.label}<span className="case-count">{cases.length}<span className="sr-only"> cases</span></span></summary>
            {cases.length === 0 ? <p className="muted ward-empty">No cases in this ward.</p> : <ul className="case-list">{cases.map(entry => <li key={entry.id}>
              <button type="button" className="case-row" onClick={() => navigate({ kind: 'detail', id: entry.id })}>
                <span className="case-title">Bed {entry.bed} · {entry.initials} <VbacBadge historyFlags={entry.historyFlags} /></span>
                <CaseMeasurements entry={entry} today={today} />
                <CaseSummary entry={entry} today={today} />
              </button>
            </li>)}</ul>}
          </details>
        })}
      </div>
      <div className="new-case-bar"><button type="button" className="primary" onClick={() => navigate({ kind: 'new' })}>+ New case</button></div>
    </>}
    {view.kind === 'new' && <CaseForm today={today} onDirty={setDirty} onCancel={() => navigate({ kind: 'home' })} onSaved={entry => setView({ kind: 'detail', id: entry.id })} />}
    {view.kind === 'edit' && selected && <CaseForm key={selected.id} entry={selected} today={today} onDirty={setDirty} onCancel={() => navigate({ kind: 'detail', id: selected.id })} onSaved={entry => setView({ kind: 'detail', id: entry.id })} />}
    {view.kind === 'detail' && selected && <div className="stack">
      <VbacBadge historyFlags={selected.historyFlags} banner />
      <button type="button" className="summary-edit" aria-label="Edit case summary" onClick={() => navigate({ kind: 'edit', id: selected.id })}>
        <span className="summary-heading">Case summary <span className="muted">· Tap to edit</span></span>
        <CaseSummary entry={selected} today={today} full />
      </button>
      <p className="muted">Event recording, reminders and the progress chart will be added in later build phases.</p>
      {error && <p className="error" role="alert">{error}</p>}
      {confirmDelete ? <section className="delete-confirmation stack" aria-labelledby="delete-title">
        <h2 id="delete-title">Delete Bed {selected.bed} · {selected.initials}?</h2>
        <p>This permanently deletes this case and all its events and acknowledgements.</p>
        <div className="actions"><button type="button" disabled={deleting} onClick={() => setConfirmDelete(false)}>Keep case</button><button type="button" disabled={deleting} className="danger" onClick={() => void remove()}>{deleting ? 'Deleting…' : 'Confirm delete'}</button></div>
      </section> : <button type="button" className="danger" onClick={() => setConfirmDelete(true)}>Delete case</button>}
    </div>}
    {data && 'id' in view && !selected && <p role="status">This case is unavailable. Return Home to see the current case list.</p>}
  </>
}
