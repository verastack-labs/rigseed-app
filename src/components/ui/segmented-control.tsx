import { cn } from '@/lib/utils'

import type { ReactNode } from 'react'

export interface SegmentedOption<T extends string = string> {
  value: T
  label: string
  icon?: ReactNode
  count?: number
}

export interface SegmentedControlProps<T extends string = string> {
  options: readonly (T | SegmentedOption<T>)[]
  value: T
  onChange?: (next: T) => void
  size?: 'sm' | 'md'
  /** Accessible name for the group, for example "View" or "Log tab". */
  label: string
  className?: string
}

function normalise<T extends string>(o: T | SegmentedOption<T>): SegmentedOption<T> {
  return typeof o === 'string' ? { value: o, label: o } : o
}

/** Mutually exclusive choices in one strip: layouts, tabs, modes. */
export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = 'md',
  label,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        'bg-surface2 border-line inline-flex shrink-0 gap-[3px] rounded-xl border p-[3px]',
        className,
      )}
    >
      {options.map((raw) => {
        const opt = normalise(raw)
        const on = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={on}
            title={opt.label}
            onClick={() => onChange?.(opt.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border-none font-semibold whitespace-nowrap',
              'transition-colors duration-quick',
              size === 'sm' ? 'px-[9px] py-[5px] text-[11.5px]' : 'px-3 py-1.5 text-[12px]',
              on ? 'bg-accent-soft text-accent' : 'text-text-dim bg-transparent',
            )}
          >
            {opt.icon}
            {opt.label}
            {opt.count != null ? (
              <span className="font-mono text-[10px] opacity-75">{opt.count}</span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
