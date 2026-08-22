import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { GeneralTab } from '@/features/torrent-detail/general-tab'
import { makeTorrent } from '@/test/torrent'
import type { Torrent, TorrentProperties } from '@/types/qbittorrent'

const torrent = makeTorrent({ name: 'ubuntu-24.04.2-desktop-amd64.iso' })

const properties: TorrentProperties = {
  save_path: '/downloads/linux',
  download_path: '',
  creation_date: 1_767_000_000,
  piece_size: 262_144,
  comment: 'Ubuntu CD releases',
  created_by: 'mktorrent 1.1',
  addition_date: 1_770_000_000,
  completion_date: 0,
  total_size: 5_700_000_000,
  total_wasted: 5_000,
  total_uploaded: 1_000_000_000,
  total_uploaded_session: 400_000_000,
  total_downloaded: 3_648_000_000,
  total_downloaded_session: 2_000_000_000,
  up_limit: -1,
  dl_limit: -1,
  time_elapsed: 4_200,
  seeding_time: 0,
  nb_connections: 24,
  nb_connections_limit: 100,
  share_ratio: 1.42,
  dl_speed: 13_000_000,
  dl_speed_avg: 11_000_000,
  up_speed: 1_800_000,
  up_speed_avg: 1_600_000,
  eta: 252,
  last_seen: 1_770_003_600,
  peers: 7,
  peers_total: 21,
  seeds: 34,
  seeds_total: 68,
  pieces_have: 13_916,
  pieces_num: 21_744,
  reannounce: 900,
  infohash_v1: 'a1b2c3',
}

const setup = (props: Partial<TorrentProperties> | null = {}) =>
  render(
    <GeneralTab
      torrent={torrent}
      properties={props === null ? null : { ...properties, ...props }}
    />,
  )

describe('GeneralTab stat grid', () => {
  it('shows the eight cards', () => {
    setup()
    for (const label of [
      'Status',
      'Size',
      'Down speed',
      'Up speed',
      'ETA',
      'Ratio',
      'Seeds / peers',
      'Added on',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('distinguishes connected peers from the swarm the tracker reported', () => {
    // Without the wording these two look like two counts of the same thing
    // that disagree.
    setup()
    expect(screen.getByText('34 / 7')).toBeInTheDocument()
    expect(screen.getByText('of 68 / 21 known')).toBeInTheDocument()
  })

  it('pairs each live speed with its average', () => {
    setup()
    expect(screen.getByText('13.0 MB/s')).toBeInTheDocument()
    expect(screen.getByText('11.0 MB/s average')).toBeInTheDocument()
  })

  it('renders before properties arrive rather than blocking on them', () => {
    // torrents/properties is a second request. The list already knows the
    // size, the speeds and the ratio, so waiting for it would blank numbers
    // the app can already answer.
    setup(null)
    expect(screen.getByText('5.70 GB')).toBeInTheDocument()
    expect(screen.getByText('13.0 MB/s')).toBeInTheDocument()
    expect(screen.getByText('1.42')).toBeInTheDocument()
  })

  it('shows a dash, not a stale average, before properties arrive', () => {
    setup(null)
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })
})

describe('GeneralTab detail card', () => {
  it('starts open, because it carries an action and not only facts', () => {
    setup()
    const toggle = screen.getByRole('button', { name: /Paths, hash and comment/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Created by')).toBeInTheDocument()
  })

  it('still collapses when asked', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: /Paths, hash and comment/ }))
    expect(screen.queryByText('Created by')).not.toBeInTheDocument()
  })

  it('shows the values that never change', () => {
    setup()
    expect(screen.getByText('mktorrent 1.1')).toBeInTheDocument()
    expect(screen.getByText('13916 of 21744 · 262.1 KB each')).toBeInTheDocument()
  })

  it('says what an empty incomplete path means rather than showing a blank', () => {
    setup()
    expect(screen.getByText('same as save path')).toBeInTheDocument()
  })

  it('names the endpoint it came from', () => {
    setup()
    expect(screen.getByText('torrents/properties')).toBeInTheDocument()
  })

  it('shows a skeleton inside the card while properties are still loading', () => {
    setup(null)
    expect(screen.queryByText('mktorrent 1.1')).not.toBeInTheDocument()
  })
})

/** Renders with a torrent override rather than a properties one. */
const withTorrent = (over: Partial<Torrent>) =>
  render(<GeneralTab torrent={makeTorrent({ ...over })} properties={properties} />)

describe('GeneralTab size', () => {
  it('says what the size refers to when files are skipped', () => {
    // `size` counts selected files only. On a torrent with files deselected
    // it is smaller than the size the torrent is known by everywhere else,
    // and the label alone gave no hint of that.
    withTorrent({ size: 3_200_000_000, total_size: 4_700_000_000 })
    expect(screen.getByText('3.20 GB')).toBeInTheDocument()
    expect(screen.getByText('of 4.70 GB selected')).toBeInTheDocument()
  })

  it('says nothing extra when nothing is skipped', () => {
    // The ordinary case, and it must not grow a line that reads as a warning.
    withTorrent({ size: 4_700_000_000, total_size: 4_700_000_000 })
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument()
  })
})
