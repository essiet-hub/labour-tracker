import { useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export function UpdateBanner() {
  const [updating, setUpdating] = useState(false)
  const [failed, setFailed] = useState(false)
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()

  if (!needRefresh) return null

  async function update() {
    setUpdating(true)
    setFailed(false)
    try {
      await updateServiceWorker(true)
    } catch {
      setFailed(true)
      setUpdating(false)
    }
  }

  return (
    <aside className="update-banner" aria-label="App update">
      <button type="button" disabled={updating} onClick={() => void update()}>
        {updating ? 'Updating…' : 'New version available – tap to update'}
      </button>
      {failed && <p role="alert">Update could not be loaded. Try again when connected.</p>}
    </aside>
  )
}
