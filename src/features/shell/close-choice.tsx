import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog } from '@/components/ui/dialog'
import { icons } from '@/lib/icons'

export interface CloseChoiceProps {
  open: boolean
  /** Hide the window, leaving the daemon running. */
  onKeepRunning: (remember: boolean) => void
  /** Stop the daemon and exit. */
  onQuit: (remember: boolean) => void
}

/**
 * What closing the window should do, asked once.
 *
 * Not a `ConfirmDialog`, and the reason is the shape of the decision rather
 * than the styling. That component is confirm-or-abort, with the cancel path
 * meaning "nothing happens". Here both buttons do something, neither is the
 * dangerous one by default, and there is no third thing to want: somebody who
 * pressed the close button is finished with the window either way.
 *
 * Both consequences are named rather than implied. "Keep running" without
 * saying where it went loses the app for anybody who has not met the
 * convention, and "Quit" without saying transfers stop is the more expensive
 * of the two mistakes to make silently.
 *
 * The remembered answer is a checkbox rather than the default, because it is a
 * choice about future behaviour and stapling it to whichever button somebody
 * happened to press first is how an app ends up doing something nobody asked
 * for. Settings can change it back either way.
 */
export function CloseChoice({ open, onKeepRunning, onQuit }: CloseChoiceProps) {
  const [remember, setRemember] = useState(true)

  return (
    <Dialog
      open={open}
      onClose={() => onKeepRunning(remember)}
      title="Close rigseed?"
      description="Torrents only transfer while rigseed is running."
      width={470}
      icon={<icons.desktop className="size-[15px]" strokeWidth={2} />}
      footer={
        <div className="flex w-full items-center gap-2">
          {/* Wrapped, because `Checkbox` is the bare 16px box the torrent rows
              use and carries its label only for a screen reader. On its own in
              a footer it is a ticked box with nothing beside it, which was
              exactly how it first shipped. */}
          <label className="flex cursor-pointer items-center gap-2.5 text-[12px] text-text-dim">
            <Checkbox
              checked={remember}
              onChange={setRemember}
              label="Remember this and stop asking"
            />
            Remember this and stop asking
          </label>
          <span className="flex-1" />
          <Button variant="secondary" size="sm" onClick={() => onQuit(remember)}>
            Quit
          </Button>
          <Button variant="primary" size="sm" onClick={() => onKeepRunning(remember)}>
            Keep running
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-2.5 px-[18px] py-4">
        <p className="text-[12.5px] leading-[1.6] text-text">
          {/* Not "leaves rigseed in the system tray" any more, and not
              "click the tray icon to bring it back". Both are false wherever
              there is no tray, which includes the Flatpak, whose runtime
              ships no Ayatana library, and a plain GNOME desktop, where the
              icon is invisible without a shell extension. Telling somebody to
              click an icon that is not there is how a hidden window becomes a
              crash report.

              Opening rigseed again is true everywhere, because the single
              instance guard reveals the hidden window rather than starting a
              second copy. Anyone who does have a tray icon will find it
              without being told. */}
          <strong className="font-semibold">Keep running</strong> hides the window. Downloads and
          seeding carry on. Open rigseed again to bring the window back.
        </p>
        <p className="text-[12.5px] leading-[1.6] text-text-dim">
          <strong className="font-semibold text-text">Quit</strong> stops the daemon. Nothing
          downloads or seeds until you open rigseed again.
        </p>
      </div>
    </Dialog>
  )
}
