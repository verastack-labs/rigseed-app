import { describe, expect, it, vi } from 'vitest'

import { createClient } from '@/services/client'
import { createMockTransport } from '@/services/mock-transport'
import { createTorrentsApi } from '@/services/torrents'
import type { Transport } from '@/services/transport'
import type { MainData } from '@/types/qbittorrent'

/** Captures what `add` puts on the wire without needing a daemon. */
function capturing() {
  const postForm = vi.fn<Transport['postForm']>(() => Promise.resolve(undefined as never))
  const transport = {
    get: vi.fn(),
    post: vi.fn(),
    postForm,
  } as unknown as Transport
  return { api: createTorrentsApi(transport), postForm }
}

/** The FormData of the single call made. */
function sent(postForm: ReturnType<typeof capturing>['postForm']): FormData {
  expect(postForm).toHaveBeenCalledOnce()
  return postForm.mock.calls[0]![1]
}

describe('torrents/add encoding', () => {
  it('joins links with newlines and files under one key', async () => {
    const { api, postForm } = capturing()
    const a = new File(['d8:announce'], 'first.torrent')
    const b = new File(['d8:announce'], 'second.torrent')

    await api.add({ urls: ['magnet:?xt=urn:btih:aaa', 'magnet:?xt=urn:btih:bbb'], files: [a, b] })

    const form = sent(postForm)
    expect(form.get('urls')).toBe('magnet:?xt=urn:btih:aaa\nmagnet:?xt=urn:btih:bbb')
    expect(form.getAll('torrents')).toHaveLength(2)
  })

  it('sends booleans even when false', async () => {
    const { api, postForm } = capturing()

    // paused=false is the whole point of the Start torrent switch. Dropping
    // falsey values, which is the obvious way to write this, would silently
    // turn "add and start" into whatever the daemon's default happens to be.
    await api.add({ urls: ['magnet:?xt=urn:btih:aaa'], paused: false, autoTMM: false })

    const form = sent(postForm)
    expect(form.get('paused')).toBe('false')
    expect(form.get('autoTMM')).toBe('false')
  })

  it('omits an empty save path rather than sending one', async () => {
    const { api, postForm } = capturing()

    // An empty savepath is not "use the default", it is an explicit override
    // of it, and combined with autoTMM it puts the daemon somewhere the UI
    // never asked for.
    await api.add({ urls: ['magnet:?xt=urn:btih:aaa'], savepath: '', category: '', tags: [] })

    const form = sent(postForm)
    expect(form.has('savepath')).toBe(false)
    expect(form.has('category')).toBe(false)
    expect(form.has('tags')).toBe(false)
  })

  it('omits options that were never set', async () => {
    const { api, postForm } = capturing()
    await api.add({ urls: ['magnet:?xt=urn:btih:aaa'] })

    const form = sent(postForm)
    expect(form.has('paused')).toBe(false)
    expect(form.has('skip_checking')).toBe(false)
  })
})

describe('adding against the mock', () => {
  /** Polls until the added torrent shows up, since it arrives on a diff. */
  async function poll(api: ReturnType<typeof createClient>, rid: number) {
    const data: MainData = await api.sync.maindata(rid)
    return data
  }

  it('turns up in the next sync as a complete torrent, not a patch', async () => {
    const api = createClient(createMockTransport({ torrentCount: 3 }))
    const first = await poll(api, 0)

    await api.torrents.add({
      urls: ['magnet:?xt=urn:btih:deadbeef&dn=Sintel+2010+1080p'],
      category: 'Film',
      paused: false,
    })

    const next = await poll(api, first.rid)
    const added = next.torrents?.['deadbeef']

    // A hash the caller has never seen has to arrive whole. Sending it as a
    // diff would create a torrent with a progress and no name.
    expect(added).toMatchObject({
      name: 'Sintel 2010 1080p',
      category: 'Film',
      state: 'downloading',
    })
    expect(added?.size).toBeGreaterThan(0)
    // Not exactly zero: the same poll that first reports the torrent has also
    // advanced the world by a tick, which is what a real daemon does too.
    expect(added?.progress).toBeLessThan(0.01)
  })

  it('honours paused, and falls back to the info hash when a magnet has no name', async () => {
    const api = createClient(createMockTransport({ torrentCount: 2 }))
    const first = await poll(api, 0)

    await api.torrents.add({ urls: ['magnet:?xt=urn:btih:c0ffee'], paused: true })

    const next = await poll(api, first.rid)
    expect(next.torrents?.['c0ffee']).toMatchObject({ name: 'c0ffee', state: 'stoppedDL' })
  })

  it('makes a category usable immediately after creating it', async () => {
    const api = createClient(createMockTransport({ torrentCount: 2 }))
    const first = await poll(api, 0)

    await api.torrents.createCategory('Documentaries', '/downloads/docs')

    // The inline creator creates and selects in one step, so this has to be
    // true on the very next poll rather than after a refresh.
    const next = await poll(api, first.rid)
    expect(next.categories).toMatchObject({
      Documentaries: { name: 'Documentaries', savePath: '/downloads/docs' },
    })
    expect(await api.torrents.categories()).toHaveProperty('Documentaries')

    // And only once: the diff carries what is new, not the whole list again.
    const third = await poll(api, next.rid)
    expect(third.categories).toBeUndefined()
  })

  it('makes a tag usable immediately after creating it', async () => {
    const api = createClient(createMockTransport({ torrentCount: 2 }))
    const first = await poll(api, 0)

    await api.torrents.createTags(['rare'])

    const next = await poll(api, first.rid)
    expect(next.tags).toEqual(['rare'])
    expect(await api.torrents.tags()).toContain('rare')

    const third = await poll(api, next.rid)
    expect(third.tags).toBeUndefined()
  })

  it('reports free space, which has no endpoint of its own', async () => {
    const api = createClient(createMockTransport())
    const first = await poll(api, 0)
    expect(first.server_state?.free_space_on_disk).toBeGreaterThan(0)
  })

  it('keeps created categories out of a second transport', async () => {
    const one = createClient(createMockTransport())
    const two = createClient(createMockTransport())

    await one.torrents.createCategory('Only Here', '/tmp')

    expect(await one.torrents.categories()).toHaveProperty('Only Here')
    expect(await two.torrents.categories()).not.toHaveProperty('Only Here')
  })
})

describe('labels through the mock', () => {
  const api = () => createTorrentsApi(createMockTransport())

  it('creates a category with its save path', async () => {
    const torrents = api()
    await torrents.createCategory('Documentaries', '/media/docs')
    const all = await torrents.categories()
    expect(all['Documentaries']).toEqual({ name: 'Documentaries', savePath: '/media/docs' })
  })

  it('edits the save path without touching the name', async () => {
    // editCategory is not a rename. The name is the key of what to change,
    // so a rename has to be create, move, remove, done explicitly.
    const torrents = api()
    await torrents.createCategory('Docs', '/old')
    await torrents.editCategory('Docs', '/new')
    const all = await torrents.categories()
    expect(all['Docs']?.savePath).toBe('/new')
    expect(Object.keys(all)).toContain('Docs')
  })

  it('removing a category leaves its torrents behind, uncategorised', async () => {
    const torrents = api()
    await torrents.createCategory('Temporary', '/tmp')
    await torrents.removeCategories(['Temporary'])
    expect(Object.keys(await torrents.categories())).not.toContain('Temporary')
  })

  it('creates and deletes tags', async () => {
    const torrents = api()
    await torrents.createTags(['archive'])
    expect(await torrents.tags()).toContain('archive')
    await torrents.deleteTags(['archive'])
    expect(await torrents.tags()).not.toContain('archive')
  })

  it('a deleted tag comes off the torrents that carried it', async () => {
    const torrents = api()
    const before = await torrents.info()
    const carried = before.filter((t) => t.tags.split(',').includes('iso'))
    expect(carried.length).toBeGreaterThan(0)

    await torrents.deleteTags(['iso'])
    const after = await torrents.info()
    expect(after.every((t) => !t.tags.split(',').includes('iso'))).toBe(true)
  })
})
