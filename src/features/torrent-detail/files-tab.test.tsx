import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { FilesTab, type FilesTabProps } from '@/features/torrent-detail/files-tab'
import type { TorrentFile } from '@/types/qbittorrent'

const files: TorrentFile[] = [
  {
    index: 0,
    name: 'ubuntu/ubuntu.iso',
    size: 5_600_000_000,
    progress: 0.7,
    priority: 7,
    piece_range: [0, 199],
  },
  {
    index: 1,
    name: 'ubuntu/extras/artwork.tar.gz',
    size: 142_000_000,
    progress: 0,
    priority: 0,
    piece_range: [200, 399],
  },
  {
    index: 2,
    name: 'ubuntu/SHA256SUMS',
    size: 308,
    progress: 1,
    priority: 1,
    piece_range: [400, 401],
  },
]

const base: FilesTabProps = {
  files,
  selected: [],
  onToggle: vi.fn(),
  onPriority: vi.fn(),
}

const setup = (props: Partial<FilesTabProps> = {}) => render(<FilesTab {...base} {...props} />)

describe('FilesTab', () => {
  it('shows a skeleton until the file list arrives', () => {
    setup({ files: null })
    expect(screen.queryByText('ubuntu.iso')).not.toBeInTheDocument()
  })

  it('counts only what is not skipped in the summary', () => {
    setup()
    expect(screen.getByText('3 files · 2 selected · 5.60 GB')).toBeInTheDocument()
  })

  it('shows the last path segment, not the whole path', () => {
    // The full path is on the title attribute. A column of rows all beginning
    // "ubuntu/" spends its width saying the same thing three times.
    setup()
    expect(screen.getByText('artwork.tar.gz')).toBeInTheDocument()
    expect(screen.getByTitle('ubuntu/extras/artwork.tar.gz')).toBeInTheDocument()
  })

  it('offers every priority the API accepts, including High', () => {
    // 6 is missing from the add dialog on purpose: a torrent nobody has
    // started has no ordering to influence. Here it does.
    setup()
    const select = screen.getByLabelText('Priority for ubuntu.iso')
    expect([...select.querySelectorAll('option')].map((o) => o.textContent)).toEqual([
      'Skip',
      'Normal',
      'High',
      'Max',
    ])
  })

  it('reports a priority change for one file', () => {
    const onPriority = vi.fn()
    setup({ onPriority })

    fireEvent.change(screen.getByLabelText('Priority for SHA256SUMS'), { target: { value: '6' } })
    expect(onPriority).toHaveBeenCalledWith([2], 6)
  })

  it('reflects each file’s current priority', () => {
    setup()
    expect(screen.getByLabelText('Priority for ubuntu.iso')).toHaveValue('7')
    expect(screen.getByLabelText('Priority for artwork.tar.gz')).toHaveValue('0')
  })

  it('keeps the bulk buttons off until rows are ticked', () => {
    // A priority button that silently applies to everything is a way to skip
    // a whole torrent by accident.
    const { rerender } = setup()
    expect(screen.getByRole('button', { name: 'Max' })).toBeDisabled()

    rerender(<FilesTab {...base} selected={[0, 2]} />)
    expect(screen.getByRole('button', { name: 'Max' })).toBeEnabled()
  })

  it('applies a bulk priority to exactly the ticked rows', () => {
    const onPriority = vi.fn()
    setup({ selected: [0, 2], onPriority })

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(onPriority).toHaveBeenCalledWith([0, 2], 0)
  })

  it('reports a tick', () => {
    const onToggle = vi.fn()
    setup({ onToggle })
    fireEvent.click(screen.getByLabelText('Select SHA256SUMS'))
    expect(onToggle).toHaveBeenCalledWith(2)
  })
})
