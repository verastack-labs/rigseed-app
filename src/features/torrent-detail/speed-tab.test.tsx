import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { SpeedTab, type SpeedTabProps } from '@/features/torrent-detail/speed-tab'
import type { Torrent } from '@/types/qbittorrent'

const torrent: Torrent = {
  hash: 'a1b2c3',
  name: 'ubuntu.iso',
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
  save_path: '/downloads',
  dl_limit: -1,
  up_limit: -1,
  downloaded: 3_648_000_000,
  uploaded: 1_000_000_000,
  seeding_time: 0,
  auto_tmm: false,
  sequential_download: false,
  super_seeding: false,
}

const base: SpeedTabProps = {
  torrent,
  downHistory: [1, 2, 3],
  upHistory: [1, 2, 3],
  onLimit: vi.fn(),
  onToggleSequential: vi.fn(),
  onToggleFirstLast: vi.fn(),
  onAutoManagement: vi.fn(),
}

const setup = (overrides: Partial<Torrent> = {}, props: Partial<SpeedTabProps> = {}) =>
  render(<SpeedTab {...base} {...props} torrent={{ ...torrent, ...overrides }} />)

describe('SpeedTab limits', () => {
  it('shows unlimited as an empty, disabled field', () => {
    setup()
    const field = screen.getByLabelText('Download limit')
    expect(field).toHaveValue('')
    expect(field).toBeDisabled()
    expect(screen.getByRole('switch', { name: 'Download unlimited' })).toBeChecked()
  })

  it('converts the daemon’s bytes into KiB for the field', () => {
    // 1024, not 1000. Everything else in rigseed is base 1000 because that is
    // what the daemon reports sizes in, but qBittorrent has always labelled
    // its limits KiB/s, and a number copied across from it must mean the same.
    setup({ dl_limit: 512 * 1024 })
    expect(screen.getByLabelText('Download limit')).toHaveValue('512')
  })

  it('converts back to bytes on submit', () => {
    const onLimit = vi.fn()
    setup({ dl_limit: 100 * 1024 }, { onLimit })

    fireEvent.change(screen.getByLabelText('Download limit'), { target: { value: '250' } })
    fireEvent.keyDown(screen.getByLabelText('Download limit'), { key: 'Enter' })
    expect(onLimit).toHaveBeenCalledWith('down', 256_000)
  })

  it('treats an emptied field as unlimited rather than as zero', () => {
    // A zero limit would stop the torrent dead, which is not what clearing a
    // box means to anyone.
    const onLimit = vi.fn()
    setup({ up_limit: 100 * 1024 }, { onLimit })

    fireEvent.change(screen.getByLabelText('Upload limit'), { target: { value: '  ' } })
    fireEvent.blur(screen.getByLabelText('Upload limit'))
    expect(onLimit).toHaveBeenCalledWith('up', -1)
  })

  it('follows the daemon when the limit changes elsewhere', () => {
    // It can be changed by the stock WebUI, another client, or a scheduled
    // alternative limit. The field should show what is set, not what was last
    // typed here.
    const { rerender } = setup({ dl_limit: 100 * 1024 })
    expect(screen.getByLabelText('Download limit')).toHaveValue('100')

    rerender(<SpeedTab {...base} torrent={{ ...torrent, dl_limit: 900 * 1024 }} />)
    expect(screen.getByLabelText('Download limit')).toHaveValue('900')
  })

  it('sets unlimited from the switch', () => {
    const onLimit = vi.fn()
    setup({ dl_limit: 100 * 1024 }, { onLimit })

    fireEvent.click(screen.getByRole('switch', { name: 'Download unlimited' }))
    expect(onLimit).toHaveBeenCalledWith('down', -1)
  })

  it('names the endpoint each limit writes to', () => {
    setup()
    expect(screen.getByText('torrents/setDownloadLimit')).toBeInTheDocument()
    expect(screen.getByText('torrents/setUploadLimit')).toBeInTheDocument()
  })
})

describe('SpeedTab behaviour switches', () => {
  it('offers all three, each naming its endpoint', () => {
    setup()
    expect(screen.getByText('torrents/setAutoManagement')).toBeInTheDocument()
    expect(screen.getByText('torrents/toggleSequentialDownload')).toBeInTheDocument()
    expect(screen.getByText('torrents/toggleFirstLastPiecePrio')).toBeInTheDocument()
  })

  it('passes a value for the setter and no value for the toggles', () => {
    // The API is not uniform: automatic management takes enable=true, the
    // other two only flip. Sending a toggle twice undoes it, which is why the
    // caller has to know the current state.
    const onAutoManagement = vi.fn()
    const onToggleSequential = vi.fn()
    setup({}, { onAutoManagement, onToggleSequential })

    fireEvent.click(screen.getByRole('switch', { name: 'Automatic Torrent Management' }))
    expect(onAutoManagement).toHaveBeenCalledWith(true)

    fireEvent.click(screen.getByRole('switch', { name: 'Sequential download' }))
    expect(onToggleSequential).toHaveBeenCalledWith()
  })

  it('reflects the torrent’s current state', () => {
    setup({ auto_tmm: true, sequential_download: true })
    expect(screen.getByRole('switch', { name: 'Automatic Torrent Management' })).toBeChecked()
    expect(screen.getByRole('switch', { name: 'Sequential download' })).toBeChecked()
  })

  it('turns automatic management back off explicitly', () => {
    const onAutoManagement = vi.fn()
    setup({ auto_tmm: true }, { onAutoManagement })

    fireEvent.click(screen.getByRole('switch', { name: 'Automatic Torrent Management' }))
    expect(onAutoManagement).toHaveBeenCalledWith(false)
  })
})
