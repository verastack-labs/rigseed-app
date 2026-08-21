import { Button } from '@/components/ui/button'
import { DataValue } from '@/components/ui/data-value'
import { cn } from '@/lib/utils'
import { swatchColor, swatchFor } from '@/lib/labels'
import type { SearchResult } from '@/types/qbittorrent'
import { formatBytes } from '@/utils/format'

export interface ResultRowProps {
  result: SearchResult
  expanded: boolean
  onToggle: () => void
  onAdd: () => void
  onCopyMagnet: () => void
  className?: string
}

const COLUMNS = 'grid-cols-[1fr_96px_74px_74px_132px]'

/**
 * How healthy the swarm is, in words.
 *
 * Seeds alone are the number people look at and the wrong one to look at on
 * its own: forty seeds against four hundred leechers is a slow download, and
 * four seeds against nothing is a fast one. The share is what decides.
 */
function health(seeds: number, peers: number): { share: number; note: string } {
  const total = seeds + peers
  if (total === 0) return { share: 0, note: 'Nobody is sharing this right now.' }
  const share = seeds / total
  if (seeds === 0) return { share: 0, note: 'No seeds. This may never finish.' }
  if (share >= 0.6) return { share, note: 'Well seeded. Should come down quickly.' }
  if (share >= 0.25) return { share, note: 'Healthy enough. Expect a steady download.' }
  return { share, note: 'Far more leechers than seeds. Expect it to be slow.' }
}

/**
 * One hit, and the strip that opens under it.
 *
 * The row is a button rather than a div with a handler: it is the control that
 * expands the detail, and making it one means Enter and Space work without
 * anything being added for them.
 *
 * The magnet is shown in full rather than hidden behind the copy button. It is
 * the thing being handed over, and a person pasting it somewhere else deserves
 * to see what they are pasting.
 */
export function ResultRow({
  result,
  expanded,
  onToggle,
  onAdd,
  onCopyMagnet,
  className,
}: ResultRowProps) {
  const engine = result.engine ?? 'unknown'
  const { share, note } = health(result.nbSeeders, result.nbLeechers)

  return (
    <div className={cn('border-t border-line first:border-t-0', className)}>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        className={cn(
          'grid w-full items-center gap-2 px-4 py-2.5 text-left',
          'transition-colors duration-quick hover:bg-surface2',
          COLUMNS,
          expanded && 'bg-surface2',
        )}
      >
        <span className="min-w-0 truncate text-[12.5px] text-text" title={result.fileName}>
          {result.fileName}
        </span>
        <DataValue size="xs" tone="dim" className="text-right">
          {formatBytes(result.fileSize)}
        </DataValue>
        <DataValue size="xs" tone="accent2" className="text-right font-semibold">
          {result.nbSeeders}
        </DataValue>
        <DataValue size="xs" tone="dim" className="text-right">
          {result.nbLeechers}
        </DataValue>
        <span className="flex min-w-0 items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-[7px] shrink-0 rounded-full"
            style={{ background: swatchColor(swatchFor(engine)) }}
          />
          <span className="truncate text-[11.5px] text-text-dim">{engine}</span>
        </span>
      </button>

      {expanded ? (
        <div className="flex flex-col gap-3 bg-surface2 py-4 pr-[18px] pl-10">
          <div className="flex flex-col gap-1.5">
            <div className="flex h-2 overflow-hidden rounded-full bg-accent-soft">
              <span
                className="bg-accent2 transition-[width] duration-base"
                style={{ width: `${Math.round(share * 100)}%` }}
              />
            </div>
            <div className="flex items-center gap-2">
              <DataValue size="xs" tone="dimmer">
                {result.nbSeeders} seeding · {result.nbLeechers} leeching
              </DataValue>
              <span className="text-[11.5px] text-text-dim">{note}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" size="sm" onClick={onAdd}>
              Add torrent
            </Button>
            <Button variant="secondary" size="sm" onClick={onCopyMagnet}>
              Copy magnet
            </Button>
            {result.descrLink ? (
              <a
                href={result.descrLink}
                target="_blank"
                rel="noreferrer noopener"
                className="rounded-lg border border-line px-3 py-[7px] text-[11.5px] font-semibold text-text-dim transition-colors duration-quick hover:text-accent"
              >
                Description page
              </a>
            ) : null}
            <span className="flex-1" />
            <span className="max-w-[420px] truncate font-mono text-[10.5px] text-text-dimmer">
              {result.fileUrl}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export { COLUMNS as RESULT_COLUMNS }
