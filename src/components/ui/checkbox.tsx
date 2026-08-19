import { cn } from '@/lib/utils'

export interface CheckboxProps {
  checked?: boolean
  /** Renders a dash rather than a tick, and reports aria-checked="mixed". */
  indeterminate?: boolean
  onChange?: (next: boolean) => void
  disabled?: boolean
  /** Accessible name. Required, since the box carries no visible text. */
  label: string
  className?: string
}

/** 16x16 selection box, used in torrent rows and file lists. */
export function Checkbox({
  checked = false,
  indeterminate = false,
  onChange,
  disabled,
  label,
  className,
}: CheckboxProps) {
  const on = checked || indeterminate

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        'inline-flex size-4 shrink-0 items-center justify-center rounded-sm border-[1.5px] p-0',
        'transition-[background-color,border-color] duration-fast',
        'disabled:pointer-events-none disabled:opacity-45',
        on ? 'bg-accent border-accent' : 'border-line bg-transparent',
        className,
      )}
    >
      {indeterminate ? (
        <span className="bg-accent-on h-[2px] w-[8px] rounded-[1px]" />
      ) : checked ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-accent-on size-[11px]"
          aria-hidden="true"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : null}
    </button>
  )
}
