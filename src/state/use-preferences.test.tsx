import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useEffect } from 'react'

import { usePreferences } from '@/state/use-preferences'

const preferences = vi.fn()
const setPreferences = vi.fn()

// One object, not a fresh one per call. The hook keys its load effect on the
// api identity, so a double that rebuilds itself every render reloads
// preferences every render and wipes whatever was being edited. The real
// provider holds one client in state, which is why this only bites here.
const api = { app: { preferences, setPreferences } }
const other = { app: { preferences, setPreferences } }
const holder = { current: api }
vi.mock('@/services/api-context', () => ({ useApi: () => holder.current }))

let latest: ReturnType<typeof usePreferences>

function Probe() {
  const state = usePreferences()
  // Published from an effect rather than assigned during render. Writing to
  // something outside the component while rendering is a side effect, and the
  // lint rule is right to say so even in a test.
  useEffect(() => {
    latest = state
  })
  return <span data-testid="dirty">{state.dirtyKeys.join(',') || 'clean'}</span>
}

const base = { save_path: '/downloads', max_active_downloads: 3, dht: true }

// Explicit, because a component left mounted from the previous test keeps
// re-rendering and reassigning `latest`, which makes every assertion after it
// a coin toss.
beforeEach(() => {
  vi.clearAllMocks()
  holder.current = api
  preferences.mockResolvedValue({ ...base })
  setPreferences.mockResolvedValue(undefined)
})

afterEach(cleanup)

let rerenderProbe: () => void

async function mounted() {
  const view = render(<Probe />)
  rerenderProbe = () => view.rerender(<Probe />)
  await waitFor(() => expect(latest.draft).not.toBeNull())
}

describe('usePreferences', () => {
  it('starts clean, with the draft matching what was read', async () => {
    await mounted()
    expect(screen.getByTestId('dirty')).toHaveTextContent('clean')
    expect(latest.draft).toEqual(latest.saved)
  })

  it('collects only the keys that differ', async () => {
    await mounted()
    latest.set('max_active_downloads', 9)
    await waitFor(() => expect(latest.changes).toEqual({ max_active_downloads: 9 }))
    // Not the other forty. setPreferences takes a partial, and sending the
    // whole object writes back values nobody touched.
    expect(Object.keys(latest.changes)).toHaveLength(1)
  })

  it('goes clean again when a value is typed back to what it was', async () => {
    await mounted()
    latest.set('max_active_downloads', 9)
    await waitFor(() => expect(latest.dirtyKeys).toHaveLength(1))
    latest.set('max_active_downloads', 3)
    await waitFor(() => expect(latest.dirtyKeys).toHaveLength(0))
  })

  it('writes nothing until apply', async () => {
    await mounted()
    latest.set('dht', false)
    await waitFor(() => expect(latest.dirtyKeys).toContain('dht'))
    expect(setPreferences).not.toHaveBeenCalled()
  })

  it('sends only the changes on apply, and goes clean', async () => {
    await mounted()
    latest.set('dht', false)
    await waitFor(() => expect(latest.dirtyKeys).toContain('dht'))

    await latest.apply()
    expect(setPreferences).toHaveBeenCalledWith({ dht: false })
    await waitFor(() => expect(latest.dirtyKeys).toHaveLength(0))
  })

  it('does not call the daemon when nothing changed', async () => {
    await mounted()
    await latest.apply()
    expect(setPreferences).not.toHaveBeenCalled()
  })

  it('puts every edit back on revert', async () => {
    await mounted()
    latest.set('save_path', '/elsewhere')
    latest.set('dht', false)
    await waitFor(() => expect(latest.dirtyKeys).toHaveLength(2))

    latest.revert()
    await waitFor(() => expect(latest.dirtyKeys).toHaveLength(0))
    expect(latest.draft?.save_path).toBe('/downloads')
  })

  it('keeps the edits when the write fails', async () => {
    // Losing what somebody typed because the daemon refused it is the worst
    // possible response to a failed save.
    await mounted()
    setPreferences.mockReset().mockRejectedValue(new Error('403'))
    latest.set('dht', false)
    await waitFor(() => expect(latest.dirtyKeys).toContain('dht'))

    await latest.apply()
    await waitFor(() => expect(latest.error).toBe('403'))
    expect(latest.dirtyKeys).toContain('dht')
    expect(latest.draft?.dht).toBe(false)
  })

  it('reports a failed read rather than showing an empty screen', async () => {
    preferences.mockReset().mockRejectedValue(new Error('no daemon'))
    render(<Probe />)
    await waitFor(() => expect(latest.error).toBe('no daemon'))
    expect(latest.draft).toBeNull()
  })

  it('throws the draft away when the connection changes', async () => {
    // The provider hands out a mock client while it looks for a daemon.
    // Leaving the sample values on screen would be bad enough; the dangerous
    // part is an edit made in that window diffing against them, so Apply
    // would write sample values to a real daemon.
    await mounted()
    latest.set('max_active_downloads', 9)
    await waitFor(() => expect(latest.dirtyKeys).toHaveLength(1))

    preferences.mockResolvedValue({ ...base, max_active_downloads: 4 })
    holder.current = other
    rerenderProbe()

    await waitFor(() => expect(latest.draft?.max_active_downloads).toBe(4))
    expect(latest.dirtyKeys).toHaveLength(0)
  })
})
