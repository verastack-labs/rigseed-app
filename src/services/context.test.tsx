import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiProvider } from '@/services/context'
import { useConnection } from '@/services/api-context'
import { useTorrentStore } from '@/state/torrent-store'
import type * as ConnectModule from '@/services/connect'
import type { ConnectionState, DaemonTarget } from '@/services/connect'

const connect = vi.fn()
const mockConnection = vi.fn((reason: string): ConnectionState => ({
  status: 'mock',
  client: {} as never,
  reason,
}))

vi.mock('@/services/connect', async (importOriginal) => {
  const actual = await importOriginal<typeof ConnectModule>()
  return {
    ...actual,
    connect: (target: DaemonTarget, options?: unknown) => connect(target, options),
    mockConnection: (reason: string) => mockConnection(reason),
  }
})

const target: DaemonTarget = {
  baseUrl: 'http://127.0.0.1:8080',
  username: 'admin',
  password: 'pw',
  label: '127.0.0.1:8080',
}

const connected = (version: string): ConnectionState => ({
  status: 'connected',
  client: { id: version } as never,
  version,
  webApiVersion: '2.15.1',
  label: '127.0.0.1:8080',
})

function Probe() {
  const state = useConnection()
  return (
    <span data-testid="state">
      {state.status}
      {state.status === 'connected' ? `:${state.version}` : ''}
      {state.status === 'mock' ? `:${state.reason}` : ''}
    </span>
  )
}

const shown = () => screen.getByTestId('state').textContent

/**
 * Advance in slices, so the retry chain can move one link per slice.
 *
 * Each retry is a link: a timer fires, `setRetry` runs, React renders, and
 * only then does the effect schedule the next timer and fire the attempt.
 * React flushes that render on a MessageChannel task, which is a macrotask,
 * and `advanceTimersByTimeAsync` only yields microtasks between the timers it
 * runs. So one long jump never gets past the first link.
 *
 * Measured rather than assumed, because the obvious explanation is wrong:
 * flushing React before the jump does not help, and neither do fifty
 * microtask ticks after it. One real macrotask after the jump advances the
 * chain by exactly one link. Slicing gives it one boundary per slice.
 */
async function advance(ms: number) {
  for (let left = ms; left > 0; left -= 1_000) await vi.advanceTimersByTimeAsync(1_000)
}

describe('ApiProvider reconnection', () => {
  beforeEach(() => {
    connect.mockReset()
    mockConnection.mockClear()
    useTorrentStore.getState().reset()
    useTorrentStore.getState().setReachable(true)
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  it('logs in again when the daemon stops answering', async () => {
    // The case this exists for: the session cookie dies with the daemon
    // process, every request after that is a 403, and the first attempt only
    // ever ran on mount.
    connect.mockResolvedValueOnce(connected('v5.2.3')).mockResolvedValueOnce(connected('v5.2.4'))

    render(
      <ApiProvider target={target}>
        <Probe />
      </ApiProvider>,
    )
    await waitFor(() => expect(shown()).toBe('connected:v5.2.3'))

    useTorrentStore.getState().setReachable(false)
    await advance(4_000)

    await waitFor(() => expect(shown()).toBe('connected:v5.2.4'))
  })

  it('keeps the live connection when a reconnection fails', async () => {
    // The whole reason this is separate from the startup path. That one falls
    // back to the mock, which here would replace a running app's real
    // torrents with sample data because a daemon was restarting.
    connect
      .mockResolvedValueOnce(connected('v5.2.3'))
      .mockResolvedValue({ status: 'failed', reason: 'refused' } satisfies ConnectionState)

    render(
      <ApiProvider target={target}>
        <Probe />
      </ApiProvider>,
    )
    await waitFor(() => expect(shown()).toBe('connected:v5.2.3'))

    // Cleared after startup: the provider seeds its state with a mock while
    // it works out where the daemon is, so one call is expected and is not
    // the fall back this test is about.
    mockConnection.mockClear()

    useTorrentStore.getState().setReachable(false)
    await advance(10_000)

    expect(shown()).toBe('connected:v5.2.3')
    expect(mockConnection).not.toHaveBeenCalled()
  })

  it('backs off rather than hammering a daemon that will not answer', async () => {
    // qBittorrent bans an address after a handful of failed logins, so a loop
    // at a fixed short interval could lock rigseed out of a daemon that was
    // merely misconfigured.
    connect
      .mockResolvedValueOnce(connected('v5.2.3'))
      .mockResolvedValue({ status: 'failed', reason: 'refused' } satisfies ConnectionState)

    render(
      <ApiProvider target={target}>
        <Probe />
      </ApiProvider>,
    )
    await waitFor(() => expect(shown()).toBe('connected:v5.2.3'))
    connect.mockClear()

    useTorrentStore.getState().setReachable(false)
    await advance(60_000)

    // 3s, 6s, 12s, 24s, then 30s: six attempts inside a minute rather than
    // the twenty a fixed three second interval would make.
    expect(connect.mock.calls.length).toBeLessThanOrEqual(6)
    expect(connect.mock.calls.length).toBeGreaterThan(1)
  })

  it('does not retry a connection that never worked', async () => {
    // Startup failure has its own screen and its own explanation. Retrying it
    // would swap sample data for real data underneath somebody, unasked.
    connect.mockResolvedValue({ status: 'failed', reason: 'refused' } satisfies ConnectionState)

    render(
      <ApiProvider target={target}>
        <Probe />
      </ApiProvider>,
    )
    await waitFor(() => expect(shown()).toMatch(/^mock/))
    connect.mockClear()

    useTorrentStore.getState().setReachable(false)
    await advance(60_000)

    expect(connect).not.toHaveBeenCalled()
  })
})
