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

describe('the activity cards', () => {
  /** A fixed instant, so "3m ago" means something a test can assert. */
  const NOW = 1_770_010_000_000

  const show = (over: Partial<Torrent> = {}, props: Partial<TorrentProperties> = {}) =>
    render(
      <GeneralTab torrent={makeTorrent(over)} properties={{ ...properties, ...props }} now={NOW} />,
    )

  /**
   * The whole card, found by its label.
   *
   * Two levels up, because StatCard wraps the label with its optional icon
   * before the card itself. Asserting on the card's full text rather than
   * picking the sub-line span out keeps this from breaking when the card gains
   * an icon or another line.
   */
  const cardFor = (label: string) => screen.getByText(label).parentElement!.parentElement!
  const subOf = (label: string) => cardFor(label).textContent ?? ''

  it('reports the download time, not the seeding time again', () => {
    // The sub-line used to show seeding time, which reads as a repeat: both
    // round to the same string on anything that finished quickly. Measured on
    // a real torrent, 412949s active against 412054s seeding both printed
    // "4d 18h". The gap is the number neither line already carries.
    show({ time_active: 39_600, seeding_time: 3_600 })
    expect(screen.getByText('11h 0m')).toBeInTheDocument()
    expect(subOf('Active for')).toContain('10h 0m of that downloading')
  })

  it('says so plainly before any seeding has happened', () => {
    // seeding_time is 0 while a torrent is still downloading, and "0m of that
    // downloading" would be both wrong and confusing.
    show({ time_active: 39_600, seeding_time: 0 })
    expect(subOf('Active for')).toContain('not seeding yet')
  })

  it('says the question does not apply once complete', () => {
    // The daemon sends -1 rather than 0 for a finished torrent, and the two
    // would read as opposites: nobody has any of it, against nobody needs it.
    show({ progress: 1, availability: -1 })
    expect(subOf('Availability')).toContain('not tracked once complete')
  })

  it('reports availability while there is still something to find', () => {
    show({ progress: 0.4, availability: 1.874, seen_complete: 1_770_006_400 })
    expect(screen.getByText('1.87')).toBeInTheDocument()
    expect(subOf('Availability')).toContain('whole copy seen 1h ago')
  })

  it('separates never seen complete from seen a long time ago', () => {
    // seen_complete is 0 for a torrent nobody has ever finished. That is the
    // difference between slow and hopeless, and rendering it as a 1970 date
    // would bury it.
    show({ progress: 0.4, availability: 0.62, seen_complete: 0 })
    expect(subOf('Availability')).toContain('no whole copy seen yet')
  })

  it('reports how long ago data last moved', () => {
    show({ last_activity: 1_770_009_400 })
    expect(screen.getByText('10m ago')).toBeInTheDocument()
  })

  it('names an unlimited connection cap rather than printing -1', () => {
    show({}, { nb_connections: 24, nb_connections_limit: -1 })
    expect(subOf('Connections')).toContain('no limit')
  })

  it('shows the connection cap when there is one', () => {
    show({}, { nb_connections: 24, nb_connections_limit: 100 })
    expect(subOf('Connections')).toContain('of 100 allowed')
  })

  it('leaves popularity off the grid entirely', () => {
    // It arrives on every row and reads as an obvious card, but nothing
    // establishes what it measures: swarm totals of 12, 191 and 2521 gave
    // 34.3, 42.0 and 112.5 on a real daemon, which fits no curve the client
    // can reconstruct. A number nobody can explain is worse than a gap.
    show({ popularity: 41.6 })
    expect(screen.queryByText('Popularity')).not.toBeInTheDocument()
    expect(screen.queryByText('41.6')).not.toBeInTheDocument()
  })

  it('fills the grid to whole rows', () => {
    // Four across, so eleven cards would leave a ragged last row. Named rather
    // than counted, so a failure says which card went missing.
    show()
    for (const label of [
      'Status',
      'Size',
      'Down speed',
      'Up speed',
      'ETA',
      'Ratio',
      'Seeds / peers',
      'Added on',
      'Availability',
      'Active for',
      'Last activity',
      'Connections',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })
})
