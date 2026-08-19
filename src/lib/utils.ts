import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * tailwind-merge ships knowledge of Tailwind's own scales, not ours.
 *
 * Colour utilities work out of the box because it accepts any value after
 * `bg-` or `text-`. Named scales do not: `rounded-chip` is not in its list of
 * radius suffixes, so it is not recognised as a border-radius utility at all
 * and would not displace `rounded-lg`. Both classes would land on the element
 * and CSS source order, not the caller, would decide the winner.
 *
 * Every theme key we invent that is not a plain colour has to be declared here.
 * See the `@theme inline` block in src/styles/globals.css.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      rounded: [{ rounded: ['chip', 'round'] }],
      ease: [{ ease: ['spring', 'rail-slide', 'panel-reveal'] }],
      duration: [{ duration: ['fast', 'quick', 'base', 'spring', 'rail', 'panel', 'slow'] }],
    },
  },
})

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
