import { NumberField } from '@/features/settings/number-field'
import { KIB } from '@/components/ui/limit-field'

export interface SpeedFieldProps {
  /** The daemon's value, in bytes per second. */
  bytesPerSecond: number
  /** Called with bytes per second, not with what was typed. */
  onChange: (bytesPerSecond: number) => void
  label: string
  disabled?: boolean
}

/**
 * A speed limit, shown in KiB/s and stored in bytes per second.
 *
 * `app/preferences` speaks bytes for all four speed limits, and this screen
 * showed the raw number under a `KiB/s` label. Every value was wrong by 1024:
 * the alternative limits, sitting at qBittorrent's own 10 KiB/s default, read
 * as **10240 KiB/s**.
 *
 * The write direction was worse than the display. Typing `500` meaning 500
 * KiB/s saved 500 bytes per second, which is half a KiB, and a connection
 * throttled to nothing looks like rigseed being broken rather than like the
 * number having been taken in the wrong unit.
 *
 * Proven rather than inferred. Setting `alt_up_limit` to `7168` through the
 * API made qBittorrent write `Session\AlternativeGlobalUPSpeedLimit=7` into
 * its own `qBittorrent.ini`, which stores KiB. 7168 bytes is 7 KiB, so the API
 * is bytes and the config, like qBittorrent's own interface, is KiB.
 *
 * One component rather than a conversion at each of the four call sites, so
 * the unit boundary is in a single place. Four hand-written conversions is an
 * invitation for one of them to be missed, which is the shape of the bug this
 * replaces.
 */
export function SpeedField({ bytesPerSecond, onChange, label, disabled }: SpeedFieldProps) {
  return (
    <NumberField
      // Rounded, though it divides evenly in practice: qBittorrent stores whole
      // KiB, so every value it sends is a multiple of 1024. A daemon that sent
      // something else should still not put a fraction in a number box.
      value={Math.round(bytesPerSecond / KIB)}
      // Zero survives the round trip in both directions, which matters because
      // zero is how this screen says unlimited.
      onChange={(kib) => onChange(Math.round(kib) * KIB)}
      label={label}
      unit="KiB/s"
      min={0}
      {...(disabled === undefined ? {} : { disabled })}
    />
  )
}
