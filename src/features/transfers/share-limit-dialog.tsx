import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { SectionHeader } from '@/components/ui/section-header'
import { SegmentedControl } from '@/components/ui/segmented-control'
import {
  changed,
  describeEffective,
  draftFrom,
  toWire,
  type ShareLimitDraft,
} from '@/features/transfers/share-limits'
import { icons } from '@/lib/icons'
import type { ShareLimitAction, ShareLimitMode, Torrent } from '@/types/qbittorrent'

export interface ShareLimitDialogProps {
  /** The torrent being limited, or null when the dialog is closed. */
  torrent: Torrent | null
  onClose: () => void
  onApply: (limits: ReturnType<typeof toWire>) => void
}

const MODES: readonly { value: ShareLimitMode; label: string }[] = [
  { value: 'global', label: 'Global' },
  { value: 'unlimited', label: 'No limit' },
  { value: 'custom', label: 'Custom' },
]

/**
 * The five names the daemon accepts, ordered by how much they destroy.
 *
 * The wire names are not shown. `Stop` is what qBittorrent's own UI calls
 * pausing, and `RemoveWithContent` deletes files off disk, which is spelled
 * out rather than left as a word somebody could read as the milder Remove
 * above it.
 */
const ACTIONS: readonly { value: ShareLimitAction; label: string }[] = [
  { value: 'Default', label: 'Whatever Settings says' },
  { value: 'Stop', label: 'Pause the torrent' },
  { value: 'EnableSuperSeeding', label: 'Turn on super seeding' },
  { value: 'Remove', label: 'Remove the torrent, keep the files' },
  { value: 'RemoveWithContent', label: 'Remove the torrent and delete the files' },
]

/**
 * When a torrent should stop seeding, one right-click away.
 *
 * The counterpart to the Speed limits dialog beside it in the menu: that one
 * caps how fast a torrent goes, this one decides when it is finished. Both are
 * per torrent and neither touches the global settings.
 *
 * Unlike Speed limits, this one has a Save button. `torrents/setShareLimits`
 * is all-or-nothing, overwriting every limit it is handed with no way to
 * change one and leave the rest, so committing each field on blur would fire a
 * four-parameter write for every keystroke that lands. One write, once the
 * whole shape is settled.
 *
 * The mode strips are why this is not three number boxes. `-2`, `-1` and a
 * number are one field on the wire and three different sentences to a person,
 * and only a control naming all three lets somebody tell a torrent following
 * the global limit from one that will never stop.
 */
export function ShareLimitDialog({ torrent, onClose, onApply }: ShareLimitDialogProps) {
  if (torrent === null) return null

  /* Keyed by the daemon's own values, so an edit made from the stock WebUI or
     another client remounts the editor with the new ones rather than leaving a
     stale draft over them. Same reason LimitField is keyed on its limit. */
  const key = [
    torrent.hash,
    torrent.ratio_limit,
    torrent.seeding_time_limit,
    torrent.inactive_seeding_time_limit ?? '',
    torrent.share_limit_action ?? '',
  ].join(':')

  return <Editor key={key} torrent={torrent} onClose={onClose} onApply={onApply} />
}

function Editor({
  torrent,
  onClose,
  onApply,
}: {
  torrent: Torrent
  onClose: () => void
  onApply: (limits: ReturnType<typeof toWire>) => void
}) {
  const [draft, setDraft] = useState<ShareLimitDraft>(() => draftFrom(torrent))
  const set = (patch: Partial<ShareLimitDraft>) => setDraft((d) => ({ ...d, ...patch }))

  const dirty = changed(draft, torrent)

  const save = () => {
    // A write that changes nothing still reaches the daemon and can still
    // fail, which would report a failure for something nobody did.
    if (dirty) onApply(toWire(draft))
    onClose()
  }

  /**
   * `inactive_seeding_time_limit` arrived in qBittorrent 4.6, so an older
   * daemon never sends it. Offering the control anyway would be worse than
   * hiding it: the parameter still has to go on every call, and a limit the
   * daemon ignores would read as having been applied.
   */
  const hasInactive = torrent.inactive_seeding_time_limit !== undefined

  return (
    <Dialog
      open
      onClose={onClose}
      title="Share limits"
      description={<span className="line-clamp-1 text-[11.5px] text-text-dim">{torrent.name}</span>}
      width={560}
      icon={<icons.scale className="size-[15px]" strokeWidth={2} />}
      showClose
      footer={
        <>
          <span className="font-mono text-[10.5px] text-text-dimmer">
            applies to this torrent only
          </span>
          <span className="flex-1" />
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={save} disabled={!dirty}>
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col">
        <Row
          name="Ratio"
          // The same word Settings now defines, glossed again because this
          // dialog is reachable without ever opening Settings. Kept to three
          // words: the row already carries a mode strip, a value box and a
          // resolved summary, and the hint is the part that gives way first.
          hint="uploaded against downloaded"
          mode={draft.ratioMode}
          value={draft.ratio}
          placeholder="e.g. 2.0"
          unit="ratio"
          effective={describeEffective(torrent.max_ratio, 'ratio')}
          onMode={(ratioMode) => set({ ratioMode })}
          onValue={(ratio) => set({ ratio })}
        />
        <Row
          name="Seeding time"
          mode={draft.seedingMode}
          value={draft.seedingMinutes}
          placeholder="e.g. 1440"
          unit="minutes"
          effective={describeEffective(torrent.max_seeding_time, 'minutes')}
          onMode={(seedingMode) => set({ seedingMode })}
          onValue={(seedingMinutes) => set({ seedingMinutes })}
        />
        {hasInactive ? (
          <Row
            name="Inactive time"
            hint="while nothing moves, not while seeding"
            mode={draft.inactiveMode}
            value={draft.inactiveMinutes}
            placeholder="e.g. 4320"
            unit="minutes"
            effective={describeEffective(torrent.max_inactive_seeding_time, 'minutes')}
            onMode={(inactiveMode) => set({ inactiveMode })}
            onValue={(inactiveMinutes) => set({ inactiveMinutes })}
          />
        ) : null}

        <div className="flex flex-col gap-2 border-t border-line bg-surface2 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <SectionHeader>When a limit is reached</SectionHeader>
            <span className="flex-1" />
            <span className="font-mono text-[10.5px] text-text-dimmer">
              torrents/setShareLimits
            </span>
          </div>
          <select
            aria-label="When a limit is reached"
            value={draft.action}
            onChange={(e) => set({ action: e.target.value as ShareLimitAction })}
            // No focus-visible override here. This control has its own radius, so
            // the ring from tokens/base.css follows it and looks right; the
            // `focus:outline-none` an earlier draft carried could not have
            // applied anyway, being a layered utility against an unlayered rule.
            className="h-[31px] w-full rounded-lg border border-line bg-surface px-2.5 text-[12px] text-text transition-colors duration-quick"
          >
            {ACTIONS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Dialog>
  )
}

function Row({
  name,
  hint,
  mode,
  value,
  placeholder,
  unit,
  effective,
  onMode,
  onValue,
}: {
  name: string
  hint?: string
  mode: ShareLimitMode
  value: string
  placeholder: string
  unit: string
  effective: string
  onMode: (next: ShareLimitMode) => void
  onValue: (next: string) => void
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-line bg-surface2 px-4 py-3 first:border-t-0">
      <div className="flex items-center gap-2.5">
        <SectionHeader>{name}</SectionHeader>
        {/* Truncates rather than wraps. The hint is the least important thing
            on the line and the only one that can be long, so it gives way
            first instead of pushing the row to two lines. */}
        {hint ? (
          <span className="min-w-0 truncate text-[11px] text-text-dimmer" title={hint}>
            {hint}
          </span>
        ) : null}
        <span className="flex-1" />
        {/* What the daemon will actually enforce, which is not what the strip
            says: a torrent following a global limit that is switched off is
            not limited at all. Reads the resolved max_* field, not the
            setting.

            Never wrapped. Broken across two lines it reads as two fragments,
            and it is the one part of the row that has to be read as a
            sentence. */}
        <span className="shrink-0 font-mono text-[10.5px] whitespace-nowrap text-text-dimmer">
          now: {effective}
        </span>
      </div>
      <div className="flex items-center gap-2.5">
        <SegmentedControl
          size="sm"
          label={`${name} limit`}
          options={MODES}
          value={mode}
          onChange={onMode}
        />
        <Input
          mono
          size="sm"
          value={value}
          disabled={mode !== 'custom'}
          onChange={(e) => onValue(e.target.value)}
          aria-label={`${name} limit value`}
          placeholder={mode === 'custom' ? placeholder : mode === 'global' ? 'global' : 'none'}
          className="w-[104px]"
        />
        <span className="font-mono text-[10.5px] text-text-dimmer">{unit}</span>
      </div>
    </div>
  )
}
