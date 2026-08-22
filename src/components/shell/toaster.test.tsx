import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Toaster } from '@/components/shell/toaster'
import { useNoticeStore } from '@/state/notice-store'

const raise = (what: string, tone: 'warn' | 'ok' = 'warn', detail?: string) =>
  act(() => {
    useNoticeStore.getState().push(detail === undefined ? { tone, what } : { tone, what, detail })
  })

beforeEach(() => {
  act(() => useNoticeStore.getState().clear())
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Toaster', () => {
  it('renders nothing at all until something happens', () => {
    render(<Toaster />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('is a live region, so a failure is read out without being hunted for', () => {
    render(<Toaster />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
  })

  it('says what failed and what the daemon said about it', () => {
    render(<Toaster />)
    raise('Pause', 'warn', 'torrents/stop failed: 403')
    expect(screen.getByText(/Pause/)).toBeInTheDocument()
    expect(screen.getByText('torrents/stop failed: 403')).toBeInTheDocument()
  })

  it('phrases a failure as a failure rather than leaving it to the colour', () => {
    // The status rules do not allow a control or a message whose only signal
    // is its colour, and "Pause" alone reads as a confirmation.
    render(<Toaster />)
    raise('Pause')
    expect(screen.getByText(/did not go through/)).toBeInTheDocument()
  })

  it('does not add that to a confirmation', () => {
    render(<Toaster />)
    raise('Peer banned', 'ok')
    expect(screen.queryByText(/did not go through/)).not.toBeInTheDocument()
    expect(screen.getByText('Peer banned')).toBeInTheDocument()
  })

  it('can be dismissed by hand', async () => {
    render(<Toaster />)
    raise('Pause')
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByText(/Pause/)).not.toBeInTheDocument()
  })

  it('takes itself away, and gives a failure longer than a confirmation', () => {
    // A failure is the one somebody has to read and may want to act on.
    vi.useFakeTimers()
    render(<Toaster />)
    raise('Peer banned', 'ok')
    raise('Pause', 'warn')

    act(() => void vi.advanceTimersByTime(5_000))
    expect(screen.queryByText('Peer banned')).not.toBeInTheDocument()
    expect(screen.getByText(/Pause/)).toBeInTheDocument()

    act(() => void vi.advanceTimersByTime(5_000))
    expect(screen.queryByText(/Pause/)).not.toBeInTheDocument()
  })

  it('does not swallow clicks on the page underneath when it is empty', () => {
    // It is fixed and always mounted, so an empty stack covering the corner of
    // every screen would be a bug nobody would think to look for.
    render(<Toaster />)
    expect(screen.getByRole('status').className).toContain('pointer-events-none')
  })
})

describe('the countdown', () => {
  it('does not restart when another notice arrives', () => {
    // The timer used to depend on a handler the parent rebuilt every render,
    // so every later notice reset every earlier one. During a run of failures
    // the first toast outlived all of them.
    vi.useFakeTimers()
    render(<Toaster />)
    raise('First', 'warn')

    act(() => void vi.advanceTimersByTime(6_000))
    raise('Second', 'warn')
    act(() => void vi.advanceTimersByTime(3_500))

    expect(screen.queryByText(/First/)).not.toBeInTheDocument()
    expect(screen.getByText(/Second/)).toBeInTheDocument()
  })
})

describe('placement', () => {
  it('clears the add-torrent button and the footer rather than the toolbar', () => {
    // It was top right first, and a screenshot of the running window showed
    // the second toast sitting on the view switcher and the speed limits
    // toggle. Covering a control somebody might reach for after a failed
    // action is worse than covering empty space.
    render(<Toaster />)
    const region = screen.getByRole('status')
    expect(region.className).toContain('bottom-[46px]')
    expect(region.className).toContain('right-[100px]')
    expect(region.className).not.toContain('top-4')
  })
})
