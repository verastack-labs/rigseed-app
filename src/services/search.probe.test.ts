import { describe, expect, it, vi } from 'vitest'

import { probePython, type SearchApi } from '@/services/search'
import { ApiError } from '@/services/transport'

const api = (over: Partial<SearchApi> = {}) =>
  ({
    start: vi.fn().mockResolvedValue({ id: 7 }),
    remove: vi.fn().mockResolvedValue(undefined),
    ...over,
  }) as unknown as SearchApi

describe('probePython', () => {
  it('reads a 409 as the missing Python it is', async () => {
    // "Python must be installed to use the Search Engine", which is the only
    // way the daemon ever says so.
    const start = vi
      .fn()
      .mockRejectedValue(
        new ApiError(409, 'search/start', 'Python must be installed to use the Search Engine.'),
      )
    expect(await probePython(api({ start }))).toBe('missing')
  })

  it('reads a successful start as Python being fine', async () => {
    expect(await probePython(api())).toBe('ok')
  })

  it('queries no actual site', async () => {
    // The whole point of the probe: it has to answer without any request
    // leaving the machine, so it names a plugin that cannot exist.
    const start = vi.fn().mockResolvedValue({ id: 7 })
    await probePython(api({ start }))
    const [, plugins] = start.mock.calls[0] as [string, string]
    expect(plugins).toBe('__rigseed_probe__')
  })

  it('deletes the job it created', async () => {
    // Five concurrent jobs is the daemon's limit, and leaking one per visit
    // to this screen would reach it.
    const remove = vi.fn().mockResolvedValue(undefined)
    await probePython(api({ remove }))
    expect(remove).toHaveBeenCalledWith(7)
  })

  it('still answers when the cleanup fails', async () => {
    const remove = vi.fn().mockRejectedValue(new Error('busy'))
    await expect(probePython(api({ remove }))).resolves.toBe('ok')
  })

  it('says unknown rather than guessing on any other failure', async () => {
    // Announcing a missing Python because the daemon was briefly busy sends
    // somebody off to install something they already have.
    const start = vi.fn().mockRejectedValue(new ApiError(503, 'search/start', 'busy'))
    expect(await probePython(api({ start }))).toBe('unknown')

    const thrown = vi.fn().mockRejectedValue(new Error('network'))
    expect(await probePython(api({ start: thrown }))).toBe('unknown')
  })
})
