import { cleanup, render, waitFor } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useLogTail } from '@/state/use-log-tail'

const main = vi.fn()
const peers = vi.fn()
const api = { log: { main, peers } }
vi.mock('@/services/api-context', () => ({ useApi: () => api }))

let latest: ReturnType<typeof useLogTail>

function Probe() {
  const state = useLogTail(50)
  useEffect(() => {
    latest = state
  })
  return null
}

const entry = (id: number, type = 1) => ({
  id,
  message: `line ${id}`,
  timestamp: 1_787_249_000 + id,
  type,
})

beforeEach(() => {
  vi.clearAllMocks()
  peers.mockResolvedValue([])
})

afterEach(cleanup)

describe('useLogTail', () => {
  it('shows newest first', async () => {
    // A log is read from the top, and the interesting line is almost always
    // the last thing that happened.
    main.mockResolvedValueOnce([entry(0), entry(1), entry(2)]).mockResolvedValue([])
    render(<Probe />)
    await waitFor(() => expect(latest.entries).toHaveLength(3))
    expect(latest.entries.map((e) => e.id)).toEqual([2, 1, 0])
  })

  it('asks only for what it has not seen', async () => {
    main.mockResolvedValueOnce([entry(0), entry(1)]).mockResolvedValue([])
    render(<Probe />)
    await waitFor(() => expect(latest.entries).toHaveLength(2))
    await waitFor(() => expect(main.mock.calls.length).toBeGreaterThan(1))
    // First call is a cold load, every one after it carries the tail cursor.
    expect(main.mock.calls[0]?.[0]).toBe(-1)
    expect(main.mock.calls[1]?.[0]).toBe(1)
  })

  it('keeps polling while paused, and counts what is waiting', async () => {
    // Stopping the poll would let the daemon's own ring buffer scroll past
    // whatever happened during the pause, and log/main only answers forward
    // from an id it still holds.
    main.mockResolvedValueOnce([entry(0)]).mockResolvedValue([])
    render(<Probe />)
    await waitFor(() => expect(latest.entries).toHaveLength(1))

    latest.setFollowing(false)
    await waitFor(() => expect(latest.following).toBe(false))

    main.mockResolvedValueOnce([entry(1), entry(2)]).mockResolvedValue([])
    await waitFor(() => expect(latest.heldBack).toBe(2))
    // Frozen, not empty.
    expect(latest.entries).toHaveLength(1)
  })

  it('lets the held entries in when following resumes', async () => {
    main.mockResolvedValueOnce([entry(0)]).mockResolvedValue([])
    render(<Probe />)
    await waitFor(() => expect(latest.entries).toHaveLength(1))

    latest.setFollowing(false)
    await waitFor(() => expect(latest.following).toBe(false))
    main.mockResolvedValueOnce([entry(1)]).mockResolvedValue([])
    await waitFor(() => expect(latest.heldBack).toBe(1))

    latest.setFollowing(true)
    await waitFor(() => expect(latest.entries).toHaveLength(2))
    expect(latest.heldBack).toBe(0)
  })

  it('clears the view without pretending to clear the daemon', async () => {
    main.mockResolvedValueOnce([entry(0), entry(1)]).mockResolvedValue([])
    render(<Probe />)
    await waitFor(() => expect(latest.entries).toHaveLength(2))

    latest.clear()
    await waitFor(() => expect(latest.entries).toHaveLength(0))
    // The cursor does not rewind, so cleared lines do not come back on the
    // next tick.
    await waitFor(() => expect(main.mock.calls.length).toBeGreaterThan(2))
    expect(latest.entries).toHaveLength(0)
  })

  it('reports an error without throwing away what it has', async () => {
    main.mockResolvedValueOnce([entry(0)]).mockRejectedValue(new Error('gone'))
    render(<Probe />)
    await waitFor(() => expect(latest.entries).toHaveLength(1))
    await waitFor(() => expect(latest.error).toBe('gone'))
    expect(latest.entries).toHaveLength(1)
  })
})
