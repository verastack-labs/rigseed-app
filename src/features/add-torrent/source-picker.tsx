import { DropZone } from '@/components/ui/drop-zone'
import { SectionHeader } from '@/components/ui/section-header'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Textarea } from '@/components/ui/textarea'
import { icons } from '@/lib/icons'
import { formatBytes } from '@/utils/format'
import type { TorrentMeta } from '@/utils/torrent-file'

export type Source = 'file' | 'magnet'

export interface SourcePickerProps {
  source: Source
  onSource: (next: Source) => void
  /** The picked file, and what could be read out of it. */
  file: File | null
  meta: TorrentMeta | null
  /** Set when a picked file turned out not to be a torrent. */
  fileError: string | null
  onFiles: (files: File[]) => void
  magnet: string
  onMagnet: (next: string) => void
}

/** The mono line under the filename: what was read, or what to do. */
function fileHint(file: File | null, meta: TorrentMeta | null, error: string | null): string {
  if (error) return error
  if (!file) return 'or drop one anywhere on this panel'
  if (!meta) return 'reading…'
  const entries = meta.entries.length === 1 ? '1 entry' : `${meta.entries.length} entries`
  // One decimal here, two in the save-path hint. That is the design: this
  // line is a glance, that one is a number being compared against free space.
  return `${formatBytes(meta.totalSize, 1)} · ${entries} · drop another file to replace`
}

/**
 * Where the torrent comes from.
 *
 * The two paths are exclusive in the UI even though `torrents/add` accepts
 * files and links in the same request. Offering both at once would mean a
 * Contents list that describes the file while a magnet is also queued, and the
 * count in the footer would stop matching what is on screen.
 */
export function SourcePicker({
  source,
  onSource,
  file,
  meta,
  fileError,
  onFiles,
  magnet,
  onMagnet,
}: SourcePickerProps) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2.5">
        <SectionHeader>Source</SectionHeader>
        <SegmentedControl
          size="sm"
          label="Source"
          options={[
            { value: 'file', label: 'Torrent file' },
            { value: 'magnet', label: 'Magnet link' },
          ]}
          value={source}
          onChange={(next) => onSource(next as Source)}
        />
      </div>

      {source === 'file' ? (
        <DropZone
          icon={<icons.folder className="size-[15px]" strokeWidth={2} />}
          title={file ? file.name : 'Choose a .torrent file'}
          hint={fileHint(file, meta, fileError)}
          accept=".torrent,application/x-bittorrent"
          onFiles={onFiles}
        />
      ) : (
        <div className="flex flex-col gap-1.5">
          <Textarea
            mono
            rows={3}
            value={magnet}
            onChange={(e) => onMagnet(e.target.value)}
            placeholder="magnet:?xt=urn:btih:…"
            aria-label="Magnet links"
          />
          <span className="font-mono text-[10.5px] text-text-dimmer">
            One link per line. Metadata is fetched before the file list appears.
          </span>
        </div>
      )}
    </section>
  )
}
