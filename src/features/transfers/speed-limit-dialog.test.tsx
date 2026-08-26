import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SpeedLimitDialog } from '@/features/transfers/speed-limit-dialog'
import type { Torrent } from '@/types/qbittorrent'

const torrent = (dl = -1, up = -1) =>
  ({
    hash: 'abc',
    name: 'ubuntu-24.04.2-desktop-amd64.iso',
    dl_limit: dl,
    up_limit: up,
  }) as Torrent

const setup = (one: Torrent | null = torrent()) => {
  const onLimit = vi.fn<(direction: 'down' | 'up', bytes: number) => void>()
  const onClose = vi.fn()
  render(<SpeedLimitDialog torrent={one} onClose={onClose} onLimit={onLimit} />)
  return { onLimit, onClose }
}

describe('SpeedLimitDialog', () => {
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

  it('offers both directions at once', () => {
    // Somebody capping a download often wants to cap the upload in the same
    // breath, and two menu items opening two dialogs would ask twice.
    setup()
    expect(screen.getByLabelText('Download limit')).toBeInTheDocument()
    expect(screen.getByLabelText('Upload limit')).toBeInTheDocument()
  })

  it('says the limits are this torrent only', () => {
    // The toolbar carries a global speed switch a few pixels away, and the two
    // are easy to confuse if neither states its scope.
    setup()
    expect(screen.getByText(/this torrent only/)).toBeInTheDocument()
  })

  it('starts unlimited when the daemon says unlimited', () => {
    setup(torrent(-1, -1))
    expect(screen.getByLabelText('Download limit')).toBeDisabled()
    expect(screen.getByLabelText('Download limit')).toHaveAttribute('placeholder', 'unlimited')
  })

  it('shows an existing limit in KiB/s, not bytes', () => {
    // qBittorrent has always labelled limits KiB/s, and somebody copying a
    // number across from it has to get the same limit.
    setup(torrent(512 * 1024, -1))
    expect(screen.getByLabelText('Download limit')).toHaveValue('512')
  })

  it('sends bytes per second for what was typed in KiB/s', async () => {
    const { onLimit } = setup(torrent(-1, -1))
    await userEvent.click(screen.getByRole('switch', { name: 'Upload unlimited' }))
    const field = screen.getByLabelText('Upload limit')
    await userEvent.type(field, '250')
    await userEvent.tab()
    expect(onLimit).toHaveBeenCalledWith('up', 250 * 1024)
  })

  it('closes on Done rather than saving on it', async () => {
    // Each field commits on blur and on Enter, so a save button would either
    // duplicate that or contradict it.
    const { onClose, onLimit } = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(onLimit).not.toHaveBeenCalled()
  })
})
