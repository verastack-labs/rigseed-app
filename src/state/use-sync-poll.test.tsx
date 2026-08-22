import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useSyncPoll } from '@/state/use-sync-poll'
import { useTorrentStore } from '@/state/torrent-store'

const maindata = vi.fn()

// One object, not a fresh one per render. The poll keys its effect on the api
// identity, so a double that rebuilds itself restarts the loop every render.
const api = { sync: { maindata } }
vi.mock('@/services/api-context', () => ({ useApi: () => api }))

function Probe() {
  // A short interval so a test does not wait a real second per tick.
  useSyncPoll(5)
  return null
}

const reachable = () => useTorrentStore.getState().reachable
const ok = (rid: number) => ({ rid, full_update: true, torrents: {} })

describe('useSyncPoll reachability', () => {
  beforeEach(() => {
    maindata.mockReset()
    useTorrentStore.getState().reset()
    useTorrentStore.getState().setReachable(true)
  })

  it('starts out believing the daemon is there', () => {
    // Starting on unreachable would grey the toolbar out for the first
    // second of every launch, before anything had actually failed.
    expect(reachable()).toBe(true)
  })

  it('rides out a single dropped poll', async () => {
    // At a one second interval one miss is a blip. Greying out the controls
    // for it would flicker on any busy daemon.
    maindata.mockRejectedValueOnce(new Error('boom')).mockResolvedValue(ok(1))
    render(<Probe />)
    await waitFor(() => expect(maindata.mock.calls.length).toBeGreaterThan(2))
    expect(reachable()).toBe(true)
  })

  it('gives up after two in a row', async () => {
    maindata.mockRejectedValue(new Error('boom'))
    render(<Probe />)
    await waitFor(() => expect(reachable()).toBe(false))
  })

  it('comes back on the next answer', async () => {
    maindata.mockRejectedValue(new Error('boom'))
    render(<Probe />)
    await waitFor(() => expect(reachable()).toBe(false))

    maindata.mockResolvedValue(ok(1))
    await waitFor(() => expect(reachable()).toBe(true))
  })

  it('keeps the last known data rather than blanking it', async () => {
    // The connection-loss rule. What is on screen is the best answer
    // available, and throwing it away leaves the user with nothing.
    // A complete torrent, not a patch. The store drops a first sighting that
    // arrives incomplete, on purpose: a diff for a hash it has never seen used
    // to mint a torrent out of two speed fields and no state.
    maindata.mockResolvedValueOnce({
      rid: 1,
      full_update: true,
      torrents: {
        abc: {
          hash: 'abc',
          name: 'kept.iso',
          size: 100,
          progress: 0.5,
          dlspeed: 0,
          upspeed: 0,
          state: 'downloading',
          category: '',
          tags: '',
          ratio: 0,
        },
      },
    })
    render(<Probe />)
    await waitFor(() => expect(useTorrentStore.getState().torrents.abc).toBeTruthy())

    maindata.mockRejectedValue(new Error('boom'))
    await waitFor(() => expect(reachable()).toBe(false))
    expect(useTorrentStore.getState().torrents.abc?.name).toBe('kept.iso')
  })
})
