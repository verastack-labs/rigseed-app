import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/ui/form-dialog'
import { Input } from '@/components/ui/input'
import { icons } from '@/lib/icons'
import { canReachDesktop, pickFolder } from '@/services/shell'

export interface MoveDialogProps {
  open: boolean
  /** How many torrents are being moved, for the wording. */
  count: number
  /** Where they are now. Blank when a selection disagrees. */
  currentPath: string
  onCancel: () => void
  onConfirm: (destination: string) => void
  busy?: boolean
}

/**
 * Move a torrent's files somewhere else.
 *
 * The daemon performs the move and keeps seeding from the new location, so
 * this is not a re-download and the torrent does not stop. It can take a while
 * for a large one, which the dialog says rather than leaving somebody watching
 * a window that looks stuck.
 *
 * The folder is typed or picked. Typed matters: the destination is frequently
 * on a machine somebody is reaching over the network, where a native picker
 * would be browsing the wrong computer entirely.
 */
export function MoveDialog({
  open,
  count,
  currentPath,
  onCancel,
  onConfirm,
  busy,
}: MoveDialogProps) {
  const [destination, setDestination] = useState(currentPath)
  const trimmed = destination.trim()
  const unchanged = trimmed !== '' && trimmed === currentPath.trim()

  return (
    <FormDialog
      open={open}
      onCancel={onCancel}
      onSubmit={() => onConfirm(trimmed)}
      title={count === 1 ? 'Move files' : `Move ${count} torrents`}
      api="torrents/setLocation"
      submitLabel={busy ? 'Moving…' : 'Move'}
      submitDisabled={trimmed === '' || unchanged || busy === true}
      icon={<icons.folder className="size-[18px]" strokeWidth={1.7} />}
      description={
        <>
          The daemon moves the files and keeps seeding from the new folder, so nothing is downloaded
          again and nothing stops. A large torrent can take a few minutes, and the transfer stays in
          the list while it works.
        </>
      }
      width={560}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="move-destination" className="text-[11.5px] font-semibold text-text-dim">
          New folder
        </label>
        <div className="flex items-center gap-2">
          <Input
            id="move-destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="D:/media/films"
            className="flex-1"
          />
          {/*
            Only where there is a desktop to ask. Against a remote instance the
            picker would browse this machine while the daemon writes on
            another, which is a worse answer than no button.
          */}
          {canReachDesktop() ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                void pickFolder(destination || undefined).then((chosen) => {
                  if (chosen) setDestination(chosen)
                })
              }}
            >
              Browse
            </Button>
          ) : null}
        </div>

        {currentPath ? (
          <p className="mt-1 font-mono text-[10.5px] text-text-dimmer">
            Currently in {currentPath}
          </p>
        ) : null}

        {unchanged ? (
          <p className="text-[11.5px] text-text-dim">
            That is where the files already are. Pick a different folder.
          </p>
        ) : null}
      </div>
    </FormDialog>
  )
}
