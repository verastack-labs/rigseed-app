import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * Primary, secondary, ghost and danger actions.
 *
 * Primary is the one committing action in a view: Apply, Add and start, Start
 * using rigseed. Secondary is everything else. Ghost is for Skip and Cancel.
 * Danger is remove and delete, and never uses the accent.
 *
 * For an icon-only control use IconButton, which is square.
 */
const buttonVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center gap-[7px] whitespace-nowrap',
    'rounded-lg border font-sans',
    'transition-[background-color,color,border-color,filter,transform] duration-fast',
    // motion-safe, because the press-scale is decoration. The motion tokens
    // handle overshoot and duration on their own, but a transform has no
    // token to flatten it, so the variant is the only place it can be
    // dropped for somebody who asked for less movement.
    'motion-safe:active:scale-[0.96]',
    'disabled:pointer-events-none disabled:opacity-45',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-on border-accent font-bold hover:brightness-[1.07]',
        secondary:
          'bg-surface2 text-text border-line font-semibold hover:bg-accent-soft hover:text-accent',
        ghost:
          'text-text-dim border-transparent bg-transparent font-semibold hover:bg-surface2 hover:text-text',
        danger: 'bg-surface2 text-danger border-line font-semibold hover:bg-danger-soft',
      },
      size: {
        sm: 'px-[12px] py-[7px] text-[11.5px]',
        md: 'px-[17px] py-[9px] text-[12.5px]',
        lg: 'px-[20px] py-[11px] text-[13px]',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'md',
      fullWidth: false,
    },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Leading icon node, 14 to 15px. */
  icon?: ReactNode
  /** Trailing icon node, for example a chevron. */
  iconRight?: ReactNode
}

export function Button({
  className,
  variant,
  size,
  fullWidth,
  icon,
  iconRight,
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      {...props}
    >
      {icon}
      {children}
      {iconRight}
    </button>
  )
}

export { buttonVariants }
