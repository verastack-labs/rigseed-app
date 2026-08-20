import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useDetailPoll } from '@/state/use-detail-poll'

const properties = vi.fn()
const files = vi.fn()

const build = () => ({
  torrents: {
    properties: (hash: string) => properties(hash),
    files: (hash: string) => files(hash),
    trackers: () => Promise.resolve([]),
  },
  sync: { torrentPeers: () => Promise.resolve({ peers: {} }) },
})

// One object per connection, swappable. The provider hands out a mock client
// while it looks for a daemon and replaces it when it finds one.
const holder = { current: build() }
vi.mock('@/services/api-context', () => ({ useApi: () => holder.current }))

function Probe({ hash }: { hash: string }) {
  const { properties: props } = useDetailPoll(hash, 'general', 100_000)
  return <span data-testid="path">{props ? props.save_path : 'none'}</span>
}

describe('useDetailPoll', () => {
  it('does not show one torrent’s details under another’s hash', async () => {
    // Opening a second torrent used to show the first one's save path, hash
    // and file list until each request came back. Stale values that look
    // plausible are worse than a skeleton: nothing about them says they
    // belong to the wrong torrent.
    properties.mockImplementation((hash: string) =>
      Promise.resolve({ save_path: `/downloads/${hash}` }),
    )
    files.mockResolvedValue([])

    const { rerender } = render(<Probe hash="aaa" />)
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/downloads/aaa'))

    rerender(<Probe hash="bbb" />)
    // Cleared on the very first render under the new hash, before any request
    // has had a chance to answer.
    expect(screen.getByTestId('path')).toHaveTextContent('none')

    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/downloads/bbb'))
  })

  it('keeps what it has while polling the same torrent', async () => {
    // The other half: once loaded, a refetch must not blank the screen and
    // send it back through its loading state.
    properties.mockResolvedValue({ save_path: '/downloads/steady' })
    files.mockResolvedValue([])

    render(<Probe hash="ccc" />)
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/downloads/steady'))

    // Several renders later, still there.
    for (let i = 0; i < 5; i++) {
      expect(screen.getByTestId('path')).toHaveTextContent('/downloads/steady')
    }
  })

  it('drops what it has when the connection changes, not only the hash', async () => {
    // Same rule as the hash. This screen can be showing the sample torrent's
    // properties at the moment the real connection arrives underneath it.
    properties.mockResolvedValue({ save_path: '/sample' })
    files.mockResolvedValue([])

    const { rerender } = render(<Probe hash="aaa" />)
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/sample'))

    properties.mockResolvedValue({ save_path: '/real' })
    holder.current = build()
    rerender(<Probe hash="aaa" />)

    expect(screen.getByTestId('path')).toHaveTextContent('none')
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/real'))
  })
})
