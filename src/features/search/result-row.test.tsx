import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ResultRow } from '@/features/search/result-row'

const openUrl = vi.fn<(url: string) => Promise<void>>(() => Promise.resolve())
vi.mock('@/services/shell', () => ({
  canReachDesktop: () => true,
  openUrl: (url: string) => openUrl(url),
}))
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

  // This was an anchor with target="_blank", which does nothing in a Tauri
  // window: there is no tab strip to open a tab in. It looked like a link,
  // took the click, and went nowhere.
  it('hands the description page to the system browser', () => {
    openUrl.mockClear()
    setup({ expanded: true })

    fireEvent.click(screen.getByRole('button', { name: 'Description page' }))

    expect(openUrl).toHaveBeenCalledWith('https://linuxtracker.org/x')
  })

  it('never navigates the app window itself', () => {
    setup({ expanded: true })
    // An anchor here would strand somebody on a tracker's page inside a window
    // with no address bar and no way back.
    expect(screen.queryByRole('link', { name: 'Description page' })).not.toBeInTheDocument()
  })

  it('leaves the description control out when there is no link', () => {
    setup({ expanded: true, result: { ...result, descrLink: '' } })
    expect(screen.queryByRole('button', { name: 'Description page' })).not.toBeInTheDocument()
  })
})
