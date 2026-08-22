import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { DetailHeader } from '@/features/torrent-detail/detail-header'
import type { DetailTab } from '@/features/torrent-detail/tabs'
import { FilesTab } from '@/features/torrent-detail/files-tab'
import { GeneralTab } from '@/features/torrent-detail/general-tab'
import { PeersTab } from '@/features/torrent-detail/peers-tab'
import { SpeedTab } from '@/features/torrent-detail/speed-tab'
import { TrackersTab } from '@/features/torrent-detail/trackers-tab'
import { TitleBlock } from '@/features/torrent-detail/title-block'
import { isSynthetic } from '@/features/torrent-detail/tracker-status'
import { icons } from '@/lib/icons'
import { write } from '@/lib/write'
import { useApi } from '@/services/api-context'
import { selectTorrent, useTorrentStore } from '@/state/torrent-store'
import { useDetailPoll } from '@/state/use-detail-poll'
import { useSyncPoll } from '@/state/use-sync-poll'
import type { Priority } from '@/lib/priority'
import { isPaused } from '@/utils/format'

/**
 * One torrent, in depth.
 *
 * The live numbers come from the same `sync/maindata` loop the list uses, so
 * this screen never asks for what the store already knows. What it does fetch
 * is the four things the list does not carry, and only for the tab on screen:
 * a Peers poll while the user is reading Trackers is bytes nobody asked for.
 */
export function TorrentDetail() {
  useSyncPoll()

  const api = useApi()
  const navigate = useNavigate()
  const { hash = '' } = useParams()

  const torrent = useTorrentStore(selectTorrent(hash))
  const loaded = useTorrentStore((s) => s.loaded)
  const speedHistory = useTorrentStore((s) => s.speedHistory)

  const [tab, setTab] = useState<DetailTab>('general')
  const [selectedFiles, setSelectedFiles] = useState<number[]>([])
  const [confirmRemove, setConfirmRemove] = useState(false)

  const { properties, files, trackers, peers, refresh } = useDetailPoll(hash, tab)

  /**
   * The numbers in the tab bar.
   *
   * Every one has to exist before its tab is opened. A badge that appears
   * only after a visit reads as still loading on a screen that has finished
   * loading, and the whole point of a count in a tab is to answer the
   * question without going there.
   *
   * Trackers needs no request: `trackers_count` rides on the sync payload and
   * already excludes the DHT, PeX and LSD rows, which is exactly what the tab
   * counts. Files and Peers are fetched once on mount, because neither has a
   * field that matches what its tab lists: `num_seeds + num_leechs` was 2
   * against a peer list of 1 on the daemon this was checked against.
   */
  const counts = useMemo(
    () => ({
      ...(files ? { files: files.length } : {}),
      ...(trackers
        ? { trackers: trackers.filter((t) => !isSynthetic(t.url)).length }
        : torrent
          ? { trackers: torrent.trackers_count }
          : {}),
      ...(peers ? { peers: Object.keys(peers).length } : {}),
    }),
    [files, trackers, peers, torrent],
  )

  // The store is still empty on a cold load, or on a reload straight onto this
  // URL. Absent and not-yet-known are different, and only one of them is a
  // wrong hash.
  if (!torrent) {
    return loaded ? (
      <EmptyState
        icon={<icons.folder className="size-6" strokeWidth={1.7} />}
        title="That torrent is not here"
        body="It may have been removed, or the link may point at a torrent this connection does not have."
        action={
          <Button variant="primary" onClick={() => void navigate('/')}>
            Back to transfers
          </Button>
        }
      />
    ) : (
      <div className="p-6">
        <Skeleton rows={6} rowHeight={72} />
      </div>
    )
  }

  const act = {
    onPauseResume: () =>
      void (isPaused(torrent.state) ? api.torrents.resume([hash]) : api.torrents.pause([hash])),
    onRecheck: () => void write('Recheck', () => api.torrents.recheck([hash])),
    onReannounce: () => void write('Reannounce', () => api.torrents.reannounce([hash])),
    // The daemon's own magnet, which carries the display name and trackers.
    // Rebuilding one from the info hash produces a valid link that has lost
    // everything a client needs to find peers without waiting on DHT.
    onCopyMagnet: () => void navigator.clipboard?.writeText(torrent.magnet_uri),
    onRemove: () => setConfirmRemove(true),
  }

  const applyPriority = async (indices: readonly number[], priority: Priority) => {
    await api.torrents.filePrio(hash, indices, priority)
    setSelectedFiles([])
    await refresh()
  }

  return (
    <div data-context-target className="flex h-full min-h-0 flex-col">
      <DetailHeader
        torrent={torrent}
        tab={tab}
        onTab={setTab}
        counts={counts}
        {...act}
        className="shrink-0"
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <TitleBlock torrent={torrent} />

        {tab === 'general' ? <GeneralTab torrent={torrent} properties={properties} /> : null}

        {tab === 'files' ? (
          <FilesTab
            files={files}
            // `has_metadata` is 5.x only. Falling back to the state covers an
            // older daemon, which reports metaDL for the same situation.
            awaitingMetadata={torrent.has_metadata === false || torrent.state === 'metaDL'}
            // Where the content actually landed, so a double click can open a
            // file. The daemon's own path, not one rebuilt from the name.
            {...(properties?.save_path ? { savePath: properties.save_path } : {})}
            selected={selectedFiles}
            onToggle={(index) =>
              setSelectedFiles((prev) =>
                prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
              )
            }
            onPriority={(indices, priority) => void applyPriority(indices, priority)}
          />
        ) : null}

        {tab === 'trackers' ? (
          <TrackersTab
            trackers={trackers}
            onAdd={(urls) =>
              void write('Add tracker', () => api.torrents.addTrackers(hash, urls)).then(refresh)
            }
            onRemove={(url) =>
              void write('Remove tracker', () => api.torrents.removeTrackers(hash, [url])).then(
                refresh,
              )
            }
          />
        ) : null}

        {tab === 'peers' ? (
          // The key is `ip:port`, which is exactly what transfer/banPeers
          // takes. The ban is session-wide rather than per torrent, which is
          // the daemon's design and not something this screen can scope.
          <PeersTab
            peers={peers}
            onBan={(key) =>
              void write('Ban peer', () => api.transfer.banPeers([key]), {
                announce: 'Peer banned',
              })
            }
          />
        ) : null}

        {tab === 'speed' ? (
          <SpeedTab
            torrent={torrent}
            downHistory={speedHistory.down}
            upHistory={speedHistory.up}
            onLimit={(direction, bytes) =>
              void (direction === 'down'
                ? api.torrents.setDownloadLimit([hash], bytes)
                : api.torrents.setUploadLimit([hash], bytes))
            }
            onToggleSequential={() =>
              void write('Sequential download', () => api.torrents.toggleSequentialDownload([hash]))
            }
            onToggleFirstLast={() =>
              void write('First and last pieces first', () =>
                api.torrents.toggleFirstLastPiecePrio([hash]),
              )
            }
            onAutoManagement={(enable) =>
              void write('Automatic torrent management', () =>
                api.torrents.setAutoManagement([hash], enable),
              )
            }
          />
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmRemove}
        onCancel={() => setConfirmRemove(false)}
        onConfirm={(alsoDeleteFiles) => {
          setConfirmRemove(false)
          void write('Remove torrent', () => api.torrents.delete([hash], alsoDeleteFiles)).then(
            (ok) => {
              if (ok) navigate('/')
            },
          )
        }}
        title="Remove this torrent?"
        body="The torrent stops and leaves the list. The files it already downloaded stay on disk unless you also tick the option below."
        confirmLabel="Remove"
        optionLabel="Also delete the files on disk"
      />
    </div>
  )
}
