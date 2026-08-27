import { useEffect } from 'react'

import { icons } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { useNoticeStore, type Notice } from '@/state/notice-store'

/**
 * How long each kind stays.
 *
 * A failure outlasts a confirmation because it is the one somebody has to read
 * and may want to act on. Neither is long enough to be in the way, and both
 * can be dismissed.
 */
const LINGER: Record<Notice['tone'], number> = {
  warn: 9_000,
  ok: 4_000,
}

function Toast({ notice, onDismiss }: { notice: Notice; onDismiss: () => void }) {
  const { id, tone } = notice

  /**
   * Counts down once, from when this notice arrived.
   *
   * Deliberately not depending on `onDismiss`, and this is the whole reason
   * the store is reached into here rather than the prop being called. A
   * handler built in the parent's render is a new function every time the
   * parent renders, and the parent renders whenever any other notice arrives
   * or leaves. Depending on it restarted this timer each time, so a toast
   * raised during a run of failures outlived all of them, and in a busy moment
   * could sit there indefinitely.
   */
  useEffect(() => {
    const timer = setTimeout(() => useNoticeStore.getState().dismiss(id), LINGER[tone])
    return () => clearTimeout(timer)
  }, [id, tone])

  const warn = notice.tone === 'warn'
  const Icon = warn ? icons.alert : icons.check

  /**
   * Where the icon and the dismiss sit against the text.
   *
   * Centred on a one-line toast, which is every confirmation, and aligned to
   * the top on a two-line one. A single rule cannot do both: `items-start`
   * left a one-line toast looking dropped, its glyph and cross riding above a
   * centred label, and `items-center` on a toast with a detail line would
   * float the icon against the middle of a paragraph instead of marking its
   * first line.
   */
  const tall = notice.detail !== undefined && notice.detail !== ''

  return (
    <div
      className={cn(
        'pointer-events-auto flex w-[340px] gap-2.5 rounded-xl border px-3.5 py-3',
        tall ? 'items-start' : 'items-center',
        'shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-sm',
        'motion-safe:animate-[rigseed-arrive_200ms_ease]',
        warn ? 'border-warn bg-warn-soft' : 'border-accent2 bg-surface',
      )}
    >
      <span
        aria-hidden="true"
        // The nudge only makes sense while top-aligned, where it drops the
        // glyph onto the text baseline. Centred it would undo the centring.
        className={cn('shrink-0', tall && 'mt-px', warn ? 'text-warn' : 'text-accent2')}
      >
        <Icon className="size-[15px]" strokeWidth={2} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[12px] leading-[1.4] font-semibold text-text">
          {notice.what}
          {warn ? ' did not go through' : ''}
        </span>
        {notice.detail ? (
          <span className="font-mono text-[10.5px] leading-[1.5] break-words text-text-dim">
            {notice.detail}
          </span>
        ) : null}
      </span>
      {/*
        A mark, not a control with furniture.

        `IconButton` was doing this job and brought its own 32px box with a
        surface fill and a border, so a toast carrying five words ended up with
        a button in it heavier than the message. The affordance a toast needs
        here is smaller than that: it dismisses itself in seconds, and the
        cross is for somebody who wants it gone sooner.

        Still a real button. Losing the chrome should cost nothing to a
        keyboard or a screen reader, so the name, the focus ring and the hit
        target all stay. The padding is what keeps that target close to 25px
        while the glyph itself is 13px, and the negative margin takes the
        padding back off the toast's own edge so the mark still lines up.
      */}
      <button
        type="button"
        title="Dismiss"
        aria-label="Dismiss"
        onClick={onDismiss}
        className={cn(
          '-mr-1.5 shrink-0 rounded-md border-none bg-transparent p-1.5',
          'text-text-dimmer transition-colors duration-fast hover:text-text',
        )}
      >
        <icons.clear className="size-[13px]" strokeWidth={2} />
      </button>
    </div>
  )
}

/**
 * Where a failed action gets said out loud.
 *
 * Bottom right, in the gap between the add-torrent button and the footer.
 *
 * It was top right first, on the reasoning that the add-torrent button owns the
 * bottom right corner. That traded one collision for a worse one: a screenshot
 * of the running window showed the second toast sitting squarely on the view
 * switcher and the speed limits toggle, measured at 24px from the right edge
 * and 66px from the top. Covering the controls somebody might reach for after
 * a failed action is worse than covering empty space, and the toolbar is
 * pinned where a scrolling list is not.
 *
 * So it goes back to the corner, offset to clear both obstacles rather than
 * either. The button and everything it unfolds occupy a 58px column 26px in
 * from the right, so 100px of inset clears the whole column including the
 * options that rise out of it. The footer is 34px tall, so 46px of bottom
 * leaves a 12px gap over it.
 *
 * `aria-live="polite"` rather than `assertive`. These are reports on something
 * the user just did, so they are already expecting an outcome, and interrupting
 * a screen reader mid-sentence for every one of them is worse than waiting for
 * a pause.
 *
 * The region is always mounted and always empty of hit targets when there is
 * nothing in it. `pointer-events-none` on the column with it re-enabled per
 * toast, so an empty stack cannot swallow a click on what is underneath.
 */
export function Toaster({ className }: { className?: string }) {
  const notices = useNoticeStore((s) => s.notices)
  const dismiss = useNoticeStore((s) => s.dismiss)

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'pointer-events-none fixed right-[100px] bottom-[46px] z-50 flex flex-col items-end gap-2',
        className,
      )}
    >
      {notices.map((notice) => (
        <Toast key={notice.id} notice={notice} onDismiss={() => dismiss(notice.id)} />
      ))}
    </div>
  )
}
