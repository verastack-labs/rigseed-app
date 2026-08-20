import type { TextareaHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Mono for magnets, paths and anything the user pastes rather than composes. */
  mono?: boolean
  invalid?: boolean
  className?: string
}

/**
 * Multi-line field. Input's manners, with room for several lines.
 *
 * Resizing is off. The one place this appears is the magnet box, whose height
 * is part of the modal's layout, and a hand-dragged textarea inside a fixed
 * panel pushes the footer out of reach.
 */
export function Textarea({ mono, invalid, className, ...props }: TextareaProps) {
  return (
    <div
      className={cn(
        'bg-surface2 flex w-full rounded-lg border px-[11px] py-[9px]',
        // No focus colour on this border, same as Input. The field gets the
        // accent ring from the :focus-visible rule in tokens/base.css, and a
        // border that also changes is a second ring by another name. Input
        // was fixed and this was missed, which is why the magnet box still
        // showed both.
        'transition-colors duration-fast',
        invalid ? 'border-danger' : 'border-line',
        className,
      )}
    >
      <textarea
        aria-invalid={invalid || undefined}
        className={cn(
          'text-text min-w-0 flex-1 resize-none border-none bg-transparent text-[12px] outline-none',
          'placeholder:text-text-dimmer leading-[1.6]',
          mono ? 'font-mono' : 'font-sans',
        )}
        {...props}
      />
    </div>
  )
}
