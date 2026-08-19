import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SectionHeader } from '@/components/ui/section-header'
import { cn } from '@/lib/utils'
import { formatBytes } from '@/utils/format'

export interface SavePathFieldProps {
  value: string
  onChange: (next: string) => void
  /** From `server_state.free_space_on_disk`. Zero means not reported yet. */
  freeSpace: number
  /** Total of the entries still selected. Zero for a magnet with no metadata. */
  needed: number
  /** Opens the native directory picker. Absent outside the desktop shell. */
  onBrowse?: () => void
  disabled?: boolean
}

/**
 * Where the torrent lands, and whether it fits.
 *
 * The comparison is the point of the hint. Both figures alone are trivia; the
 * moment one exceeds the other it is the only thing on the panel worth
 * reading, so it turns `--warn` rather than staying quiet and letting the
 * daemon fail an hour later with the disk full.
 */
export function SavePathField({
  value,
  onChange,
  freeSpace,
  needed,
  onBrowse,
  disabled,
}: SavePathFieldProps) {
  // Only when both are known. A magnet has no size until metadata arrives, and
  // "0 B needed" next to a warning colour would be a false alarm.
  const tooBig = freeSpace > 0 && needed > 0 && needed > freeSpace

  const hint = [
    freeSpace > 0 ? `${formatBytes(freeSpace, 0)} free` : null,
    needed > 0 ? `${formatBytes(needed)} needed` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <section className="flex min-w-0 flex-col gap-2">
      <SectionHeader>Save path</SectionHeader>

      <div className="flex items-center gap-2">
        <Input
          mono
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Save path"
          placeholder="Default from preferences"
          className="min-w-0 flex-1"
        />
        <Button
          variant="secondary"
          size="sm"
          disabled={!onBrowse || disabled}
          // The native directory picker is a shell capability. In a browser
          // there is no way to name a folder the app can then write to, so the
          // control is present and inert rather than absent and surprising.
          title={onBrowse ? undefined : 'Available in the desktop app'}
          onClick={onBrowse}
        >
          Browse
        </Button>
      </div>

      {hint ? (
        <span
          role={tooBig ? 'alert' : undefined}
          className={cn('font-mono text-[10.5px]', tooBig ? 'text-warn' : 'text-text-dimmer')}
        >
          {hint}
          {tooBig ? ' · not enough room' : ''}
        </span>
      ) : null}
    </section>
  )
}
