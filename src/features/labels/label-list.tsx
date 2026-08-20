import { IconTile } from '@/components/ui/icon-tile'
import { Input } from '@/components/ui/input'
import { categoryIcons, icons } from '@/lib/icons'
import { swatchColor, type CategoryIconKey, type SwatchKey } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { formatBytes } from '@/utils/format'

/** One row's worth of what the screen knows about a label. */
export interface LabelSummary {
  name: string
  /** Save path for a category, "used on N torrents" for a tag. */
  sub: string
  color: SwatchKey
  /** Categories get a tile with an icon, tags get a dot. */
  icon?: CategoryIconKey
  count: number
  size: number
}

export interface LabelListProps {
  items: readonly LabelSummary[]
  selected: string | null
  onSelect: (name: string) => void
  filter: string
  onFilter: (next: string) => void
  /** The endpoint the rows came from, shown in the footer strip. */
  api: string
  /** Word for one of these, for the empty state and the filter placeholder. */
  noun: string
  /** Its plural. Passed rather than derived: "categorys" is what deriving gives. */
  plural: string
  className?: string
}

/**
 * The left half of Categories & Tags.
 *
 * Categories and tags are different things with the same shape: a name, a
 * colour, a count and a total size. One list renders both rather than two that
 * drift, and the difference between them is a tile against a dot, which is
 * exactly the difference the design draws.
 *
 * The filter is not a search: it narrows a list the user can already see, so
 * it matches on substring and does nothing clever about ranking.
 */
export function LabelList({
  items,
  selected,
  onSelect,
  filter,
  onFilter,
  api,
  noun,
  plural,
  className,
}: LabelListProps) {
  const needle = filter.trim().toLowerCase()
  const shown = needle ? items.filter((i) => i.name.toLowerCase().includes(needle)) : items

  return (
    <div
      className={cn('flex w-[440px] shrink-0 flex-col border-r border-line bg-sidebar', className)}
    >
      <div className="shrink-0 px-3.5 py-3">
        <Input
          value={filter}
          onChange={(e) => onFilter(e.target.value)}
          aria-label={`Filter ${plural}`}
          placeholder="Filter"
          icon={<icons.search className="size-[13px]" strokeWidth={2} />}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {shown.length === 0 ? (
          <p className="px-3 py-6 text-[12.5px] text-text-dim">
            {items.length === 0 ? `No ${plural} yet.` : `No ${noun} matches "${filter}".`}
          </p>
        ) : (
          shown.map((item) => (
            <button
              key={item.name}
              type="button"
              aria-pressed={selected === item.name}
              onClick={() => onSelect(item.name)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-3.5 text-left',
                'transition-colors duration-quick',
                selected === item.name ? 'bg-accent-soft' : 'hover:bg-surface2',
              )}
            >
              {item.icon ? (
                <IconTile size={30} color={swatchColor(item.color)}>
                  {(() => {
                    const Glyph = categoryIcons[item.icon]
                    return <Glyph className="size-[15px]" strokeWidth={2} />
                  })()}
                </IconTile>
              ) : (
                <span
                  aria-hidden="true"
                  className="size-[10px] shrink-0 rounded-full"
                  style={{ background: swatchColor(item.color) }}
                />
              )}

              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[12.5px] font-semibold text-text">{item.name}</span>
                <span className="truncate font-mono text-[10.5px] text-text-dimmer">
                  {item.sub}
                </span>
              </span>

              <span className="flex shrink-0 flex-col items-end gap-0.5">
                <span className="font-mono text-[12px] text-text-dim tabular-nums">
                  {item.count}
                </span>
                <span className="font-mono text-[10.5px] text-text-dimmer tabular-nums">
                  {item.size > 0 ? formatBytes(item.size) : '—'}
                </span>
              </span>
            </button>
          ))
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t border-line px-3.5 py-2.5">
        <span className="font-mono text-[10.5px] text-text-dimmer tabular-nums">
          {shown.length === items.length
            ? `${items.length} ${items.length === 1 ? noun : plural}`
            : `${shown.length} of ${items.length}`}
        </span>
        <span className="flex-1" />
        <span className="font-mono text-[10.5px] text-text-dimmer">{api}</span>
      </div>
    </div>
  )
}
