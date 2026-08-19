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
import { useApi } from '@/services/context'
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

  const counts = useMemo(
    () => ({
      ...(files ? { files: files.length } : {}),
      ...(trackers ? { trackers: trackers.filter((t) => !isSynthetic(t.url)).length } : {}),
      ...(peers ? { peers: Object.keys(peers).length } : {}),
    }),
    [files, trackers, peers],
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
    onRecheck: () => void api.torrents.recheck([hash]),
    onReannounce: () => void api.torrents.reannounce([hash]),
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
    <div className="flex h-full min-h-0 flex-col">
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
            onAdd={(urls) => void api.torrents.addTrackers(hash, urls).then(refresh)}
            onRemove={(url) => void api.torrents.removeTrackers(hash, [url]).then(refresh)}
          />
        ) : null}

        {tab === 'peers' ? (
          // The key is `ip:port`, which is exactly what app/banPeers takes.
          // The ban is session-wide rather than per torrent, which is the
          // daemon's design and not something this screen can scope.
          <PeersTab peers={peers} onBan={(key) => void api.app.banPeers([key])} />
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
            onToggleSequential={() => void api.torrents.toggleSequentialDownload([hash])}
            onToggleFirstLast={() => void api.torrents.toggleFirstLastPiecePrio([hash])}
            onAutoManagement={(enable) => void api.torrents.setAutoManagement([hash], enable)}
          />
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmRemove}
        onCancel={() => setConfirmRemove(false)}
        onConfirm={(alsoDeleteFiles) => {
          setConfirmRemove(false)
          void api.torrents.delete([hash], alsoDeleteFiles).then(() => navigate('/'))
        }}
        title="Remove this torrent?"
        body="The torrent stops and leaves the list. The files it already downloaded stay on disk unless you also tick the option below."
        confirmLabel="Remove"
        optionLabel="Also delete the files on disk"
      />
    </div>
  )
}
