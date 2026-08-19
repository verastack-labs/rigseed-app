import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { PeersTab } from '@/features/torrent-detail/peers-tab'
import type { Peer } from '@/types/qbittorrent'

const peers: Record<string, Peer> = {
  '81.2.69.142:6881': {
    ip: '81.2.69.142',
    port: 6881,
    client: 'qBittorrent 5.2.3',
    progress: 0.42,
    dl_speed: 820_000,
    up_speed: 0,
    country: 'Netherlands',
    country_code: 'nl',
  },
  '81.2.69.142:6882': {
    ip: '81.2.69.142',
    port: 6882,
    client: 'Transmission 4.0.6',
    progress: 1,
    dl_speed: 0,
    up_speed: 140_000,
    country: 'Germany',
    country_code: 'de',
  },
  '203.0.113.7:51413': {
    ip: '203.0.113.7',
    port: 51413,
    client: '',
    progress: 0.08,
    dl_speed: 0,
    up_speed: 0,
  },
}

const setup = (props: Partial<Parameters<typeof PeersTab>[0]> = {}) =>
  render(<PeersTab peers={peers} onBan={vi.fn()} {...props} />)

describe('PeersTab', () => {
  it('shows a skeleton until the first poll answers', () => {
    setup({ peers: null })
    expect(screen.queryByText('qBittorrent 5.2.3')).not.toBeInTheDocument()
  })

  it('counts connections, not addresses', () => {
    // Two of these three share an address on different ports. Counting unique
    // addresses would make the header disagree with the rows beneath it.
    setup()
    expect(screen.getByText('3 connected · from sync/torrentPeers')).toBeInTheDocument()
    expect(screen.getAllByText('81.2.69.142')).toHaveLength(2)
  })

  it('shows the country badge only where the daemon reported one', () => {
    setup()
    expect(screen.getByTitle('Netherlands')).toBeInTheDocument()
    expect(screen.getByText('nl')).toBeInTheDocument()
    expect(screen.queryByText('203.0.113.7')).toBeInTheDocument()
  })

  it('says unknown rather than leaving the client blank', () => {
    setup()
    expect(screen.getByText('unknown')).toBeInTheDocument()
  })

  it('opens a ban menu on right-click, naming the address', () => {
    setup()
    fireEvent.contextMenu(screen.getByText('qBittorrent 5.2.3'))
    expect(screen.getByRole('menuitem', { name: /Ban 81\.2\.69\.142/ })).toBeInTheDocument()
  })

  it('reports the connection key, not just the address', () => {
    // Banning is by address, but the caller decides that. Handing over the key
    // keeps the row that was clicked identifiable.
    const onBan = vi.fn()
    setup({ onBan })

    fireEvent.contextMenu(screen.getByText('Transmission 4.0.6'))
    fireEvent.click(screen.getByRole('menuitem', { name: /Ban/ }))
    expect(onBan).toHaveBeenCalledWith('81.2.69.142:6882')
  })

  it('does not open a browser context menu over the row', () => {
    setup()
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    screen.getByText('qBittorrent 5.2.3').dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })

  it('renders an empty swarm without a table full of nothing', () => {
    setup({ peers: {} })
    expect(screen.getByText('0 connected · from sync/torrentPeers')).toBeInTheDocument()
  })
})
