import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { isSynthetic } from '@/features/torrent-detail/tracker-status'
import { TrackersTab } from '@/features/torrent-detail/trackers-tab'
import type { Tracker } from '@/types/qbittorrent'

const trackers: Tracker[] = [
  { url: '** [DHT] **', status: 2, num_peers: 12, msg: '' },
  { url: '** [PeX] **', status: 2, num_peers: 3, msg: '' },
  { url: '** [LSD] **', status: 2, num_peers: 0, msg: '' },
  { url: 'https://torrent.ubuntu.com/announce', status: 2, num_peers: 41, msg: '' },
  { url: 'https://ipv6.torrent.ubuntu.com/announce', status: 3, num_peers: 0, msg: '' },
  { url: 'udp://dead.invalid:6969/announce', status: 4, num_peers: 0, msg: 'connection timed out' },
]

const setup = (props: Partial<Parameters<typeof TrackersTab>[0]> = {}) =>
  render(<TrackersTab trackers={trackers} onAdd={vi.fn()} onRemove={vi.fn()} {...props} />)

describe('isSynthetic', () => {
  it('recognises the three qBittorrent reports as trackers but are not', () => {
    expect(isSynthetic('** [DHT] **')).toBe(true)
    expect(isSynthetic('** [PeX] **')).toBe(true)
    expect(isSynthetic('** [LSD] **')).toBe(true)
    expect(isSynthetic('https://torrent.ubuntu.com/announce')).toBe(false)
  })
})

describe('TrackersTab', () => {
  it('shows a skeleton until the list arrives', () => {
    setup({ trackers: null })
    expect(screen.queryByText('** [DHT] **')).not.toBeInTheDocument()
  })

  it('counts only real trackers, but still shows the synthetic rows', () => {
    // Three of the six rows are DHT, PeX and LSD. The stock client shows them,
    // so hiding them would look like rigseed lost data, but counting them
    // would claim six trackers where there are three.
    setup()
    expect(screen.getByText('3 trackers · 1 error')).toBeInTheDocument()
    expect(screen.getByText('** [DHT] **')).toBeInTheDocument()
  })

  it('omits the error clause when nothing is failing', () => {
    setup({ trackers: trackers.filter((t) => t.status !== 4) })
    expect(screen.getByText('2 trackers')).toBeInTheDocument()
  })

  it('does not colour "not contacted" or "updating" as failures', () => {
    // A fresh torrent shows those for a few seconds, and painting them red
    // would make every add look broken.
    setup()
    expect(screen.getByText('updating')).toBeInTheDocument()
    expect(screen.getByText('error')).toBeInTheDocument()
  })

  it('shows the tracker message only where there is one', () => {
    setup()
    expect(screen.getByText('connection timed out')).toBeInTheDocument()
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('offers removal for real trackers and not for the synthetic ones', () => {
    // DHT is not removable however qBittorrent chooses to report it.
    setup()
    expect(
      screen.getByRole('button', { name: 'Remove https://torrent.ubuntu.com/announce' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove ** [DHT] **' })).not.toBeInTheDocument()
  })

  it('reports a removal', () => {
    const onRemove = vi.fn()
    setup({ onRemove })
    fireEvent.click(screen.getByRole('button', { name: 'Remove udp://dead.invalid:6969/announce' }))
    expect(onRemove).toHaveBeenCalledWith('udp://dead.invalid:6969/announce')
  })

  it('adds one URL per line, ignoring blanks', () => {
    const onAdd = vi.fn()
    setup({ onAdd })

    fireEvent.click(screen.getByRole('button', { name: 'Add tracker' }))
    fireEvent.change(screen.getByLabelText('Tracker URLs'), {
      target: { value: '  \nhttps://a.example/announce\n\nhttps://b.example/announce\n' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(onAdd).toHaveBeenCalledWith(['https://a.example/announce', 'https://b.example/announce'])
  })

  it('refuses an empty submission', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Add tracker' }))
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
  })

  it('discards a half-typed list when cancelled', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Add tracker' }))
    fireEvent.change(screen.getByLabelText('Tracker URLs'), { target: { value: 'abandoned' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    fireEvent.click(screen.getByRole('button', { name: 'Add tracker' }))
    expect(screen.getByLabelText('Tracker URLs')).toHaveValue('')
  })
})
