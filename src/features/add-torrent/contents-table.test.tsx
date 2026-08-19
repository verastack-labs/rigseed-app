import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ContentsTable } from '@/features/add-torrent/contents-table'
import { PRIORITY, selectedSize, type Priority } from '@/features/add-torrent/priority'
import type { TorrentEntry } from '@/utils/torrent-file'

const entries: TorrentEntry[] = [
  { path: 'ubuntu-24.04.2-desktop-amd64.iso', size: 5_600_000_000 },
  { path: 'SHA256SUMS', size: 308 },
  { path: 'extras/screenshots.tar.gz', size: 142_000_000 },
]

const all = (p: Priority): Priority[] => entries.map(() => p)

describe('selectedSize', () => {
  it('counts only what is not skipped', () => {
    expect(selectedSize(entries, all(PRIORITY.normal))).toBe(5_742_000_308)
    expect(selectedSize(entries, [PRIORITY.normal, PRIORITY.skip, PRIORITY.skip])).toBe(
      5_600_000_000,
    )
    expect(selectedSize(entries, all(PRIORITY.skip))).toBe(0)
  })

  it('counts a max-priority file the same as a normal one', () => {
    // Priority changes the order things arrive in, not whether they arrive.
    expect(selectedSize(entries, [PRIORITY.max, PRIORITY.max, PRIORITY.max])).toBe(5_742_000_308)
  })
})

describe('ContentsTable', () => {
  it('summarises entries, selection and size', () => {
    render(<ContentsTable entries={entries} priorities={all(PRIORITY.normal)} onChange={vi.fn()} />)
    expect(screen.getByText('3 entries · 3 selected · 5.74 GB')).toBeInTheDocument()
  })

  it('follows the selection in the summary', () => {
    render(
      <ContentsTable
        entries={entries}
        priorities={[PRIORITY.normal, PRIORITY.skip, PRIORITY.skip]}
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByText('3 entries · 1 selected · 5.60 GB')).toBeInTheDocument()
  })

  it('skips a file when it is unticked', () => {
    const onChange = vi.fn()
    render(
      <ContentsTable entries={entries} priorities={all(PRIORITY.normal)} onChange={onChange} />,
    )

    fireEvent.click(screen.getByLabelText('Download SHA256SUMS'))
    expect(onChange).toHaveBeenCalledWith([PRIORITY.normal, PRIORITY.skip, PRIORITY.normal])
  })

  it('returns a re-ticked file to normal, not to whatever it was', () => {
    // Max is a deliberate choice. Bringing it back by accident, on a file the
    // user had excluded entirely, is not what unticking and re-ticking means.
    const onChange = vi.fn()
    render(
      <ContentsTable
        entries={entries}
        priorities={[PRIORITY.skip, PRIORITY.normal, PRIORITY.normal]}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByLabelText('Download ubuntu-24.04.2-desktop-amd64.iso'))
    expect(onChange).toHaveBeenCalledWith([PRIORITY.normal, PRIORITY.normal, PRIORITY.normal])
  })

  it('toggles a file between normal and max', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <ContentsTable entries={entries} priorities={all(PRIORITY.normal)} onChange={onChange} />,
    )

    fireEvent.click(screen.getByLabelText('Priority for SHA256SUMS'))
    expect(onChange).toHaveBeenLastCalledWith([PRIORITY.normal, PRIORITY.max, PRIORITY.normal])

    rerender(
      <ContentsTable
        entries={entries}
        priorities={[PRIORITY.normal, PRIORITY.max, PRIORITY.normal]}
        onChange={onChange}
      />,
    )
    fireEvent.click(screen.getByLabelText('Priority for SHA256SUMS'))
    expect(onChange).toHaveBeenLastCalledWith(all(PRIORITY.normal))
  })

  it('uses the daemon’s own priority numbers', () => {
    // torrents/filePrio takes these literally. A parallel enum here would only
    // need a mapping table to undo itself.
    expect(PRIORITY).toEqual({ skip: 0, normal: 1, max: 7 })
  })

  it('shows a skipped file as skipped and disables its priority', () => {
    render(
      <ContentsTable
        entries={entries}
        priorities={[PRIORITY.skip, PRIORITY.normal, PRIORITY.normal]}
        onChange={vi.fn()}
      />,
    )

    const chip = screen.getByLabelText('Priority for ubuntu-24.04.2-desktop-amd64.iso')
    expect(chip).toHaveTextContent('Skip')
    expect(chip).toBeDisabled()
  })
})
