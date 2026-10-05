import { beforeEach, describe, expect, it, vi } from 'vitest'

import { updateNeedsAttention, useUpdateStore, type UpdateState } from '@/state/update-store'

const check = vi.fn()
vi.mock('@tauri-apps/plugin-updater', () => ({ check: () => check() }))
vi.mock('@tauri-apps/plugin-process', () => ({ relaunch: vi.fn() }))

let desktop = true
vi.mock('@/services/shell', () => ({
  canReachDesktop: () => desktop,
  openPath: vi.fn(),
  revealInFolder: vi.fn(),
  pickFolder: vi.fn(),
}))

const reset = () => useUpdateStore.setState({ state: { kind: 'idle' }, checked: false })

beforeEach(() => {
  desktop = true
  check.mockReset()
  reset()
})

describe('the launch check', () => {
  it('asks once and then not again', async () => {
    // It talks to a remote server. Asking again because somebody moved between
    // screens would be rude to them and pointless to us.
    check.mockResolvedValue(null)
    await useUpdateStore.getState().checkQuietly()
    await useUpdateStore.getState().checkQuietly()
    await useUpdateStore.getState().checkQuietly()
    expect(check).toHaveBeenCalledTimes(1)
  })

  it('leaves a download alone rather than restarting the state under it', async () => {
    // The guard that matters. Without it a late quiet check could wipe out a
    // download somebody is watching.
    useUpdateStore.setState({
      state: {
        kind: 'downloading',
        version: '0.1.4',
        received: 10,
        progress: { percent: 10, known: true },
      },
    })
    await useUpdateStore.getState().checkQuietly()
    expect(check).not.toHaveBeenCalled()
    expect(useUpdateStore.getState().state.kind).toBe('downloading')
  })

  it('does not overwrite a result somebody is already reading', async () => {
    useUpdateStore.setState({ state: { kind: 'available', version: '0.1.4', notes: '' } })
    await useUpdateStore.getState().checkQuietly()
    expect(check).not.toHaveBeenCalled()
  })

  it('reports no channel rather than an error when there is no desktop to ask', async () => {
    desktop = false
    await useUpdateStore.getState().checkQuietly()
    expect(useUpdateStore.getState().state).toEqual({ kind: 'failed', failure: 'no-channel' })
    expect(check).not.toHaveBeenCalled()
  })

  it('records a newer version without doing anything about it', async () => {
    // Quiet means quiet: the state changes, nothing installs, nothing opens.
    check.mockResolvedValue({ version: '0.1.4', body: 'Fixed a thing', date: '2026-10-06' })
    await useUpdateStore.getState().checkQuietly()
    expect(useUpdateStore.getState().state).toEqual({
      kind: 'available',
      version: '0.1.4',
      notes: 'Fixed a thing',
      date: '2026-10-06',
    })
  })

  it('says current when there is nothing newer', async () => {
    check.mockResolvedValue(null)
    await useUpdateStore.getState().checkQuietly()
    expect(useUpdateStore.getState().state).toEqual({ kind: 'current' })
  })

  it('classifies a thrown failure rather than letting it escape', async () => {
    // It runs from an effect at launch. An unhandled rejection there is a
    // crash on startup over something nobody asked for.
    check.mockRejectedValue(new Error('error sending request for url'))
    await expect(useUpdateStore.getState().checkQuietly()).resolves.toBeUndefined()
    expect(useUpdateStore.getState().state).toMatchObject({ kind: 'failed', failure: 'network' })
  })

  it('counts a failed check as having run, so it is not retried all launch', async () => {
    check.mockRejectedValue(new Error('connection refused'))
    await useUpdateStore.getState().checkQuietly()
    await useUpdateStore.getState().checkQuietly()
    expect(check).toHaveBeenCalledTimes(1)
  })
})

describe('updateNeedsAttention', () => {
  const states: UpdateState[] = [
    { kind: 'idle' },
    { kind: 'checking' },
    { kind: 'current' },
    { kind: 'failed', failure: 'network' },
    { kind: 'failed', failure: 'no-channel' },
  ]

  it('marks only the states waiting on a person', () => {
    expect(updateNeedsAttention({ kind: 'available', version: '0.1.4', notes: '' })).toBe(true)
    expect(updateNeedsAttention({ kind: 'ready', version: '0.1.4' })).toBe(true)
  })

  it('does not mark a failed check', () => {
    // Not actionable, frequently just a missing channel, and a permanent dot
    // for something nobody can fix is how people learn to ignore dots.
    for (const state of states) {
      expect(updateNeedsAttention(state)).toBe(false)
    }
  })

  it('does not mark a download in progress', () => {
    // It is already being dealt with. The dot is an invitation, not a status.
    expect(
      updateNeedsAttention({
        kind: 'downloading',
        version: '0.1.4',
        received: 1,
        progress: { percent: 1, known: true },
      }),
    ).toBe(false)
  })
})
