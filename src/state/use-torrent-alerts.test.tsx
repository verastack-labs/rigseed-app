import { renderHook } from '@testing-library/react'
import { act } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAlertStore } from '@/state/alert-store'
import { useTorrentStore } from '@/state/torrent-store'
import { useTorrentAlerts } from '@/state/use-torrent-alerts'
import type { MainData, Torrent, TorrentState } from '@/types/qbittorrent'

const alert = vi.fn<(title: string, body: string) => Promise<void>>(() => Promise.resolve())
vi.mock('@/services/desktop-alert', () => ({
  alert: (title: string, body: string) => alert(title, body),
}))

const torrent = (
  hash: string,
  progress: number,
  state: TorrentState = 'downloading',
): Partial<Torrent> => ({ hash, name: `torrent-${hash}`, progress, state })

/** One poll. `full` is the first payload the daemon sends after connecting. */
const poll = (torrents: Record<string, Partial<Torrent>>, full = false) =>
  act(() => {
    useTorrentStore
      .getState()
      .applyMainData({ rid: 1, torrents, ...(full ? { full_update: true } : {}) } as MainData)
  })

beforeEach(() => {
  alert.mockClear()
  useTorrentStore.getState().reset()
  act(() => useAlertStore.getState().set({ onComplete: true, onError: true }))
})

describe('useTorrentAlerts', () => {
  it('says nothing about what was already finished when the app opened', () => {
    // The case this exists for. The store starts empty, so without a baseline
    // every completed torrent looks like it completed just now, and opening
    // the app with forty of them fires forty notifications about last week.
    renderHook(() => useTorrentAlerts())
    poll({ a: torrent('a', 1, 'stalledUP'), b: torrent('b', 1, 'uploading') }, true)
    expect(alert).not.toHaveBeenCalled()
  })

  it('announces a torrent that finishes while it is watching', () => {
    renderHook(() => useTorrentAlerts())
    poll({ a: torrent('a', 0.4) }, true)
    poll({ a: torrent('a', 1, 'uploading') })
    expect(alert).toHaveBeenCalledWith('Download finished', 'torrent-a')
  })

  it('announces it once, not once per poll', () => {
    // The store is replaced every second and most of what is in it has not
    // changed. Levels rather than edges would announce for as long as the
    // torrent is seeded.
    renderHook(() => useTorrentAlerts())
    poll({ a: torrent('a', 0.4) }, true)
    poll({ a: torrent('a', 1, 'uploading') })
    poll({ a: torrent('a', 1, 'uploading') })
    poll({ a: torrent('a', 1, 'stalledUP') })
    expect(alert).toHaveBeenCalledOnce()
  })

  it('says nothing about a torrent that arrives already complete', () => {
    // What adding a finished torrent from a file looks like. It did not
    // complete while rigseed was watching, so it is recorded, not announced.
    renderHook(() => useTorrentAlerts())
    poll({ a: torrent('a', 0.4) }, true)
    poll({ a: torrent('a', 0.4), b: torrent('b', 1, 'uploading') })
    expect(alert).not.toHaveBeenCalled()
  })

  it('announces a torrent that breaks', () => {
    renderHook(() => useTorrentAlerts())
    poll({ a: torrent('a', 0.4) }, true)
    poll({ a: torrent('a', 0.4, 'missingFiles') })
    expect(alert).toHaveBeenCalledWith('Torrent stopped', 'torrent-a needs attention.')
  })

  it('stays quiet about whichever kind is turned off', () => {
    act(() => useAlertStore.getState().set({ onComplete: false, onError: true }))
    renderHook(() => useTorrentAlerts())
    poll({ a: torrent('a', 0.4), b: torrent('b', 0.4) }, true)
    poll({ a: torrent('a', 1, 'uploading'), b: torrent('b', 0.4, 'error') })

    expect(alert).toHaveBeenCalledOnce()
    expect(alert).toHaveBeenCalledWith('Torrent stopped', 'torrent-b needs attention.')
  })

  it('stays quiet about everything when both are off', () => {
    act(() => useAlertStore.getState().set({ onComplete: false, onError: false }))
    renderHook(() => useTorrentAlerts())
    poll({ a: torrent('a', 0.4) }, true)
    poll({ a: torrent('a', 1, 'uploading') })
    expect(alert).not.toHaveBeenCalled()
  })

  it('does not lose the baseline when a setting is changed', () => {
    // Reading the settings as an effect dependency would rebuild the baseline
    // on every change, and a rebuilt baseline swallows the next transition.
    // The notification somebody just turned on would be the one that never
    // arrives, which is the worst possible one to drop.
    act(() => useAlertStore.getState().set({ onComplete: false, onError: false }))
    renderHook(() => useTorrentAlerts())
    poll({ a: torrent('a', 0.4) }, true)

    act(() => useAlertStore.getState().set({ onComplete: true }))
    poll({ a: torrent('a', 1, 'uploading') })

    expect(alert).toHaveBeenCalledWith('Download finished', 'torrent-a')
  })

  it('still announces a finish that happened while the connection was down', () => {
    // An empty store is what a reconnection looks like in flight, and it is
    // not evidence that every torrent vanished. Keeping the baseline across it
    // means a download that completed during a blip is still announced, which
    // is right: it finished while rigseed was open, and the alternative is
    // silently dropping exactly the notification somebody was waiting for.
    //
    // Safe across a change of daemon too, because a hash with no baseline
    // entry is recorded rather than announced.
    renderHook(() => useTorrentAlerts())
    poll({ a: torrent('a', 0.4) }, true)
    poll({}, true)
    poll({ a: torrent('a', 1, 'uploading') }, true)
    expect(alert).toHaveBeenCalledWith('Download finished', 'torrent-a')
  })

  it('records rather than announces a torrent from a daemon it just met', () => {
    renderHook(() => useTorrentAlerts())
    poll({ a: torrent('a', 0.4) }, true)
    poll({ zzz: torrent('zzz', 1, 'uploading') }, true)
    expect(alert).not.toHaveBeenCalled()
  })
})
