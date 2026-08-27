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
        // The shell wears the focus ring, exactly as Input does. This box is
        // where the square inner outline was most obvious, being tall enough
        // to show the mismatch against the rounded border around it.
        // The ring is always there, transparent until focus, so what changes is
        // a colour rather than an outline style. `outline-style` is not an
        // animatable property, so making the ring appear on focus alone would
        // snap it into place; fading the colour of one that already exists is
        // what makes it short rather than abrupt. It costs no layout, since an
        // outline never occupies space.
        'outline-2 outline-offset-2 outline-transparent focus-within:outline-accent',
        'transition-colors duration-fast',
        invalid ? 'border-danger' : 'border-line',
        className,
      )}
    >
      <textarea
        aria-invalid={invalid || undefined}
        className={cn(
          // See Input, and tokens/base.css: a utility cannot beat the
          // unlayered rule that draws the ring.
          'rs-inner-field text-text min-w-0 flex-1 resize-none border-none bg-transparent text-[12px]',
          'placeholder:text-text-dimmer leading-[1.6]',
          mono ? 'font-mono' : 'font-sans',
        )}
        {...props}
      />
    </div>
  )
}
