import type { InputHTMLAttributes, ReactNode, Ref } from 'react'

import { cn } from '@/lib/utils'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Mono for paths, numbers, hashes and magnets. Inter for names. */
  mono?: boolean
  size?: 'sm' | 'md' | 'lg'
  /** Fixed unit label to the right of the field, for example "KiB/s". */
  unit?: string
  /** Leading icon inside the field. */
  icon?: ReactNode
  invalid?: boolean
  /**
   * Forwarded to the inner field rather than to the bordered wrapper.
   *
   * React 19 passes `ref` through as an ordinary prop, so this already worked
   * by accident of the spread. Naming it says which of the two elements a
   * caller gets, which is the part that was guesswork.
   */
  ref?: Ref<HTMLInputElement>
  className?: string
}

const HEIGHT = { sm: 'h-[31px]', md: 'h-[34px]', lg: 'h-[42px]' } as const
const TEXT = { sm: 'text-[12px]', md: 'text-[12px]', lg: 'text-[15px] font-semibold' } as const

/** Text input. The Inter and mono split is semantic, not decorative. */
export function Input({ mono, size = 'md', unit, icon, invalid, className, ...props }: InputProps) {
  const field = (
    <div
      className={cn(
        'bg-surface2 flex w-full items-center gap-2 rounded-lg border px-[11px]',
        // The shell wears the focus ring, not the field inside it. Same 2px
        // accent and 2px offset every button gets, so focus looks the same
        // everywhere, but here it follows the rounded corner rather than
        // cutting a square inside it.
        // The ring is always there, transparent until focus, so what changes is
        // a colour rather than an outline style. `outline-style` is not an
        // animatable property, so making the ring appear on focus alone would
        // snap it into place; fading the colour of one that already exists is
        // what makes it short rather than abrupt. It costs no layout, since an
        // outline never occupies space.
        'outline-2 outline-offset-2 outline-transparent focus-within:outline-accent',
        'transition-colors duration-fast',
        HEIGHT[size],
        invalid ? 'border-danger' : 'border-line',
        !unit && className,
      )}
    >
      {icon ? <span className="text-text-dimmer flex shrink-0">{icon}</span> : null}
      <input
        aria-invalid={invalid || undefined}
        className={cn(
          // rs-inner-field, not outline-none. The rule that draws the ring is
          // unlayered and a utility is not, so the utility loses whatever its
          // specificity. See tokens/base.css.
          'rs-inner-field text-text min-w-0 flex-1 border-none bg-transparent',
          'placeholder:text-text-dimmer',
          mono ? 'font-mono' : 'font-sans',
          TEXT[size],
        )}
        {...props}
      />
    </div>
  )

  if (!unit) return field

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {field}
      <span className="text-text-dimmer w-11 shrink-0 font-mono text-[10.5px]">{unit}</span>
    </div>
  )
}
