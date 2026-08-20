import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DataValue } from '@/components/ui/data-value'
import { Disclosure } from '@/components/ui/disclosure'
import { FilterRow } from '@/components/ui/filter-row'
import { SectionHeader } from '@/components/ui/section-header'
import { Sparkline } from '@/components/ui/sparkline'
import { icons } from '@/lib/icons'
import { swatchColor, swatchFor } from '@/lib/labels'
import { cn } from '@/lib/utils'
import type { StatusFilter } from '@/state/transfers-store'
import { formatSpeed } from '@/utils/format'

const STATUSES: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All torrents' },
  { key: 'downloading', label: 'Downloading' },
  { key: 'seeding', label: 'Seeding' },
  { key: 'completed', label: 'Completed' },
  { key: 'paused', label: 'Paused' },
  { key: 'active', label: 'Active' },
  { key: 'stalled', label: 'Stalled' },
]

export interface SidebarProps {
  status: StatusFilter
  statusCounts: Record<StatusFilter, number>
  categories: Map<string, number>
  tags: Map<string, number>
  category: string | null
  tag: string | null
  filtersActive: boolean
  downSpeed: number
  upSpeed: number
  downHistory: readonly number[]
  upHistory: readonly number[]
  onStatus: (status: StatusFilter) => void
  onCategory: (category: string | null) => void
  onTag: (tag: string | null) => void
  onClear: () => void
  className?: string
}

export function Sidebar({
  status,
  statusCounts,
  categories,
  tags,
  category,
  tag,
  filtersActive,
  downSpeed,
  upSpeed,
  downHistory,
  upHistory,
  onStatus,
  onCategory,
  onTag,
  onClear,
  className,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex w-[236px] shrink-0 flex-col gap-4 overflow-y-auto border-r border-line bg-sidebar px-3 py-3.5',
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <SectionHeader className="px-[9px] pb-1">Status</SectionHeader>
        {STATUSES.map((s) => (
          <FilterRow
            key={s.key}
            label={s.label}
            icon={<icons.folder className="size-[15px]" strokeWidth={2} />}
            count={statusCounts[s.key]}
            active={status === s.key}
            onClick={() => onStatus(s.key)}
          />
        ))}
      </div>

      {/* Folding, because these two grow without limit while Status never
          does. A person with forty tags was scrolling past them to reach the
          Clear filters button. */}
      {categories.size > 0 ? (
        <Disclosure title="Categories" count={categories.size}>
          {[...categories].map(([name, count]) => (
            <FilterRow
              key={name}
              label={name}
              dot={swatchColor(swatchFor(name))}
              count={count}
              active={category === name}
              onClick={() => onCategory(category === name ? null : name)}
            />
          ))}
        </Disclosure>
      ) : null}

      {tags.size > 0 ? (
        <Disclosure title="Tags" count={tags.size}>
          {[...tags].map(([name, count]) => (
            <FilterRow
              key={name}
              label={name}
              dot={swatchColor(swatchFor(name))}
              count={count}
              active={tag === name}
              onClick={() => onTag(tag === name ? null : name)}
            />
          ))}
        </Disclosure>
      ) : null}

      {/* Fades in rather than appearing, so the list below does not jump. */}
      <div
        className={cn(
          'px-1 transition-opacity duration-base',
          filtersActive ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <Button size="sm" fullWidth onClick={onClear}>
          Clear filters
        </Button>
      </div>

      <span className="flex-1" />

      <Card padding="row" className="shrink-0">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <icons.download className="size-[13px] shrink-0 text-accent" strokeWidth={2} />
            <span className="flex-1 text-[11px] text-text-dim">Down</span>
            <DataValue tone="accent">{formatSpeed(downSpeed)}</DataValue>
          </div>
          <div className="flex items-center gap-2">
            <icons.download
              className="size-[13px] shrink-0 rotate-180 text-accent2"
              strokeWidth={2}
            />
            <span className="flex-1 text-[11px] text-text-dim">Up</span>
            <DataValue tone="accent2">{formatSpeed(upSpeed)}</DataValue>
          </div>
        </div>
        <div className="-mx-[13px] mt-3 -mb-[13px] border-t border-b-0 border-line bg-surface2">
          <Sparkline data={downHistory} upload={upHistory} height={46} />
        </div>
      </Card>
    </aside>
  )
}
