import { describe, expect, it } from 'vitest'

import { createLogApi, levelOf } from '@/services/log'
import { createMockTransport } from '@/services/mock-transport'

const api = () => createLogApi(createMockTransport())

describe('levelOf', () => {
  it('reads the bitmask, not an index', () => {
    // 1, 2, 4, 8 rather than 0, 1, 2, 3. Read as an index, every warning
    // lands in the wrong bucket and critical disappears entirely.
    expect(levelOf(1)).toBe('normal')
    expect(levelOf(2)).toBe('info')
    expect(levelOf(4)).toBe('warning')
    expect(levelOf(8)).toBe('critical')
  })

  it('treats anything it does not know as normal', () => {
    expect(levelOf(0)).toBe('normal')
    expect(levelOf(16)).toBe('normal')
  })
})

describe('log through the mock', () => {
  it('returns everything for a cold load', async () => {
    const entries = await api().main(-1)
    expect(entries.length).toBeGreaterThan(0)
    expect(entries[0]).toHaveProperty('message')
  })

  it('honours the tail cursor', async () => {
    // A Follow loop that gets the whole log back every tick prepends
    // duplicates for ever, and it looks fine on a log with twelve lines.
    const log = api()
    const all = await log.main(-1)
    const last = all[all.length - 1]!
    expect(await log.main(last.id)).toEqual([])

    const fromMiddle = await log.main(all[0]!.id)
    expect(fromMiddle.length).toBe(all.length - 1)
  })

  it('asks for every level, and filters in the browser', async () => {
    // Filtering server-side would advance the cursor past entries the user
    // could then never see by unmuting.
    const entries = await api().main(-1)
    const levels = new Set(entries.map((e) => levelOf(e.type)))
    expect(levels.has('warning')).toBe(true)
    expect(levels.has('critical')).toBe(true)
  })

  it('reports bans with a reason', async () => {
    const bans = await api().peers(-1)
    expect(bans[0]).toHaveProperty('ip')
    expect(bans.some((b) => b.reason === 'banned by user')).toBe(true)
    expect(bans.some((b) => b.reason === 'IP filter')).toBe(true)
  })
})
