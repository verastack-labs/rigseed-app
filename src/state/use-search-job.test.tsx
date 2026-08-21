import { cleanup, render, waitFor } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useSearchJob } from '@/state/use-search-job'

const start = vi.fn()
const stop = vi.fn()
const remove = vi.fn()
const results = vi.fn()
const plugins = vi.fn()

const api = { search: { start, stop, remove, results, plugins } }
const holder = { current: api }
vi.mock('@/services/api-context', () => ({ useApi: () => holder.current }))

let latest: ReturnType<typeof useSearchJob>

function Probe() {
  const state = useSearchJob(10)
  useEffect(() => {
    latest = state
  })
  return null
}

const hit = (name: string, site = 'https://linuxtracker.org') => ({
  fileName: name,
  fileSize: 100,
  fileUrl: 'magnet:?xt=urn:btih:1',
  descrLink: `${site}/x`,
  siteUrl: site,
  nbSeeders: 5,
  nbLeechers: 1,
})

beforeEach(() => {
  vi.clearAllMocks()
  holder.current = api
  plugins.mockResolvedValue([
    { name: 'lt', fullName: 'LinuxTracker', url: 'https://linuxtracker.org' },
  ])
  start.mockResolvedValue({ id: 7 })
  stop.mockResolvedValue(undefined)
  remove.mockResolvedValue(undefined)
  results.mockResolvedValue({ results: [], status: 'Stopped', total: 0 })
})

afterEach(cleanup)

describe('useSearchJob', () => {
  it('starts idle and asks for nothing', async () => {
    render(<Probe />)
    await waitFor(() => expect(latest).toBeDefined())
    expect(latest.phase).toBe('idle')
    expect(start).not.toHaveBeenCalled()
  })

  it('refuses to start on an empty query', async () => {
    render(<Probe />)
    await waitFor(() => expect(latest).toBeDefined())
    await latest.run('   ')
    expect(start).not.toHaveBeenCalled()
  })

  it('replaces results rather than accumulating them', async () => {
    // search/results answers with the whole set each time, not a delta.
    // Appending would multiply every hit by the number of polls.
    results
      .mockResolvedValueOnce({ results: [hit('a')], status: 'Running', total: 1 })
      .mockResolvedValue({ results: [hit('a'), hit('b')], status: 'Stopped', total: 2 })

    render(<Probe />)
    await waitFor(() => expect(latest).toBeDefined())
    await latest.run('ubuntu')

    await waitFor(() => expect(latest.phase).toBe('complete'))
    expect(latest.results.map((r) => r.fileName)).toEqual(['a', 'b'])
  })

  it('names the engine each hit came from', async () => {
    results.mockResolvedValue({ results: [hit('a')], status: 'Stopped', total: 1 })
    render(<Probe />)
    await waitFor(() => expect(latest).toBeDefined())
    await latest.run('ubuntu')
    await waitFor(() => expect(latest.results).toHaveLength(1))
    expect(latest.results[0]?.engine).toBe('LinuxTracker')
  })

  it('deletes the previous job before starting the next', async () => {
    // Five concurrent jobs is the daemon's limit, and only delete frees a
    // slot. Without this the screen stops working after the fifth query and
    // says nothing about why.
    render(<Probe />)
    await waitFor(() => expect(latest).toBeDefined())

    await latest.run('one')
    await waitFor(() => expect(latest.phase).toBe('complete'))
    expect(remove).not.toHaveBeenCalled()

    await latest.run('two')
    expect(remove).toHaveBeenCalledWith(7)
  })

  it('deletes the job when the screen goes', async () => {
    const view = render(<Probe />)
    await waitFor(() => expect(latest).toBeDefined())
    await latest.run('ubuntu')
    await waitFor(() => expect(latest.phase).toBe('complete'))

    view.unmount()
    await waitFor(() => expect(remove).toHaveBeenCalledWith(7))
  })

  it('goes complete on stop rather than polling on', async () => {
    results.mockResolvedValue({ results: [hit('a')], status: 'Running', total: 1 })
    render(<Probe />)
    await waitFor(() => expect(latest).toBeDefined())
    await latest.run('ubuntu')
    await waitFor(() => expect(latest.phase).toBe('searching'))

    await latest.stop()
    await waitFor(() => expect(latest.phase).toBe('complete'))
    expect(stop).toHaveBeenCalledWith(7)
  })

  it('blocks with a reason when the daemon refuses to start', async () => {
    // No Python on the host answers 409 here, which is a state the screen
    // has to explain rather than spin through.
    start.mockRejectedValue(new Error('409'))
    render(<Probe />)
    await waitFor(() => expect(latest).toBeDefined())
    await latest.run('ubuntu')

    await waitFor(() => expect(latest.phase).toBe('blocked'))
    expect(latest.error).toBe('409')
  })

  it('drops the job through the client that made it when the connection changes', async () => {
    const view = render(<Probe />)
    await waitFor(() => expect(latest).toBeDefined())
    await latest.run('ubuntu')
    await waitFor(() => expect(latest.phase).toBe('complete'))

    holder.current = { search: { start, stop, remove, results, plugins } }
    view.rerender(<Probe />)

    await waitFor(() => expect(remove).toHaveBeenCalledWith(7))
    expect(latest.phase).toBe('idle')
    expect(latest.results).toHaveLength(0)
  })
})
