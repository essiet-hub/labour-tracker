import { useEffect, useState } from 'react'
import { hongKongDate } from '../logic/dates'

export function useToday() {
  const [today, setToday] = useState(hongKongDate)
  useEffect(() => {
    const refresh = () => setToday(hongKongDate())
    const timer = window.setInterval(refresh, 30_000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])
  return today
}
