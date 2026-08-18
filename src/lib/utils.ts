import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge class names, with later Tailwind utilities winning over earlier ones.
 *
 * clsx resolves the conditionals, twMerge resolves the conflicts: `cn('p-2',
 * 'p-4')` yields `p-4` rather than both. Every component takes a `className`
 * prop and runs it through this, so a caller can always override.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
