import { describe, expect, it } from 'vitest'

import { createAppApi } from '@/services/app'
import { createMockTransport } from '@/services/mock-transport'

describe('preferences through the mock', () => {
  it('reads the shape Settings expects', async () => {
    // Values copied off a running qBittorrent 5.2.3 rather than invented, so
    // a screen driven by the mock shows what a real daemon would and the
    // types cannot drift apart.
    const app = createAppApi(createMockTransport())
    const prefs = await app.preferences()
    expect(typeof prefs.save_path).toBe('string')
    expect(typeof prefs.queueing_enabled).toBe('boolean')
    expect(typeof prefs.max_active_downloads).toBe('number')
  })

  it('has the key qBittorrent 5 actually uses for adding paused', async () => {
    // The docs still say start_paused_enabled. The daemon says otherwise, and
    // writing to a key nothing reads fails silently.
    const app = createAppApi(createMockTransport())
    const prefs = await app.preferences()
    expect(prefs).toHaveProperty('add_stopped_enabled')
    expect(prefs).not.toHaveProperty('start_paused_enabled')
  })

  it('merges a write rather than replacing everything', async () => {
    const app = createAppApi(createMockTransport())
    const before = await app.preferences()

    await app.setPreferences({ max_active_downloads: 9 })
    const after = await app.preferences()

    expect(after.max_active_downloads).toBe(9)
    expect(after.save_path).toBe(before.save_path)
  })

  it('keeps one instance from seeing what another wrote', async () => {
    const one = createAppApi(createMockTransport())
    const two = createAppApi(createMockTransport())
    await one.setPreferences({ listen_port: 61234 })
    expect((await two.preferences()).listen_port).not.toBe(61234)
  })
})
