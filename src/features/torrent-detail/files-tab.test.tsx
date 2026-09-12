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
  onSelect: vi.fn(),
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
    expect(screen.getByText('SHA256SUMS')).toBeInTheDocument()
    expect(screen.getByTitle('ubuntu/SHA256SUMS')).toBeInTheDocument()
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
    // It sits inside a folder that starts shut, so it has no row until the
    // folder is opened.
    fireEvent.click(screen.getByRole('button', { name: 'Expand extras' }))
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

  describe('the tree', () => {
    it('opens the wrapper folder rather than starting on a single row', () => {
      // Almost every torrent wraps everything in one folder named after
      // itself. Leaving that shut would open the tab on one row repeating the
      // title above it, with the contents a mandatory click away.
      setup()
      expect(screen.getByText('ubuntu')).toBeInTheDocument()
      expect(screen.getByText('ubuntu.iso')).toBeInTheDocument()
    })

    it('leaves a nested folder shut, its files absent rather than hidden', () => {
      // Absent, not display:none. A torrent with thousands of files must not
      // render thousands of rows to show ten.
      setup()
      expect(screen.getByText('extras')).toBeInTheDocument()
      expect(screen.queryByText('artwork.tar.gz')).not.toBeInTheDocument()
    })

    it('opens and shuts a folder from the chevron in front of its name', () => {
      setup()
      fireEvent.click(screen.getByRole('button', { name: 'Expand extras' }))
      expect(screen.getByText('artwork.tar.gz')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Collapse extras' }))
      expect(screen.queryByText('artwork.tar.gz')).not.toBeInTheDocument()
    })

    it('tells a screen reader whether a folder is open', () => {
      setup()
      expect(screen.getByRole('button', { name: 'Expand extras' })).toHaveAttribute(
        'aria-expanded',
        'false',
      )
    })

    it('steps every level in by one', () => {
      setup()
      expect(screen.getByText('ubuntu').closest('div[style]')).toHaveStyle({
        paddingLeft: '0px',
      })
      expect(screen.getByText('ubuntu.iso').closest('div[style]')).toHaveStyle({
        paddingLeft: '16px',
      })
      fireEvent.click(screen.getByRole('button', { name: 'Expand extras' }))
      expect(screen.getByText('artwork.tar.gz').closest('div[style]')).toHaveStyle({
        paddingLeft: '32px',
      })
    })

    it('sorts folders above files', () => {
      // The API returns them in torrent order, so directories and loose files
      // used to interleave.
      setup()
      const names = screen.getAllByTitle(/^ubuntu/).map((n) => n.textContent)
      expect(names.slice(0, 3)).toEqual(['ubuntu', 'extras', 'SHA256SUMS'])
    })

    it('ticks every file beneath a folder in one write', () => {
      // Not one call per file: a folder can hold thousands, and whether they
      // all land would depend on how the owner happens to update its state.
      const onSelect = vi.fn()
      setup({ onSelect })
      fireEvent.click(screen.getByLabelText('Select extras'))
      expect(onSelect).toHaveBeenCalledWith([1], true)
    })

    it('repriorises everything beneath a folder at once', () => {
      const onPriority = vi.fn()
      setup({ onPriority })
      fireEvent.change(screen.getByLabelText('Priority for extras'), {
        target: { value: '7' },
      })
      expect(onPriority).toHaveBeenCalledWith([1], 7)
    })

    it('says Mixed rather than claiming one of the priorities it holds', () => {
      // ubuntu contains 7, 0 and 1. Showing any one of them would assert the
      // others are that too, and the next change would silently flatten them.
      setup()
      expect(screen.getByLabelText('Priority for ubuntu')).toHaveValue('')
    })
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
