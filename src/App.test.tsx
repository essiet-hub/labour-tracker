import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.tsx'
import { db } from './db/db'
import { acceptDisclaimer, loadSettings } from './db/settings'

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({ needRefresh: [false], updateServiceWorker: vi.fn() }),
}))

describe('App', () => {
  beforeEach(async () => {
    for (const table of db.tables) await table.clear()
  })

  it('requires acceptance and keeps it after a restart', async () => {
    const user = userEvent.setup()
    const app = render(<App />)
    await user.click(await screen.findByRole('button', { name: 'I understand and accept' }))
    expect(await screen.findByRole('heading', { name: 'My cases' })).toBeInTheDocument()
    app.unmount()
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'My cases' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'I understand and accept' })).not.toBeInTheDocument()
  })

  it('saves the dark theme, restores defaults and requires typed erase confirmation', async () => {
    await acceptDisclaimer()
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Settings' }))
    await user.selectOptions(screen.getByLabelText('Theme'), 'dark')
    await user.click(screen.getByRole('button', { name: 'Save settings' }))
    expect(await screen.findByText('Settings saved.')).toBeInTheDocument()
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect((await loadSettings()).theme).toBe('dark')
    await user.click(screen.getByRole('button', { name: 'Reset to defaults' }))
    expect(await screen.findByText('Default settings restored.')).toBeInTheDocument()
    expect(screen.getByLabelText('Theme')).toHaveValue('system')
    expect(document.documentElement.dataset.theme).toBe('system')
    expect(screen.getByRole('button', { name: 'Erase all data' })).toBeDisabled()
    await user.type(screen.getByLabelText('Type ERASE to confirm'), 'ERASE')
    await user.click(screen.getByRole('button', { name: 'Erase all data' }))
    expect(await screen.findByRole('button', { name: 'I understand and accept' })).toBeInTheDocument()
    for (const table of db.tables) expect(await table.count()).toBe(0)
  })

  it('rejects reversed thresholds without saving them', async () => {
    await acceptDisclaimer()
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Settings' }))
    const thresholds = screen.getByLabelText('ROM alert thresholds (hours, separated by commas)')
    await user.clear(thresholds)
    await user.type(thresholds, '24, 18')
    await user.click(screen.getByRole('button', { name: 'Save settings' }))
    expect(screen.getByRole('alert')).toHaveTextContent('in increasing order')
    expect((await loadSettings()).romAlertHours).toEqual([18, 24])
  })
})
