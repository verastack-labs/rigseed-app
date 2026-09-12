import { RESULT_COLUMNS } from '@/features/search/result-row'
import { nextSort, sortLabel, type Sort, type SortKey } from '@/features/search/sort'
import { cn } from '@/lib/utils'

export interface ResultHeaderProps {
  sort: Sort
  onSort: (next: Sort) => void
  className?: string
}

const HEADINGS: { key: SortKey; label: string; align: 'left' | 'right' }[] = [
  { key: 'name', label: 'Name', align: 'left' },
  { key: 'size', label: 'Size', align: 'right' },
  { key: 'seeds', label: 'Seeds', align: 'right' },
  { key: 'peers', label: 'Peers', align: 'right' },
  { key: 'engine', label: 'Engine', align: 'left' },
]

/**
 * The caret, drawn rather than imported.
 *
 * It is six pixels of triangle that has to sit on the text baseline, which is
 * finicky to get out of a general-purpose icon at this size, and the set does
 * not carry an up or down chevron anyway.
 */
function Caret({ direction }: { direction: 'asc' | 'desc' }) {
  return (
    <svg
      width="7"
      height="4"
      viewBox="0 0 7 4"
      aria-hidden="true"
      className={cn(
        'shrink-0 transition-transform duration-quick',
        direction === 'asc' && 'rotate-180',
      )}
    >
      <path d="M3.5 4 0 0h7z" fill="currentColor" />
    </svg>
  )
}

/**
 * Sortable column headings.
 *
 * Buttons rather than a div with a click handler, so the keyboard reaches them
 * and Enter works without anything being written for it. `aria-sort` on the
 * cell is what a screen reader announces, and it is the only part of this that
 * is not visible.
 *
 * No table library. Five columns, one sort, entirely client-side; a table
 * package would add a dependency and a mental model to a component that is one
 * comparator and a row of buttons.
 */
export function ResultHeader({ sort, onSort, className }: ResultHeaderProps) {
  return (
    <div
      role="row"
      className={cn(
        'grid gap-2 border-b border-line bg-surface2 px-4 py-2',
        'text-[9.5px] font-bold tracking-[0.08em] text-text-dimmer uppercase',
        RESULT_COLUMNS,
        className,
      )}
    >
      {HEADINGS.map(({ key, label, align }) => {
        const active = sort.key === key
        return (
          <div
            key={key}
            role="columnheader"
            aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
            className={cn('min-w-0', align === 'right' && 'text-right')}
          >
            <button
              type="button"
              onClick={() => onSort(nextSort(sort, key))}
              title={
                active
                  ? `Sorted by ${sortLabel(sort)}. Click to reverse.`
                  : `Sort by ${sortLabel({ key, direction: sort.direction })}`
              }
              className={cn(
                'inline-flex items-center gap-1 rounded-sm',
                'tracking-[inherit] uppercase',
                'transition-colors duration-quick hover:text-text',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                active && 'text-accent',
                align === 'right' && 'flex-row-reverse',
              )}
            >
              <span className="truncate">{label}</span>
              {/* Only the sorted column carries a caret. One arrow per heading
                  would make five indicators and say nothing. */}
              {active ? <Caret direction={sort.direction} /> : null}
            </button>
          </div>
        )
      })}
    </div>
  )
}
