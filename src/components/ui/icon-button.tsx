import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

/**
 * Square icon-only control.
 *
 * `title` is required rather than optional: an icon with no label is
 * unreadable to a screen reader and unreadable in a collapsed nav rail, and
 * this is the control that appears in both.
 */
const iconButtonVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center rounded-lg border',
    'transition-[background-color,color,border-color] duration-quick',
    'hover:text-accent',
    'disabled:pointer-events-none disabled:opacity-45',
  ],
  {
    variants: {
      size: {
        sm: 'size-[30px]',
        md: 'size-[32px]',
        lg: 'size-[34px]',
      },
      active: {
        true: 'bg-accent-soft border-accent text-accent',
        false: 'bg-surface2 border-line text-text-dim',
      },
    },
    defaultVariants: { size: 'md', active: false },
  },
)

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'>,
    VariantProps<typeof iconButtonVariants> {
  /** Required. Used as both the tooltip and the accessible name. */
  title: string
}

export function IconButton({
  className,
  size,
  active,
  title,
  type = 'button',
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      title={title}
      aria-label={title}
      aria-pressed={active ?? undefined}
      className={cn(iconButtonVariants({ size, active }), className)}
      {...props}
    >
      {children}
    </button>
  )
}

export { iconButtonVariants }
