import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ResultRow } from '@/features/search/result-row'
import type { SearchResult } from '@/types/qbittorrent'

const result: SearchResult = {
  fileName: 'ubuntu-24.04.2-desktop-amd64.iso',
  fileSize: 5_700_000_000,
  fileUrl: 'magnet:?xt=urn:btih:aaaa1111',
  descrLink: 'https://linuxtracker.org/x',
  siteUrl: 'https://linuxtracker.org',
  nbSeeders: 1842,
  nbLeechers: 96,
  engine: 'LinuxTracker',
}

const setup = (props: Partial<React.ComponentProps<typeof ResultRow>> = {}) =>
  render(
    <ResultRow
      result={result}
      expanded={false}
      onToggle={vi.fn()}
      onAdd={vi.fn()}
      onCopyMagnet={vi.fn()}
      {...props}
    />,
  )

describe('ResultRow', () => {
  it('shows the columns a person scans', () => {
    setup()
    expect(screen.getByText(result.fileName)).toBeInTheDocument()
    expect(screen.getByText('5.70 GB')).toBeInTheDocument()
    expect(screen.getByText('1842')).toBeInTheDocument()
    expect(screen.getByText('LinuxTracker')).toBeInTheDocument()
  })

  it('is a button, so Enter and Space work without being added', () => {
    setup()
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false')
  })

  it('keeps the detail out of the DOM until it is opened', () => {
    setup()
    expect(screen.queryByRole('button', { name: 'Add torrent' })).not.toBeInTheDocument()
  })

  it('shows the magnet in full rather than hiding it behind the button', () => {
    // It is the thing being handed over, and somebody pasting it elsewhere
    // deserves to see what they are pasting.
    setup({ expanded: true })
    expect(screen.getByText(result.fileUrl)).toBeInTheDocument()
  })

  it('reports the two actions separately', () => {
    const onAdd = vi.fn()
    const onCopyMagnet = vi.fn()
    setup({ expanded: true, onAdd, onCopyMagnet })

    fireEvent.click(screen.getByRole('button', { name: 'Add torrent' }))
    expect(onAdd).toHaveBeenCalledOnce()

    fireEvent.click(screen.getByRole('button', { name: 'Copy magnet' }))
    expect(onCopyMagnet).toHaveBeenCalledOnce()
  })

  it('judges the swarm on the share, not on the seed count', () => {
    // Forty seeds against four hundred leechers is a slow download; four
    // against nothing is a fast one. Seeds alone say neither.
    setup({ expanded: true, result: { ...result, nbSeeders: 40, nbLeechers: 400 } })
    expect(screen.getByText(/Far more leechers than seeds/)).toBeInTheDocument()
  })

  it('says plainly when nothing is seeding', () => {
    setup({ expanded: true, result: { ...result, nbSeeders: 0, nbLeechers: 12 } })
    expect(screen.getByText(/No seeds. This may never finish./)).toBeInTheDocument()
  })

  it('does not divide by zero on a dead swarm', () => {
    setup({ expanded: true, result: { ...result, nbSeeders: 0, nbLeechers: 0 } })
    expect(screen.getByText(/Nobody is sharing this right now./)).toBeInTheDocument()
  })

  it('opens the description page in a new tab, safely', () => {
    setup({ expanded: true })
    const link = screen.getByRole('link', { name: 'Description page' })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('leaves the description link out when there is none', () => {
    setup({ expanded: true, result: { ...result, descrLink: '' } })
    expect(screen.queryByRole('link', { name: 'Description page' })).not.toBeInTheDocument()
  })
})
