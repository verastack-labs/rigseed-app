import { describe, expect, it, vi } from 'vitest'

import { awaitInstalled, awaitUpdated, pluginNameFor, type SearchApi } from '@/services/search'

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

describe('awaitUpdated', () => {
  const versioned = (rounds: Record<string, string>[]) => {
    const answers = [...rounds]
    const plugins = vi.fn(async () => {
      const round = answers.length > 1 ? answers.shift()! : answers[0]!
      return Object.entries(round).map(([name, version]) => ({ ...plugin(name), version }))
    })
    return { plugins } as unknown as SearchApi & { plugins: typeof plugins }
  }

  it('reports what actually changed version', async () => {
    // The only fact available. updatePlugins answers before it has fetched
    // anything, and no endpoint says what would update, so before-and-after
    // versions are the whole signal.
    const api = versioned([{ piratebay: '2.0', eztv: '1.0' }])
    const before = new Map([
      ['piratebay', '1.9'],
      ['eztv', '1.0'],
    ])
    const { updated } = await awaitUpdated(api, before, { everyMs: 1 })
    expect(updated).toEqual(['piratebay'])
  })

  it('keeps looking while the daemon is still fetching', async () => {
    const api = versioned([{ piratebay: '1.9' }, { piratebay: '1.9' }, { piratebay: '2.0' }])
    const { updated } = await awaitUpdated(api, new Map([['piratebay', '1.9']]), { everyMs: 1 })
    expect(updated).toEqual(['piratebay'])
    expect(api.plugins).toHaveBeenCalledTimes(3)
  })

  it('reports nothing rather than waiting forever when everything is current', async () => {
    // The common case, and the one a silent button never answered.
    const api = versioned([{ piratebay: '2.0' }])
    const { updated } = await awaitUpdated(api, new Map([['piratebay', '2.0']]), {
      attempts: 2,
      everyMs: 1,
    })
    expect(updated).toEqual([])
    expect(api.plugins).toHaveBeenCalledTimes(2)
  })

  it('does not count a plugin that arrived during the check as an update', async () => {
    // Installed in another window, or by the starter list moments earlier. It
    // is new, not updated, and calling it updated is a claim about work this
    // button did not do.
    const api = versioned([{ piratebay: '2.0', torlock: '1.0' }])
    const { updated } = await awaitUpdated(api, new Map([['piratebay', '2.0']]), {
      attempts: 2,
      everyMs: 1,
    })
    expect(updated).toEqual([])
  })

  it('does not treat an unreadable list as nothing having happened', async () => {
    const plugins = vi
      .fn<() => Promise<(ReturnType<typeof plugin> & { version: string })[]>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue([{ ...plugin('piratebay'), version: '2.0' }])
    const api = { plugins } as unknown as SearchApi

    const { updated } = await awaitUpdated(api, new Map([['piratebay', '1.9']]), { everyMs: 1 })
    expect(updated).toEqual(['piratebay'])
  })
})
