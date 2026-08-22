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

/** Every distinct value the hook has handed out, in order. */
const seen: string[] = []

function Probe({ hash, intervalMs = 100_000 }: { hash: string; intervalMs?: number }) {
  const { properties: props } = useDetailPoll(hash, 'general', intervalMs)
  const shown = props ? props.save_path : 'none'
  if (seen[seen.length - 1] !== shown) seen.push(shown)
  return <span data-testid="path">{shown}</span>
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

describe('useDetailPoll when the client is swapped', () => {
  it('stops the old loop instead of letting it poll forever', async () => {
    // The provider hands out a mock client while it looks for a daemon, then
    // replaces it. The stop flag used to be a ref shared across effect runs.
    //
    // The leak needs a request in flight across the swap: the old run's
    // cleanup sets the shared flag true and clears a timer that does not
    // exist yet, then the new run sets the flag back to false, and when the
    // old request finally resolves it sees a green light, writes its answer
    // and schedules another tick that nothing will ever clear.
    //
    // In the app that old loop was still bound to the mock, which answers
    // undefined for a hash it has never heard of, so the General tab fell to
    // its skeleton every other poll.
    let releaseMock: (value: unknown) => void = () => {}
    const mockProperties = vi.fn(
      () => new Promise((resolve) => { releaseMock = resolve }),
    )
    const realProperties = vi.fn(() => Promise.resolve({ save_path: '/downloads/real' }))

    const clientWith = (fn: () => Promise<unknown>) => ({
      torrents: {
        properties: fn,
        files: () => Promise.resolve([]),
        trackers: () => Promise.resolve([]),
      },
      sync: { torrentPeers: () => Promise.resolve({ peers: {} }) },
    })

    seen.length = 0
    holder.current = clientWith(mockProperties) as ReturnType<typeof build>
    const { rerender } = render(<Probe hash="zzz" intervalMs={20} />)
    await waitFor(() => expect(mockProperties).toHaveBeenCalled())

    // The daemon is found while the mock's request is still out.
    holder.current = clientWith(realProperties) as ReturnType<typeof build>
    rerender(<Probe hash="zzz" intervalMs={20} />)
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/downloads/real'))

    // Now let the stale request land.
    releaseMock(undefined)
    await new Promise((resolve) => setTimeout(resolve, 100))

    await new Promise((resolve) => setTimeout(resolve, 150))

    // Asserting the end state is not enough: the live loop overwrites the
    // stale answer within one interval, so the flicker leaves no trace by the
    // time the test looks. The sequence is where it shows.
    expect(seen.slice(seen.indexOf('/downloads/real'))).toEqual(['/downloads/real'])
  })

  it('reads an empty body as not loaded rather than as loaded-and-empty', async () => {
    // undefined is not a state this hook has. It reads as loaded at every
    // call site while being neither, which is what made the flicker hard to
    // place: the component saw a value that was not null and still fell
    // through to its skeleton.
    holder.current = build()
    properties.mockResolvedValue(undefined)
    files.mockResolvedValue([])

    render(<Probe hash="empty" />)
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('none'))
  })
})
