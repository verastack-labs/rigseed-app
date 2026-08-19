import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface Tab<T extends string = string> {
  value: T
  label: string
  icon?: ReactNode
  count?: number
}

export interface TabBarProps<T extends string = string> {
  tabs: readonly Tab<T>[]
  value: T
  onChange?: (next: T) => void
  /** Accessible name for the tab list, for example "Torrent detail". */
  label: string
  className?: string
}

/**
 * Underlined tabs. The detail screen's five sections.
 *
 * A real tablist rather than a row of buttons: arrow keys move between tabs,
 * and only the selected tab is in the page tab order, which is the standard
 * pattern. Tab then moves out of the strip rather than through five stops.
 */
export function TabBar<T extends string = string>({
  tabs,
  value,
  onChange,
  label,
  className,
}: TabBarProps<T>) {
  const move = (delta: number) => {
    const at = tabs.findIndex((t) => t.value === value)
    const next = tabs[(at + delta + tabs.length) % tabs.length]
    if (next) onChange?.(next.value)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault()
        move(1)
        break
      case 'ArrowLeft':
        event.preventDefault()
        move(-1)
        break
      case 'Home':
        event.preventDefault()
        if (tabs[0]) onChange?.(tabs[0].value)
        break
      case 'End':
        event.preventDefault()
        if (tabs.at(-1)) onChange?.(tabs.at(-1)!.value)
        break
    }
  }

  return (
    <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className={cn('flex gap-0.5', className)}>
      {tabs.map((tab) => {
        const on = tab.value === value
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange?.(tab.value)}
            className={cn(
              'inline-flex items-center gap-[7px] border-none border-b-2 bg-transparent',
              'px-[15px] py-[11px] font-sans text-[12.5px] font-semibold whitespace-nowrap',
              'transition-[color,border-color] duration-quick',
              on ? 'border-accent text-accent' : 'text-text-dim border-transparent',
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.count != null ? (
              <span
                className={cn(
                  'rounded-sm px-[5px] py-0.5 font-mono text-[10px] tabular-nums',
                  on ? 'bg-accent-soft' : 'bg-surface2',
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
