import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TitleBlock } from '@/features/torrent-detail/title-block'
import type { Torrent } from '@/types/qbittorrent'

const torrent: Torrent = {
  hash: 'a1b2c3d4e5f6',
  name: 'ubuntu-24.04.2-desktop-amd64.iso',
  size: 5_700_000_000,
  progress: 0.64,
  dlspeed: 13_000_000,
  upspeed: 1_800_000,
  priority: 1,
  num_seeds: 34,
  num_leechs: 7,
  ratio: 1.42,
  eta: 252,
  state: 'downloading',
  category: 'Linux',
  tags: 'iso',
  added_on: 1_770_000_000,
  completion_on: 0,
  save_path: '/downloads/linux',
  dl_limit: -1,
  up_limit: -1,
  downloaded: 3_648_000_000,
  uploaded: 1_000_000_000,
  seeding_time: 0,
  auto_tmm: false,
  sequential_download: false,
  super_seeding: false,
}

const setup = (overrides: Partial<Torrent> = {}) =>
  render(<TitleBlock torrent={{ ...torrent, ...overrides }} />)

describe('TitleBlock', () => {
  it('names the torrent as the page heading', () => {
    setup()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'ubuntu-24.04.2-desktop-amd64.iso',
    )
  })

  it('shows progress as both a percentage and a pair of sizes', () => {
    setup()
    expect(screen.getByText('64.0%')).toBeInTheDocument()
    expect(screen.getByText('3.65 GB of 5.70 GB')).toBeInTheDocument()
  })

  it('shows the remaining time while running', () => {
    setup()
    expect(screen.getByText('4m 12s left')).toBeInTheDocument()
  })

  it('says paused rather than showing a meaningless ETA', () => {
    // A paused torrent reports whatever ETA it had when it stopped, which
    // counts down against nothing.
    setup({ state: 'pausedDL' })
    // Twice: once in the status chip, once where the ETA would be.
    expect(screen.getAllByText('paused')).toHaveLength(2)
    expect(screen.queryByText(/left/)).not.toBeInTheDocument()
  })

  it('carries the five facts that stay true across tabs', () => {
    setup()
    expect(screen.getByText('Linux')).toBeInTheDocument()
    expect(screen.getByText('/downloads/linux')).toBeInTheDocument()
    expect(screen.getByText('1.42')).toBeInTheDocument()
    expect(screen.getByText('a1b2c3d4e5f6')).toBeInTheDocument()
  })

  it('says none rather than leaving the category blank', () => {
    setup({ category: '' })
    expect(screen.getByText('none')).toBeInTheDocument()
  })

  it('shows a dash for a date the daemon reports as zero', () => {
    // Zero means never, not the first of January 1970.
    setup({ added_on: 0 })
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('titles the truncating values, so a long path is still readable', () => {
    setup({ save_path: '/mnt/storage/media/downloads/linux/distributions/ubuntu/releases' })
    expect(
      screen.getByTitle('/mnt/storage/media/downloads/linux/distributions/ubuntu/releases'),
    ).toBeInTheDocument()
  })
})
