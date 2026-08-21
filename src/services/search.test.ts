import { describe, expect, it } from 'vitest'

import { createMockTransport } from '@/services/mock-transport'
import { createSearchApi, engineFor } from '@/services/search'
import type { SearchPlugin } from '@/types/qbittorrent'

const api = () => createSearchApi(createMockTransport())

const plugins: SearchPlugin[] = [
  {
    name: 'lt',
    fullName: 'LinuxTracker',
    url: 'https://linuxtracker.org',
    version: '1',
    enabled: true,
    supportedCategories: [],
  },
]

describe('engineFor', () => {
  it('matches a hit to its plugin by host', () => {
    // The API never says which engine returned a hit. The only link is that
    // a result's siteUrl and a plugin's url are the same site.
    expect(engineFor('https://linuxtracker.org/index.php?id=1', plugins)).toBe('LinuxTracker')
  })

  it('ignores www, which only one of the two usually carries', () => {
    expect(engineFor('https://www.linuxtracker.org/x', plugins)).toBe('LinuxTracker')
  })

  it('falls back to the host rather than to "unknown"', () => {
    // Still the thing a person would call the engine, which beats a label
    // that tells them nothing.
    expect(engineFor('https://archive.org/details/x', plugins)).toBe('archive.org')
  })

  it('says unknown only when there is no host to fall back to', () => {
    expect(engineFor('not a url', plugins)).toBe('unknown')
  })
})

describe('search through the mock', () => {
  it('starts a job and answers with its id', async () => {
    const search = api()
    const { id } = await search.start('ubuntu')
    expect(typeof id).toBe('number')
    expect((await search.status()).some((j) => j.id === id)).toBe(true)
  })

  it('reports Running before it reports Stopped', async () => {
    // Partial results are half of what this screen has to render, so a mock
    // that answered in full on the first poll would never exercise it.
    const search = api()
    const { id } = await search.start('ubuntu')

    const first = await search.results(id)
    expect(first.status).toBe('Running')

    const second = await search.results(id)
    expect(second.status).toBe('Stopped')
    expect(second.results.length).toBeGreaterThan(first.results.length)
  })

  it('frees the slot on delete, and only on delete', async () => {
    const search = api()
    const { id } = await search.start('ubuntu')

    await search.stop(id)
    expect((await search.status()).some((j) => j.id === id)).toBe(true)

    await search.remove(id)
    expect((await search.status()).some((j) => j.id === id)).toBe(false)
  })

  it('toggles a plugin', async () => {
    const search = api()
    await search.enablePlugin(['linuxtracker'], false)
    const after = await search.plugins()
    expect(after.find((p) => p.name === 'linuxtracker')?.enabled).toBe(false)
  })

  it('uninstalls a plugin', async () => {
    const search = api()
    await search.uninstallPlugin(['archivedotorg'])
    expect((await search.plugins()).map((p) => p.name)).not.toContain('archivedotorg')
  })
})
