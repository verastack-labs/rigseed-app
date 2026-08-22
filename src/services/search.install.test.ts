import { describe, expect, it, vi } from 'vitest'

import { awaitInstalled, pluginNameFor, type SearchApi } from '@/services/search'

const plugin = (name: string) => ({
  name,
  fullName: name,
  url: `https://${name}.example`,
  version: '1.0',
  enabled: true,
  supportedCategories: [],
})

/** A `plugins()` that answers a different list on each call. */
const listing = (...rounds: string[][]) => {
  const answers = [...rounds]
  const plugins = vi.fn(async () =>
    (answers.length > 1 ? answers.shift()! : answers[0]!).map(plugin),
  )
  return { plugins } as unknown as SearchApi & { plugins: typeof plugins }
}

describe('pluginNameFor', () => {
  it('takes the file stem, which is what the daemon names it', () => {
    expect(
      pluginNameFor(
        'https://raw.githubusercontent.com/qbittorrent/search-plugins/master/nova3/engines/piratebay.py',
      ),
    ).toBe('piratebay')
  })

  it('handles a Windows path as well as a URL', () => {
    // The field takes either, and the daemon accepts either.
    expect(pluginNameFor('C:\\plugins\\torlock.py')).toBe('torlock')
  })

  it('is case insensitive about the extension', () => {
    expect(pluginNameFor('/tmp/EZTV.PY')).toBe('EZTV')
  })
})

describe('awaitInstalled', () => {
  it('returns as soon as everything asked for is present', async () => {
    const api = listing(['piratebay', 'eztv'])
    const result = await awaitInstalled(api, ['piratebay'], { everyMs: 1 })
    expect(result.missing).toEqual([])
    expect(result.installed).toEqual(['piratebay'])
    expect(api.plugins).toHaveBeenCalledOnce()
  })

  it('keeps looking while the daemon is still fetching', async () => {
    // The whole reason this exists: installPlugin answers 200 before it has
    // downloaded anything, so the first read is expected to come back short.
    const api = listing([], [], ['piratebay'])
    const result = await awaitInstalled(api, ['piratebay'], { everyMs: 1 })
    expect(result.missing).toEqual([])
    expect(api.plugins).toHaveBeenCalledTimes(3)
  })

  it('reports what never arrived rather than waiting forever', async () => {
    const api = listing([])
    const result = await awaitInstalled(api, ['piratebay', 'eztv'], { attempts: 2, everyMs: 1 })
    expect(result.missing).toEqual(['piratebay', 'eztv'])
    expect(result.installed).toEqual([])
    expect(api.plugins).toHaveBeenCalledTimes(2)
  })

  it('separates what landed from what did not', async () => {
    // A bulk install where one plugin is rejected and the rest are fine. The
    // message has to name the one, not call the whole thing a failure.
    const api = listing(['eztv'])
    const result = await awaitInstalled(api, ['eztv', 'piratebay'], { attempts: 2, everyMs: 1 })
    expect(result.installed).toEqual(['eztv'])
    expect(result.missing).toEqual(['piratebay'])
  })

  it('does not treat an unreadable list as a failed install', async () => {
    // A list that could not be read this time says nothing about the install.
    const plugins = vi
      .fn<() => Promise<ReturnType<typeof plugin>[]>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue([plugin('piratebay')])
    const api = { plugins } as unknown as SearchApi

    const result = await awaitInstalled(api, ['piratebay'], { everyMs: 1 })
    expect(result.missing).toEqual([])
  })

  it('waits between attempts but not after the last one', async () => {
    // A wait after the final read is pure delay before an answer that is
    // already decided. Counted rather than timed: a wall clock assertion on
    // setTimeout is a flake, since the timer routinely overshoots.
    const waits = vi.spyOn(globalThis, 'setTimeout')
    const api = listing([])
    await awaitInstalled(api, ['nope'], { attempts: 3, everyMs: 1 })
    expect(waits).toHaveBeenCalledTimes(2)
    waits.mockRestore()
  })
})
