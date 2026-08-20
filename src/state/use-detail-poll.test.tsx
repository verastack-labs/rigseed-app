import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useDetailPoll } from '@/state/use-detail-poll'

const properties = vi.fn()
const files = vi.fn()

vi.mock('@/services/api-context', () => ({
  useApi: () => ({
    torrents: {
      properties: (hash: string) => properties(hash),
      files: (hash: string) => files(hash),
      trackers: () => Promise.resolve([]),
    },
    sync: { torrentPeers: () => Promise.resolve({ peers: {} }) },
  }),
}))

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
})
