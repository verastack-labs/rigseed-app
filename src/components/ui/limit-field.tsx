import { useRef, useState } from 'react'

import { Input } from '@/components/ui/input'
import { SectionHeader } from '@/components/ui/section-header'
import { Switch } from '@/components/ui/switch'
import { LIMIT_UNLIMITED } from '@/types/qbittorrent'

/**
 * The daemon speaks bytes per second, the field speaks KiB/s.
 *
 * 1024, not 1000. Everything else in rigseed uses base 1000 because that is
 * what the daemon reports sizes in, but this one field is the exception: the
 * qBittorrent UI has always labelled its limits KiB/s and a user copying a
 * number across from it must get the same limit.
 */
export const KIB = 1024

export interface LimitFieldProps {
  /**
   * The direction, for the accessible names.
   *
   * Separate from the visible "Limit" because both cards show that same word,
   * and two controls called "Limit limit" are indistinguishable to anything
   * that reads names rather than looks at layout.
   */
  name: string
  api: string
  limit: number
  onChange: (bytesPerSecond: number) => void
}

/**
 * Mounted with a `key` of the current limit, so a change from the daemon
 * remounts it and the draft starts from the new value.
 *
 * The daemon is the source of truth and it can be changed from elsewhere: the
 * stock WebUI, another client, a scheduled alternative limit. Syncing that in
 * an effect was the first attempt; remounting says the same thing without a
 * component that has to remember to correct itself. Typing is undisturbed
 * while the limit is unchanged, which is every poll but the one that matters.
 */
export function LimitField({ name, api, limit, onChange }: LimitFieldProps) {
  const capped = limit !== LIMIT_UNLIMITED && limit !== 0

  /**
   * Whether the field is open for typing, which is not the same question as
   * whether a limit is currently set.
   *
   * Deriving the disabled state from `limit` alone was the first attempt and
   * it deadlocked: unlimited disabled the box, a disabled box could not be
   * typed into, an empty box committed as unlimited, and the switch snapped
   * back on. There was no path from unlimited to any limit at all. Turning
   * the switch off has to open the field before there is a number in it.
   */
  const [live, setLive] = useState(capped)
  const [draft, setDraft] = useState(capped ? String(Math.round(limit / KIB)) : '')
  const field = useRef<HTMLInputElement>(null)

  /** Back to unlimited, with the switch saying so rather than drifting. */
  const clear = () => {
    setLive(false)
    setDraft('')
    onChange(LIMIT_UNLIMITED)
  }

  const commit = () => {
    const value = Number(draft)
    // An emptied box means unlimited, not zero. A zero limit would stop the
    // torrent dead, which is nobody's reading of clearing a field.
    if (!draft.trim() || !Number.isFinite(value) || value <= 0) {
      clear()
      return
    }
    onChange(Math.round(value * KIB))
  }

  return (
    <div className="flex items-center gap-2.5 border-t border-line bg-surface2 px-4 py-3">
      <SectionHeader>Limit</SectionHeader>
      <Input
        mono
        ref={field}
        size="sm"
        value={draft}
        disabled={!live}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
        }}
        aria-label={`${name} limit`}
        placeholder={live ? 'e.g. 500' : 'unlimited'}
        className="w-[92px]"
      />
      <span className="font-mono text-[10.5px] text-text-dimmer">KiB/s</span>

      <span className="flex-1" />

      <Switch
        label={`${name} unlimited`}
        checked={!live}
        onChange={(next) => {
          if (next) {
            clear()
            return
          }
          setLive(true)
          // The switch just handed the decision to the field, so put the
          // cursor there. After a frame, because the field is still disabled
          // in the DOM this render and focus on a disabled input does nothing.
          requestAnimationFrame(() => field.current?.focus())
        }}
      />
      <span className="text-[11.5px] text-text-dim">Unlimited</span>
      <span className="font-mono text-[10.5px] text-text-dimmer">{api}</span>
    </div>
  )
}
