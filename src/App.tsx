import { UpdateBanner } from './components/UpdateBanner'
import { useEffect, useRef, useState } from 'react'
import { disclaimer, defaultSettings, storageNote } from './config/defaults'
import { db } from './db/db'
import { acceptDisclaimer, loadSettings, requestPersistentStorage } from './db/settings'
import type { Settings } from './logic/types'
import { SettingsScreen } from './screens/SettingsScreen'
import { CasesScreen } from './screens/CasesScreen'

export default function App() {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [ready, setReady] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [screen, setScreen] = useState<'home' | 'settings'>('home')
  const [dirty, setDirty] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    let cancelled = false
    void requestPersistentStorage()
    void Promise.all([loadSettings(), db.meta.get('disclaimerAccepted')]).then(([stored, consent]) => {
      if (cancelled) return
      setSettings(stored)
      setAccepted(consent?.value === true)
      setReady(true)
    }).catch(() => {
      if (!cancelled) setError('On-device storage could not be opened. Check that browser storage is enabled, then reload.')
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme
  }, [settings.theme])

  useEffect(() => {
    if (ready && accepted) heading.current?.focus()
  }, [screen, ready, accepted])

  async function accept() {
    setBusy(true)
    setError('')
    try {
      await acceptDisclaimer()
      setAccepted(true)
    } catch { setError('Acceptance could not be saved on this device. Try again.') }
    finally { setBusy(false) }
  }

  function goHome() {
    if (dirty && !window.confirm('Discard unsaved settings changes?')) return
    setDirty(false)
    setScreen('home')
  }

  if (!ready) return <main className="app intro">
    <h1>Labour Case Tracker</h1>
    {error ? <><p role="alert" className="error">{error}</p><button onClick={() => window.location.reload()}>Reload</button></> : <p role="status">Opening on-device storage…</p>}
  </main>

  if (!accepted) return <main className="app intro stack">
    <h1>Labour Case Tracker</h1>
    <p>{disclaimer}</p>
    <p className="notice">{storageNote}</p>
    {error && <p role="alert" className="error">{error}</p>}
    <button className="primary" disabled={busy} onClick={() => void accept()}>I understand and accept</button>
    <p className="version">Version {__APP_VERSION__}</p>
    <UpdateBanner />
  </main>

  return <main className="app">
    {screen === 'home' ? <CasesScreen onSettings={() => setScreen('settings')} /> : <>
      <header className="app-header"><h1 ref={heading} tabIndex={-1}>Settings</h1><button onClick={goHome}>Home</button></header>
      <UpdateBanner />
      <SettingsScreen settings={settings} onSaved={setSettings} onDirty={setDirty} onErased={() => {
      setSettings(defaultSettings())
      setDirty(false)
      setScreen('home')
      setAccepted(false)
    }} /></>}
  </main>
}
