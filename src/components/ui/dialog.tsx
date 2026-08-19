import { useCallback, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  /** Rendered under the title. Name the consequence, do not hint at it. */
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  width?: number
  /** Icon tile in the header, tinted by tone. */
  icon?: ReactNode
  tone?: 'accent' | 'danger'
  className?: string
}

/**
 * The frame both dialogs share: scrim, card, focus trap, Escape.
 *
 * A dialog does trap Tab, unlike the context menu. That is the difference
 * between something modal and something transient: the rest of the app is
 * inert while this is open, so focus must not be able to leave it.
 *
 * Focus moves to the first control on open and returns to whatever opened the
 * dialog on close.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 440,
  icon,
  tone = 'accent',
  className,
}: DialogProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const returnFocusTo = useRef<HTMLElement | null>(null)

  const focusables = useCallback(
    () => Array.from(cardRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []),
    [],
  )

  useEffect(() => {
    if (!open) return
    returnFocusTo.current = document.activeElement as HTMLElement | null
    focusables()[0]?.focus()
    return () => returnFocusTo.current?.focus?.()
  }, [open, focusables])

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }
    if (event.key !== 'Tab') return

    const items = focusables()
    if (items.length === 0) return
    const first = items[0]!
    const last = items[items.length - 1]!

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-10"
      style={{ background: 'var(--scrim-modal)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={onKeyDown}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'bg-surface border-line flex max-h-full flex-col overflow-hidden rounded-4xl border',
          'shadow-[var(--shadow-modal)]',
          className,
        )}
        style={{ width }}
      >
        <div className="flex items-start gap-[11px] px-[22px] pt-5 pb-4">
          {icon ? (
            <span
              className={cn(
                'mt-0.5 flex size-[34px] shrink-0 items-center justify-center rounded-[10px]',
                tone === 'danger' ? 'bg-danger-soft text-danger' : 'bg-accent-soft text-accent',
              )}
            >
              {icon}
            </span>
          ) : null}
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-text text-[15px] font-semibold">{title}</span>
            {description ? (
              <div className="text-text-dim text-[12.5px] leading-[1.55]">{description}</div>
            ) : null}
          </div>
        </div>

        {children ? <div className="min-h-0 overflow-auto px-[22px] pb-1">{children}</div> : null}

        {footer ? (
          <div className="bg-surface2 border-line flex items-center gap-2.5 border-t px-[22px] py-[13px]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
