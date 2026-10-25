import { render, screen } from '@testing-library/react'
import App from './App.tsx'

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({ needRefresh: [false], updateServiceWorker: vi.fn() }),
}))

describe('App', () => {
  it('shows the app name', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Labour Case Tracker' })).toBeInTheDocument()
  })
})
