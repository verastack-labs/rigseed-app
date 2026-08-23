import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { LimitField } from '@/components/ui/limit-field'
import { icons } from '@/lib/icons'
import type { Torrent } from '@/types/qbittorrent'

export interface SpeedLimitDialogProps {
  /** The torrent being limited, or null when the dialog is closed. */
  torrent: Torrent | null
  onClose: () => void
  onLimit: (direction: 'down' | 'up', bytesPerSecond: number) => void
}

/**
 * Per-torrent speed limits, one right-click away.
 *
 * They already existed, on the Speed tab of the torrent's own screen. Getting
 * to them meant opening the torrent and finding the right tab, which is a long
 * way round for the thing people reach for when one download is drowning
 * everything else. qBittorrent puts it in the row's context menu and that is
 * the right place for it.
 *
 * The same `LimitField` as the Speed tab rather than a second control that
 * behaves almost the same. It moved down to `ui/` for this, which is the rule
 * the repo already had: a feature component needed by a second screen moves a
 * layer rather than being imported sideways.
 *
 * Both directions in one dialog, not two menu items opening two dialogs. The
 * question "how fast should this torrent go" has two halves and somebody
 * capping a download often wants to cap the upload in the same breath.
 *
 * No save button. Each field commits on blur and on Enter exactly as it does
 * on the Speed tab, so a footer button would either duplicate that or
 * contradict it. Done closes.
 */
export function SpeedLimitDialog({ torrent, onClose, onLimit }: SpeedLimitDialogProps) {
  return (
    <Dialog
      open={torrent !== null}
      onClose={onClose}
      title="Speed limits"
      description={
        torrent ? (
          <span className="line-clamp-1 text-[11.5px] text-text-dim">{torrent.name}</span>
        ) : undefined
      }
      width={520}
      icon={<icons.turtle className="size-[15px]" strokeWidth={2} />}
      footer={
        <div className="flex w-full items-center gap-2">
          <span className="font-mono text-[10.5px] text-text-dimmer">
            applies to this torrent only
          </span>
          <span className="flex-1" />
          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      {torrent ? (
        <div className="flex flex-col">
          {/* Keyed by the current limit for the same reason the Speed tab is:
              the daemon is the source of truth and can be changed from the
              stock WebUI or another client, so a change from outside remounts
              the field rather than leaving a stale draft in it. */}
          <LimitField
            key={`down-${torrent.dl_limit}`}
            name="Download"
            api="torrents/setDownloadLimit"
            limit={torrent.dl_limit}
            onChange={(bytes) => onLimit('down', bytes)}
          />
          <LimitField
            key={`up-${torrent.up_limit}`}
            name="Upload"
            api="torrents/setUploadLimit"
            limit={torrent.up_limit}
            onChange={(bytes) => onLimit('up', bytes)}
          />
        </div>
      ) : null}
    </Dialog>
  )
}
