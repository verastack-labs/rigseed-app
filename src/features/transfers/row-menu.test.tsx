import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RowMenu, type TorrentActions } from '@/features/transfers/row-menu'
import { makeTorrent } from '@/test/torrent'

const revealInFolder = vi.fn()
let hasDesktop = true

vi.mock('@/services/shell', () => ({
  canReachDesktop: () => hasDesktop,
  revealInFolder: (path: string) => revealInFolder(path),
  openPath: vi.fn(),
  pickFolder: vi.fn(),
}))

const torrent = makeTorrent({
  name: 'ubuntu-24.04.2-desktop-amd64.iso',
  magnet_uri: 'magnet:?xt=urn:btih:abc123&dn=ubuntu',
  content_path: 'C:/Downloads/ubuntu-24.04.2-desktop-amd64.iso',
})

const actions: TorrentActions = {
  onResume: vi.fn(),
  onPause: vi.fn(),
  onRemove: vi.fn(),
  onRecheck: vi.fn(),
  onSpeedLimits: vi.fn(),
}

/** A card, because RowMenu finds its right-click target by climbing to one. */
const inACard = () =>
  render(
    <div data-context-target data-testid="card">
      <RowMenu torrent={torrent} actions={actions} />
    </div>,
  )

const items = () => screen.queryAllByRole('menuitem').map((n) => n.textContent?.trim())

describe('RowMenu', () => {
  beforeEach(() => {
    hasDesktop = true
    revealInFolder.mockClear()
  })

  it('opens from the three-dot button', () => {
    inACard()
    fireEvent.click(screen.getByRole('button', { name: /Actions for/ }))
    expect(items()).toContain('Copy magnet link')
  })

  it('opens on a right click anywhere on the card', () => {
    // The button worked all along. Nothing listened for a right click, which
    // is how Copy magnet link and Open containing folder went unnoticed.
    inACard()
    fireEvent.contextMenu(screen.getByTestId('card'), { clientX: 120, clientY: 90 })
    expect(items()).toContain('Copy magnet link')
  })

  it('opens at the pointer when it was a right click', () => {
    inACard()
    fireEvent.contextMenu(screen.getByTestId('card'), { clientX: 120, clientY: 90 })
    expect(screen.getByRole('menu').className).toContain('fixed')
  })

  it('goes back under the button when that is what was clicked', () => {
    inACard()
    fireEvent.contextMenu(screen.getByTestId('card'), { clientX: 120, clientY: 90 })
    fireEvent.click(screen.getByRole('button', { name: /Actions for/ }))
    fireEvent.click(screen.getByRole('button', { name: /Actions for/ }))
    expect(screen.getByRole('menu').className).toContain('absolute')
  })

  it('stops the webview opening its own menu on top', () => {
    inACard()
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    screen.getByTestId('card').dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })

  it('offers Open containing folder, and reveals the content path', () => {
    inACard()
    fireEvent.contextMenu(screen.getByTestId('card'), { clientX: 10, clientY: 10 })
    fireEvent.click(screen.getByRole('menuitem', { name: 'Open containing folder' }))
    // content_path, not save_path: for a single-file torrent that is the file
    // itself, so the file manager highlights it.
    expect(revealInFolder).toHaveBeenCalledWith('C:/Downloads/ubuntu-24.04.2-desktop-amd64.iso')
  })

  it('leaves that item out where there is no desktop to ask', () => {
    hasDesktop = false
    inACard()
    fireEvent.contextMenu(screen.getByTestId('card'), { clientX: 10, clientY: 10 })
    expect(items()).not.toContain('Open containing folder')
    expect(items()).toContain('Copy magnet link')
  })
})

describe('the items that were not there', () => {
  it('actually rechecks, rather than looking like it will', () => {
    // It shipped with no handler at all: an item that highlighted on hover and
    // did nothing whatsoever when chosen.
    inACard()
    fireEvent.click(screen.getByRole('button', { name: `Actions for ${torrent.name}` }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Force recheck' }))
    expect(actions.onRecheck).toHaveBeenCalledWith([torrent.hash])
  })

  it('offers the per-torrent limits without opening the torrent', () => {
    // They existed on the Speed tab of the torrent's own screen, which is a
    // long way round for the thing people reach for when one download is
    // drowning everything else.
    inACard()
    fireEvent.click(screen.getByRole('button', { name: `Actions for ${torrent.name}` }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Speed limits…' }))
    expect(actions.onSpeedLimits).toHaveBeenCalledWith(torrent)
  })

  it('marks the one that opens something rather than acting', () => {
    // Every other item on this menu takes effect the moment it is chosen, so
    // the ellipsis is carrying more than convention here.
    inACard()
    fireEvent.click(screen.getByRole('button', { name: `Actions for ${torrent.name}` }))
    const labels = screen.getAllByRole('menuitem').map((i) => i.textContent?.trim())
    expect(labels.filter((l) => l?.endsWith('…'))).toEqual(['Speed limits…'])
  })
})
