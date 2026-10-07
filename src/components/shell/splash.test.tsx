import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Splash } from '@/components/shell/splash'
import { FADE_MS, MAX_VISIBLE_MS, MIN_VISIBLE_MS } from '@/components/shell/splash-timing'
import { ConnectionContext } from '@/services/api-context'
import { createClient } from '@/services/client'
import type { ConnectionState } from '@/services/connect'
import { createMockTransport } from '@/services/mock-transport'

const connecting: ConnectionState = { status: 'connecting' }
const connected = (): ConnectionState => ({
  status: 'connected',
  client: createClient(createMockTransport({ torrentCount: 0 })),
  version: 'v5.2.3',
  webApiVersion: '2.11.4',
  label: 'localhost:8080',
  spawned: true,
  baseUrl: 'http://localhost:8080',
})

function show(state: ConnectionState) {
  return render(
    <ConnectionContext.Provider value={state}>
      <Splash />
    </ConnectionContext.Provider>,
  )
}

const visible = () => screen.queryByRole('status') !== null

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('Splash', () => {
  it('covers the window while the connection is still being made', () => {
    show(connecting)
    expect(visible()).toBe(true)
  })

  /*
   * The floor. Without it a daemon that answers immediately, which the
   * built-in one usually does, produces a cover that appears and vanishes
   * inside two frames: a flicker, which is worse than no splash at all.
   */
  it('holds for the minimum even when the daemon answers at once', () => {
    const { rerender } = show(connecting)
    rerender(
      <ConnectionContext.Provider value={connected()}>
        <Splash />
      </ConnectionContext.Provider>,
    )
    act(() => void vi.advanceTimersByTime(MIN_VISIBLE_MS - 50))
    expect(visible()).toBe(true)
  })

  it('goes once settled and the minimum has passed', () => {
    const { rerender } = show(connecting)
    rerender(
      <ConnectionContext.Provider value={connected()}>
        <Splash />
      </ConnectionContext.Provider>,
    )
    act(() => void vi.advanceTimersByTime(MIN_VISIBLE_MS + 10))
    act(() => void vi.advanceTimersByTime(FADE_MS + 10))
    expect(visible()).toBe(false)
  })

  /*
   * The ceiling, and the more important half. A daemon that never answers
   * must not leave somebody looking at a logo: the app behind this says what
   * is wrong in the footer and the connection chip, and a splash cannot.
   */
  it('clears itself even if the connection never settles', () => {
    show(connecting)
    act(() => void vi.advanceTimersByTime(MIN_VISIBLE_MS + 100))
    expect(visible()).toBe(true)
    act(() => void vi.advanceTimersByTime(MAX_VISIBLE_MS))
    act(() => void vi.advanceTimersByTime(FADE_MS + 10))
    expect(visible()).toBe(false)
  })

  it('stops taking clicks while it fades, so it cannot swallow one', () => {
    const { rerender } = show(connecting)
    rerender(
      <ConnectionContext.Provider value={connected()}>
        <Splash />
      </ConnectionContext.Provider>,
    )
    act(() => void vi.advanceTimersByTime(MIN_VISIBLE_MS + 10))
    expect(screen.getByRole('status').className).toContain('pointer-events-none')
  })
})
