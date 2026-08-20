import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface NavRailProps {
  expanded: boolean
  onToggle: () => void
  /** RailItem children. */
  children: ReactNode
  /** The cleat brand mark. */
  brand?: ReactNode
  className?: string
}

/**
 * The nav rail frame.
 *
 * Fixed to the left edge, above the content, with no reflow: it is 60px wide
 * and expands to 212px as an overlay, so the page behind never shifts. The
 * content area is padded 60px from the left to account for the collapsed rail.
 *
 * Expanding drops a scrim over the rest of the app. Clicking the scrim
 * collapses the rail, and so does Escape, per the keyboard map.
 */
export function NavRail({ expanded, onToggle, children, brand, className }: NavRailProps) {
  return (
    <>
      {/* Always mounted, faded rather than switched. A conditionally
          rendered element has no previous state to transition from, so the
          scrim appeared at full strength in one frame while the menu it
          belongs to animated in behind it. */}
      <div
        role="presentation"
        onClick={() => onToggle()}
        className={cn(
          'fixed inset-0 z-20 backdrop-blur-[3px] transition-opacity duration-base',
          expanded ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        style={{ background: 'var(--scrim)' }}
      />
      <nav
        aria-label="Main"
        onKeyDown={(e) => {
          if (e.key === 'Escape' && expanded) onToggle()
        }}
        className={cn(
          'bg-sidebar border-line fixed inset-y-0 left-0 z-20 flex flex-col gap-1 border-r px-2.5 py-3',
          'ease-rail-slide transition-[width] duration-rail',
          expanded ? 'w-[212px]' : 'w-[60px]',
          className,
        )}
        style={expanded ? { boxShadow: 'var(--shadow-rail)' } : undefined}
      >
        {brand ? (
          <div className="mb-2 flex h-10 items-center gap-[11px] overflow-hidden px-2">
            <span className="text-accent flex w-6 shrink-0 justify-center">{brand}</span>
            <span
              className={cn(
                'text-text text-[15px] font-bold whitespace-nowrap',
                'transition-opacity duration-fast',
                expanded ? 'opacity-100' : 'opacity-0',
              )}
            >
              rigseed
            </span>
          </div>
        ) : null}
        {children}
      </nav>
    </>
  )
}
