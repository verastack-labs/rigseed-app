import { useState } from 'react'
import { FileUp, Link2, Magnet, Plus, Wrench } from 'lucide-react'

import { cn } from '@/lib/utils'

const OPTIONS = [
  { key: 'create', label: 'Create torrent', Icon: Wrench },
  { key: 'url', label: 'From URL', Icon: Link2 },
  { key: 'magnet', label: 'Add magnet link', Icon: Magnet },
  { key: 'file', label: 'Add torrent file', Icon: FileUp },
] as const

export type AddSource = (typeof OPTIONS)[number]['key']

export interface AddFabProps {
  onSelect: (source: AddSource) => void
  className?: string
}

/**
 * The add-torrent FAB.
 *
 * Options rise closest-first with a 30ms stagger, so the one nearest the thumb
 * arrives first rather than the list appearing as a block.
 *
 * The hover fill mixes the accent *into* the surface rather than using a
 * translucent tint. A translucent hover let the page show through the option
 * circles and read as broken, which the spec calls out specifically.
 */
export function AddFab({ onSelect, className }: AddFabProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Same treatment the nav rail uses when it expands: a scrim over
          everything else, dismissed by clicking it or by Escape. The options
          are a menu, and a menu that leaves the page fully lit does not look
          like it is waiting for an answer. */}
      {open ? (
        <div
          role="presentation"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 backdrop-blur-[3px]"
          style={{ background: 'var(--scrim)' }}
        />
      ) : null}

      <div
        onKeyDown={(e) => {
          if (e.key === 'Escape' && open) setOpen(false)
        }}
        className={cn(
          'absolute right-[26px] bottom-[26px] z-40 flex flex-col items-end',
          className,
        )}
      >
        <div className="mb-3 flex flex-col items-end gap-2.5">
          {OPTIONS.map((option, i) => (
            <div
              key={option.key}
              className={cn(
                'flex items-center gap-2.5 transition-all duration-spring ease-spring',
                open
                  ? 'pointer-events-auto translate-y-0 opacity-100'
                  : 'pointer-events-none translate-y-3 opacity-0',
              )}
              style={{
                // Closest to the button first, so the stagger reads as rising.
                transitionDelay: open ? `${(OPTIONS.length - 1 - i) * 30}ms` : `${i * 20}ms`,
              }}
            >
              <span className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12px] font-semibold whitespace-nowrap text-text">
                {option.label}
              </span>
              <button
                type="button"
                title={option.label}
                aria-label={option.label}
                tabIndex={open ? 0 : -1}
                onClick={() => {
                  onSelect(option.key)
                  setOpen(false)
                }}
                className={cn(
                  'flex size-[42px] items-center justify-center border-line bg-surface text-text-dim',
                  'rounded-full border shadow-[var(--shadow-float)] backdrop-blur-[8px]',
                  'transition-[background-color,color,transform] duration-quick',
                  'hover:scale-[1.08] hover:bg-accent-hover hover:text-accent',
                )}
              >
                <option.Icon className="size-[17px]" strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          title="Add torrent"
          aria-label="Add torrent"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'flex size-[58px] items-center justify-center rounded-full bg-accent text-accent-on',
            'shadow-[var(--shadow-fab)] transition-[transform,box-shadow] duration-quick',
            'hover:scale-[1.09] hover:shadow-[var(--shadow-fab-hover)] active:scale-[0.96]',
            open && 'scale-[1.04]',
          )}
        >
          <Plus
            className={cn(
              'size-6 transition-transform duration-spring ease-spring',
              // Closed is a plus, open is a cross. These were the wrong way
              // round: a 45 degree rotation turns a plus into a cross, so the
              // closed button offered to close something that was not open, and
              // 135 degrees is 45 plus a quarter turn, which put it back to a
              // plus once the menu was showing.
              open ? 'rotate-45' : 'rotate-0',
            )}
            strokeWidth={2.4}
          />
        </button>
      </div>
    </>
  )
}
