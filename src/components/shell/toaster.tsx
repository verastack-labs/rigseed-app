import { useEffect } from 'react'

import { IconButton } from '@/components/ui/icon-button'
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

  return (
    <div
      className={cn(
        'pointer-events-auto flex w-[340px] items-start gap-2.5 rounded-xl border px-3.5 py-3',
        'shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-sm',
        'motion-safe:animate-[rigseed-arrive_200ms_ease]',
        warn ? 'border-warn bg-warn-soft' : 'border-accent2 bg-surface',
      )}
    >
      <span
        aria-hidden="true"
        className={cn('mt-px shrink-0', warn ? 'text-warn' : 'text-accent2')}
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
      <IconButton title="Dismiss" onClick={onDismiss}>
        <icons.clear className="size-[13px]" strokeWidth={2} />
      </IconButton>
    </div>
  )
}

/**
 * Where a failed action gets said out loud.
 *
 * Top right, under the top bar, rather than the conventional bottom right: the
 * add-torrent button lives down there and a toast over it would cover the
 * control somebody is most likely to reach for next.
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
        'pointer-events-none fixed top-4 right-4 z-50 flex flex-col items-end gap-2',
        className,
      )}
    >
      {notices.map((notice) => (
        <Toast key={notice.id} notice={notice} onDismiss={() => dismiss(notice.id)} />
      ))}
    </div>
  )
}
