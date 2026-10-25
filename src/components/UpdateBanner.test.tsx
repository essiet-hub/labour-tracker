import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { UpdateBanner } from './UpdateBanner'

vi.mock('virtual:pwa-register/react', () => ({ useRegisterSW: vi.fn() }))

describe('UpdateBanner', () => {
  it('offers no update until one is waiting', () => {
    vi.mocked(useRegisterSW).mockReturnValue({
      needRefresh: [false, vi.fn()], offlineReady: [false, vi.fn()],
      updateServiceWorker: vi.fn(),
    })
    render(<UpdateBanner />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('activates a waiting update only after a tap', async () => {
    const updateServiceWorker = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useRegisterSW).mockReturnValue({
      needRefresh: [true, vi.fn()], offlineReady: [true, vi.fn()], updateServiceWorker,
    })
    render(<UpdateBanner />)
    expect(updateServiceWorker).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: /New version available/ }))
    expect(updateServiceWorker).toHaveBeenCalledWith(true)
  })

  it('allows retrying a failed update', async () => {
    const updateServiceWorker = vi.fn().mockRejectedValue(new Error('Offline'))
    vi.mocked(useRegisterSW).mockReturnValue({
      needRefresh: [true, vi.fn()], offlineReady: [true, vi.fn()], updateServiceWorker,
    })
    render(<UpdateBanner />)
    await userEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('alert')).toHaveTextContent('Try again when connected.')
    expect(screen.getByRole('button')).toBeEnabled()
  })
})
