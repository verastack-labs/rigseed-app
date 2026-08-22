import { beforeEach, describe, expect, it, vi } from 'vitest'

import { write } from '@/lib/write'
import { useNoticeStore } from '@/state/notice-store'

const notices = () => useNoticeStore.getState().notices

beforeEach(() => {
  useNoticeStore.getState().clear()
})

describe('write', () => {
  it('says nothing when the write worked', async () => {
    // A confirmation for every successful action is noise, and the result is
    // already visible in whatever changed.
    const ok = await write('Pause', () => Promise.resolve())
    expect(ok).toBe(true)
    expect(notices()).toHaveLength(0)
  })

  it('reports a failure in the terms the user clicked in', async () => {
    // "Pause" is what they pressed. `torrents/stop` is a detail underneath it,
    // and belongs in the detail line rather than the headline.
    const ok = await write('Pause', () => Promise.reject(new Error('torrents/stop failed: 403')))
    expect(ok).toBe(false)
    expect(notices()).toHaveLength(1)
    expect(notices()[0]).toMatchObject({
      tone: 'warn',
      what: 'Pause',
      detail: 'torrents/stop failed: 403',
    })
  })

  it('announces only the actions with nothing to show for themselves', async () => {
    // Banning a peer removes a row that was going to disappear on its own, so
    // without a word it is indistinguishable from having done nothing.
    await write('Ban peer', () => Promise.resolve(), { announce: 'Peer banned' })
    expect(notices()[0]).toMatchObject({ tone: 'ok', what: 'Peer banned' })
  })

  it('does not announce an action that failed', async () => {
    const ok = await write('Ban peer', () => Promise.reject(new Error('nope')), {
      announce: 'Peer banned',
    })
    expect(ok).toBe(false)
    expect(notices()).toHaveLength(1)
    expect(notices()[0]?.tone).toBe('warn')
  })

  it('carries no detail rather than the word undefined', async () => {
    // Something thrown that is not an Error and stringifies to nothing.
    await write('Pause', () => Promise.reject(new Error('')))
    expect(notices()[0]).not.toHaveProperty('detail')
  })

  it('does not throw, so a caller can stay a one-liner', async () => {
    // The whole point is that every call site is `void write(...)`. One that
    // could reject would put an unhandled rejection behind every action.
    await expect(write('Pause', () => Promise.reject(new Error('x')))).resolves.toBe(false)
  })

  it('reports the outcome so a caller can act on it', async () => {
    // Removing a torrent navigates away, and navigating away from a removal
    // that did not happen leaves somebody looking at a list that still has it.
    const navigate = vi.fn()
    await write('Remove torrent', () => Promise.reject(new Error('busy'))).then((ok) => {
      if (ok) navigate()
    })
    expect(navigate).not.toHaveBeenCalled()
  })
})

describe('the notice stack', () => {
  it('keeps the newest and drops the oldest', async () => {
    // Six failures in a row is one problem, and a stack that grows without
    // limit covers the thing it is reporting on.
    for (const n of [1, 2, 3, 4, 5, 6]) {
      await write(`Action ${n}`, () => Promise.reject(new Error('no')))
    }
    expect(notices()).toHaveLength(4)
    expect(notices().map((one) => one.what)).toEqual([
      'Action 3',
      'Action 4',
      'Action 5',
      'Action 6',
    ])
  })

  it('gives every notice its own id, so two identical failures are two', async () => {
    await write('Pause', () => Promise.reject(new Error('no')))
    await write('Pause', () => Promise.reject(new Error('no')))
    const [first, second] = notices()
    expect(first?.id).not.toBe(second?.id)
  })

  it('dismisses one without disturbing the rest', async () => {
    await write('One', () => Promise.reject(new Error('no')))
    await write('Two', () => Promise.reject(new Error('no')))
    useNoticeStore.getState().dismiss(notices()[0]!.id)
    expect(notices().map((one) => one.what)).toEqual(['Two'])
  })
})
