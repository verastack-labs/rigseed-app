import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RowMenu, type TorrentActions } from '@/features/transfers/row-menu'
import { makeTorrent } from '@/test/torrent'
import type { Torrent } from '@/types/qbittorrent'

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
  onShareLimits: vi.fn(),
  onForceStart: vi.fn(),
  onSaveTorrentFile: vi.fn(),
}

/** A card, because RowMenu finds its right-click target by climbing to one. */
const inACard = (one: Torrent = torrent) =>
  render(
    <div data-context-target data-testid="card">
      <RowMenu torrent={one} actions={actions} />
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
    expect(items()).toContain('Copy')
  })

  it('opens on a right click anywhere on the card', () => {
    // The button worked all along. Nothing listened for a right click, which
    // is how Copy and Open containing folder went unnoticed.
    inACard()
    fireEvent.contextMenu(screen.getByTestId('card'), { clientX: 120, clientY: 90 })
    expect(items()).toContain('Copy')
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
    expect(items()).toContain('Copy')
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

  it('opens the share limits for the row it came from', () => {
    inACard()
    fireEvent.click(screen.getByRole('button', { name: `Actions for ${torrent.name}` }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Share limits…' }))
    expect(actions.onShareLimits).toHaveBeenCalledWith(torrent)
  })

  it('names force start by what choosing it will do', () => {
    // The menu has no checkable row, so a label that describes the current
    // state would be read as describing the next action by half the audience
    // and as the state by the other half.
    inACard()
    fireEvent.click(screen.getByRole('button', { name: `Actions for ${torrent.name}` }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Force start' }))
    expect(actions.onForceStart).toHaveBeenCalledWith([torrent.hash], true)
  })

  it('offers to stop forcing a torrent that is already forced', () => {
    // The other half of the same row. Sending true again would be a write
    // that changes nothing, and the label would be a lie.
    inACard({ ...torrent, force_start: true })
    fireEvent.click(screen.getByRole('button', { name: `Actions for ${torrent.name}` }))
    expect(screen.queryByRole('menuitem', { name: 'Force start' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Stop forcing' }))
    expect(actions.onForceStart).toHaveBeenCalledWith([torrent.hash], false)
  })

  it('marks the one that opens something rather than acting', () => {
    // Every other item on this menu takes effect the moment it is chosen, so
    // the ellipsis is carrying more than convention here.
    inACard()
    fireEvent.click(screen.getByRole('button', { name: `Actions for ${torrent.name}` }))
    const labels = screen.getAllByRole('menuitem').map((i) => i.textContent?.trim())
    expect(labels.filter((l) => l?.endsWith('…'))).toEqual(['Speed limits…', 'Share limits…'])
  })
})

describe('the copy branch', () => {
  const openBranch = async () => {
    inACard()
    fireEvent.click(screen.getByRole('button', { name: `Actions for ${torrent.name}` }))
    fireEvent.mouseEnter(screen.getByRole('menuitem', { name: /Copy/ }))
  }

  it('groups the copies rather than flattening five items into the menu', async () => {
    inACard()
    fireEvent.click(screen.getByRole('button', { name: `Actions for ${torrent.name}` }))
    const copy = screen.getByRole('menuitem', { name: /Copy/ })
    expect(copy).toHaveAttribute('aria-haspopup', 'menu')
    expect(screen.queryByRole('menuitem', { name: 'Magnet link' })).not.toBeInTheDocument()
  })

  it('offers what the row actually holds', async () => {
    await openBranch()
    for (const label of ['Name', 'Magnet link', 'Info hash', 'Content path', 'Save path']) {
      expect(screen.getByRole('menuitem', { name: label })).toBeInTheDocument()
    }
  })

  it('does not offer what would need a second request', async () => {
    // Info hash v1 and v2 separately, and Comment, are on TorrentProperties
    // rather than the row. qBittorrent's WebUI has them because its rows carry
    // them; ours would need a fetch per menu open.
    await openBranch()
    expect(screen.queryByRole('menuitem', { name: 'Comment' })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Info hash v2' })).not.toBeInTheDocument()
  })

  it('copies the content path and the save path as different things', async () => {
    // save_path is the folder the torrent was told to go in; content_path is
    // what it actually made, which for a single-file torrent is not the two
    // joined. An entry that copied the wrong one would look right.
    const write = vi.fn()
    Object.assign(navigator, { clipboard: { writeText: write } })
    await openBranch()

    fireEvent.click(screen.getByRole('menuitem', { name: 'Content path' }))
    expect(write).toHaveBeenCalledWith(torrent.content_path)
  })
})
