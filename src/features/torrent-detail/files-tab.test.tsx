import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { FilesTab, type FilesTabProps } from '@/features/torrent-detail/files-tab'
import type { TorrentFile } from '@/types/qbittorrent'

const openPath = vi.fn()
vi.mock('@/services/shell', () => ({
  canReachDesktop: () => true,
  openPath: (path: string) => openPath(path),
  revealInFolder: vi.fn(),
}))

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

  it('counts only what is not skipped in the summary, and names the whole', () => {
    // The selected total is what will be downloaded; the second figure is the
    // size the torrent is known by everywhere else. Printing only the first
    // next to a file count invited reading one as the other.
    setup()
    expect(screen.getByText(/3 files · 2 selected · 5\.60 GB of 5\.74 GB/)).toBeInTheDocument()
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

  describe('indentation', () => {
    it('puts the shallowest level flush, not one step in', () => {
      // Almost every torrent wraps its files in a folder named after itself,
      // and that folder has no row of its own. Measuring depth from the root
      // indented every row against an invisible parent, so the column looked
      // like it had failed to line up with its own header.
      render(<FilesTab {...base} />)
      const row = screen.getByText('ubuntu.iso').closest('div[style]')
      expect(row).toHaveStyle({ paddingLeft: '0px' })
    })

    it('still steps in for real nesting', () => {
      render(<FilesTab {...base} />)
      const row = screen.getByText('artwork.tar.gz').closest('div[style]')
      expect(row).toHaveStyle({ paddingLeft: '14px' })
    })
  })

  describe('opening a file', () => {
    const withPath = { ...base, savePath: 'C:/Downloads' }

    it('opens on a single click, not a double one', () => {
      openPath.mockClear()
      render(<FilesTab {...withPath} />)
      fireEvent.click(screen.getByText('ubuntu.iso'))
      expect(openPath).toHaveBeenCalledWith('C:/Downloads/ubuntu/ubuntu.iso')
    })

    it('leaves the checkbox alone', () => {
      // The row and the checkbox overlap, and a tick that also launched a
      // video would make the list unusable.
      openPath.mockClear()
      render(<FilesTab {...withPath} />)
      fireEvent.click(screen.getByRole('checkbox', { name: 'Select ubuntu.iso' }))
      expect(openPath).not.toHaveBeenCalled()
    })

    it('leaves the priority select alone', () => {
      openPath.mockClear()
      render(<FilesTab {...withPath} />)
      fireEvent.click(screen.getByLabelText('Priority for ubuntu.iso'))
      expect(openPath).not.toHaveBeenCalled()
    })

    it('does nothing without a save path to join to', () => {
      openPath.mockClear()
      render(<FilesTab {...base} />)
      fireEvent.click(screen.getByText('ubuntu.iso'))
      expect(openPath).not.toHaveBeenCalled()
    })
  })

  it('reports a tick', () => {
    const onToggle = vi.fn()
    setup({ onToggle })
    fireEvent.click(screen.getByLabelText('Select SHA256SUMS'))
    expect(onToggle).toHaveBeenCalledWith(2)
  })
})

/** A file list built inline, so a test can control what is skipped. */
const listOf = (...entries: readonly [number, TorrentFile['priority']][]): TorrentFile[] =>
  entries.map(([size, priority], index) => ({
    index,
    name: `f${index}.iso`,
    size,
    progress: 1,
    priority,
    is_seed: false,
    piece_range: [0, 1],
  }))

describe('FilesTab size line', () => {
  it('names the full size when something is skipped', () => {
    // Without it there was no way to see the real size of a torrent with
    // files deselected, and the selected total sat next to a file count
    // inviting one to be read as the other.
    setup({ files: listOf([3_000_000_000, 1], [1_700_000_000, 0]) })
    expect(screen.getByText(/3\.00 GB of 4\.70 GB/)).toBeInTheDocument()
  })

  it('says it once when nothing is skipped', () => {
    setup({ files: listOf([3_000_000_000, 1], [1_700_000_000, 1]) })
    expect(screen.getByText(/4\.70 GB/)).toBeInTheDocument()
    expect(screen.queryByText(/ of /)).not.toBeInTheDocument()
  })
})

describe('FilesTab while a magnet resolves', () => {
  it('explains the empty list rather than showing an empty table', () => {
    // The daemon has answered; the honest answer is that no peer has sent
    // the file list yet. Without this the tab renders a header row over
    // nothing, under a Set priority row that can act on nothing.
    setup({ files: [], awaitingMetadata: true })
    expect(screen.getByText('Waiting for the file list')).toBeInTheDocument()
    expect(screen.getByText(/comes from other peers/)).toBeInTheDocument()
  })

  it('offers no priority controls while there is nothing to prioritise', () => {
    setup({ files: [], awaitingMetadata: true })
    expect(screen.queryByText('Set priority')).not.toBeInTheDocument()
  })

  it('keeps showing the skeleton while the request is still out', () => {
    // Null is a slow request, which is a different thing from an empty
    // answer and must not be relabelled as a magnet problem.
    setup({ files: null, awaitingMetadata: true })
    expect(screen.queryByText('Waiting for the file list')).not.toBeInTheDocument()
  })

  it('does not claim a magnet problem for an ordinary torrent', () => {
    setup({ files: [], awaitingMetadata: false })
    expect(screen.queryByText('Waiting for the file list')).not.toBeInTheDocument()
  })
})
