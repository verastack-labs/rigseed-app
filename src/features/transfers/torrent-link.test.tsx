import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { TorrentLink } from '@/features/transfers/torrent-link'

const at = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('TorrentLink', () => {
  it('points at the torrent by hash', () => {
    at(<TorrentLink hash="abc123" name="ubuntu.iso" />)
    expect(screen.getByRole('link', { name: 'ubuntu.iso' })).toHaveAttribute(
      'href',
      '/torrent/abc123',
    )
  })

  it('covers the card when stretched', () => {
    // The whole card opens the torrent, and this is how. The alternative was a
    // click handler on the card plus stopPropagation on every checkbox, menu
    // and button inside it, where one missed call is a card that navigates
    // when you meant to tick it.
    at(<TorrentLink stretch hash="abc123" name="ubuntu.iso" />)
    expect(screen.getByRole('link').getAttribute('class')).toContain('after:absolute')
    expect(screen.getByRole('link').getAttribute('class')).toContain('after:inset-0')
  })

  it('does not cover anything unless asked', () => {
    at(<TorrentLink hash="abc123" name="ubuntu.iso" />)
    expect(screen.getByRole('link').getAttribute('class')).not.toContain('after:absolute')
  })

  it('keeps the full name reachable when the visible text is truncated', () => {
    const name = 'a-very-long-release-name-that-will-be-clipped-in-every-layout.iso'
    at(<TorrentLink hash="abc123" name={name} className="truncate" />)
    expect(screen.getByRole('link')).toHaveAttribute('title', name)
  })
})
