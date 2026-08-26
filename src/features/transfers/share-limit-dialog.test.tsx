import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ShareLimitDialog } from '@/features/transfers/share-limit-dialog'
import type { Torrent } from '@/types/qbittorrent'

const torrent = (over: Partial<Torrent> = {}) =>
  ({
    hash: 'abc',
    name: 'ubuntu-24.04.2-desktop-amd64.iso',
    ratio_limit: -2,
    max_ratio: -1,
    seeding_time_limit: -2,
    max_seeding_time: -1,
    inactive_seeding_time_limit: -2,
    max_inactive_seeding_time: -1,
    share_limit_action: 'Default',
    ...over,
  }) as Torrent

const setup = (one: Torrent | null = torrent()) => {
  const onApply = vi.fn()
  const onClose = vi.fn()
  render(<ShareLimitDialog torrent={one} onClose={onClose} onApply={onApply} />)
  return { onApply, onClose }
}

describe('ShareLimitDialog', () => {
  it('shows nothing when no torrent asked for it', () => {
    setup(null)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('names the torrent it is about', () => {
    // The row it came from is behind a modal by the time this opens, so the
    // dialog is the only thing left saying which torrent this applies to.
    setup()
    expect(screen.getByText('ubuntu-24.04.2-desktop-amd64.iso')).toBeInTheDocument()
  })

  it('says the limits are this torrent only', () => {
    // Settings carries global share limits, and the two are easy to confuse if
    // neither states its scope.
    setup()
    expect(screen.getByText(/this torrent only/)).toBeInTheDocument()
  })

  it('offers all three modes rather than a switch', () => {
    // The distinction the wire hides. A torrent following the global limit and
    // one set to never stop are different settings that a two-state control
    // cannot tell apart.
    setup()
    const strip = screen.getByRole('radiogroup', { name: 'Ratio limit' })
    expect(strip).toBeInTheDocument()
    expect(screen.getAllByRole('radio', { name: 'Global' })).not.toHaveLength(0)
    expect(screen.getAllByRole('radio', { name: 'No limit' })).not.toHaveLength(0)
    expect(screen.getAllByRole('radio', { name: 'Custom' })).not.toHaveLength(0)
  })

  it('starts on the mode the torrent is actually in', () => {
    setup(torrent({ ratio_limit: 2.5, max_ratio: 2.5 }))
    const custom = screen.getAllByRole('radio', { name: 'Custom' })[0]!
    expect(custom).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByLabelText('Ratio limit value')).toHaveValue('2.5')
  })

  it('says what will actually happen, not what the strip says', () => {
    // A torrent following a global limit that is switched off is not limited
    // at all. Reading the strip alone would leave somebody believing a cap is
    // in place, so the row reports the resolved max_ratio instead.
    setup(torrent({ ratio_limit: -2, max_ratio: -1 }))
    expect(screen.getAllByText(/nothing will stop it/).length).toBeGreaterThan(0)
  })

  it('reports minutes as a readable duration', () => {
    setup(torrent({ seeding_time_limit: 1440, max_seeding_time: 1440 }))
    expect(screen.getByText(/stops after 1 d/)).toBeInTheDocument()
  })

  it('cannot save until something changed', () => {
    // The endpoint overwrites every limit it is handed, so a no-op save is a
    // real four-parameter write that can fail and report a failure for
    // something nobody did.
    setup()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('sends all four parameters for a single edit', async () => {
    const { onApply, onClose } = setup()

    await userEvent.click(screen.getAllByRole('radio', { name: 'Custom' })[0]!)
    await userEvent.type(screen.getByLabelText('Ratio limit value'), '3')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    // Not just ratioLimit. Sending three of the four silently resets the
    // fourth, because the endpoint has no way to leave a limit alone.
    expect(onApply).toHaveBeenCalledWith({
      ratioLimit: 3,
      seedingTimeLimit: -2,
      inactiveSeedingTimeLimit: -2,
      shareLimitAction: 'Default',
    })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('keeps the value box shut unless the mode is custom', () => {
    setup()
    expect(screen.getByLabelText('Ratio limit value')).toBeDisabled()
  })

  it('cancels without writing', async () => {
    const { onApply, onClose } = setup()
    await userEvent.click(screen.getAllByRole('radio', { name: 'No limit' })[0]!)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onApply).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('hides the inactive row on a daemon too old to have it', () => {
    // qBittorrent 4.6 added it. A control for a limit the daemon ignores would
    // read as having been applied.
    const old = torrent()
    delete (old as { inactive_seeding_time_limit?: unknown }).inactive_seeding_time_limit
    setup(old)
    expect(
      screen.queryByRole('radiogroup', { name: 'Inactive time limit' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Ratio limit' })).toBeInTheDocument()
  })

  it('offers the destructive action by what it destroys', async () => {
    // "Remove" alone is ambiguous about the files, and one of the two options
    // deletes them off disk.
    setup()
    const select = screen.getByLabelText('When a limit is reached')
    expect(select).toBeInTheDocument()
    await userEvent.selectOptions(select, 'RemoveWithContent')
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
  })
})
