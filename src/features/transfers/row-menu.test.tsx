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

const actions: TorrentActions = { onResume: vi.fn(), onPause: vi.fn(), onRemove: vi.fn() }

/** A card, because RowMenu finds its right-click target by climbing to one. */
const inACard = () =>
  render(
    <div data-torrent-card data-testid="card">
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
