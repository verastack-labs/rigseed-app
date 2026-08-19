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
        'transition-colors duration-fast focus-within:border-accent',
        HEIGHT[size],
        invalid ? 'border-danger' : 'border-line',
        !unit && className,
      )}
    >
      {icon ? <span className="text-text-dimmer flex shrink-0">{icon}</span> : null}
      <input
        aria-invalid={invalid || undefined}
        className={cn(
          'text-text min-w-0 flex-1 border-none bg-transparent outline-none',
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
