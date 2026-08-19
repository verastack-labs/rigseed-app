import { SectionHeader } from '@/components/ui/section-header'
import { Switch } from '@/components/ui/switch'

export interface AddOptions {
  /** The UI's polarity. Inverted into `paused` at the call site. */
  start: boolean
  skipChecking: boolean
  sequential: boolean
  autoTMM: boolean
}

export interface OptionsCardProps {
  value: AddOptions
  onChange: (next: AddOptions) => void
}

/**
 * Each row names the parameter it sends.
 *
 * The mono line is not decoration. Half of these options exist because someone
 * read the qBittorrent docs, and showing `skip_checking` next to "Skip hash
 * check" means the person who knows the API and the person who does not are
 * reading the same row.
 */
const ROWS: { key: keyof AddOptions; label: string; api: string }[] = [
  // paused, not start: the label is inverted for the reader, and the mono line
  // has to stay honest about what actually goes over the wire.
  { key: 'start', label: 'Start torrent', api: 'paused=false' },
  { key: 'skipChecking', label: 'Skip hash check', api: 'skip_checking' },
  { key: 'sequential', label: 'Sequential download', api: 'sequentialDownload' },
  { key: 'autoTMM', label: 'Automatic Torrent Management', api: 'autoTMM' },
]

export function OptionsCard({ value, onChange }: OptionsCardProps) {
  return (
    <section className="flex flex-col gap-2">
      <SectionHeader>Options</SectionHeader>

      <div className="grid grid-cols-1 gap-x-5 gap-y-3 rounded-[11px] border border-line bg-surface2 p-4 md:grid-cols-2">
        {ROWS.map((row) => (
          <div key={row.key} className="flex min-w-0 items-center gap-2.5">
            <Switch
              label={row.label}
              checked={value[row.key]}
              onChange={(next) => onChange({ ...value, [row.key]: next })}
            />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-[12.5px] font-semibold text-text">{row.label}</span>
              <span className="font-mono text-[10.5px] text-text-dimmer">{row.api}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
