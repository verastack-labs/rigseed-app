import { cn } from '@/lib/utils'

export interface SwitchProps {
  checked?: boolean
  onChange?: (next: boolean) => void
  disabled?: boolean
  /** Accessible name. Required, since the track carries no visible text. */
  label: string
  className?: string
}

/** 36x20 toggle. The only on/off control in the system. */
export function Switch({ checked = false, onChange, disabled, label, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-[10px] border p-0',
        'transition-[background-color,border-color] duration-quick',
        'disabled:pointer-events-none disabled:opacity-45',
        checked ? 'bg-accent-soft border-accent' : 'bg-surface2 border-line',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute top-[3px] left-[3px] size-3 rounded-full',
          'ease-spring transition-[transform,background-color] duration-spring',
          checked ? 'bg-accent translate-x-4' : 'bg-text-dimmer translate-x-0',
        )}
      />
    </button>
  )
}
