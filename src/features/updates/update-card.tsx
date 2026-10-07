import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ProgressBar } from '@/components/ui/progress-bar'
import { SettingRow } from '@/features/settings/setting-row'
import { describeFailure, restartWarning } from '@/features/updates/update-status'
import { useUpdateStore } from '@/state/update-store'
import { icons } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { formatBytes } from '@/utils/format'

export interface UpdateCardProps {
  /** What this copy is, for the comparison the version line draws. */
  currentVersion: string
  /**
   * How many transfers are running, for the restart warning.
   *
   * Passed in rather than read from the store here, so this card can be
   * rendered on its own and so the warning is testable without a daemon.
   */
  activeTransfers: number
}

/**
 * Updates, as a row in Settings rather than as a dialog over the window.
 *
 * The pattern most apps ship for this is a modal: a new version appears, the
 * window is covered, and a progress bar runs while you wait. That is the wrong
 * shape here, and not for reasons of taste. Applying an update restarts the
 * daemon, so the modal is asking somebody to interrupt their own transfers
 * without saying that is what it is asking. And a torrent client's window is
 * usually showing something live, which is exactly what the design foundations
 * say attention is reserved for.
 *
 * So it sits in Settings, which is where somebody goes when they have decided
 * to deal with the application rather than with their downloads. Nothing here
 * is automatic: the check is a button, installing is a button, and restarting
 * is a third button that stays unpressed until it suits the person reading it.
 */
export function UpdateCard({ currentVersion, activeTransfers }: UpdateCardProps) {
  // One store, because the rail marker shows the same thing. Two copies of
  // this state would let the card and the dot disagree about what happened.
  const state = useUpdateStore((s) => s.state)
  const checkNow = useUpdateStore((s) => s.checkNow)
  const install = useUpdateStore((s) => s.install)
  const restart = useUpdateStore((s) => s.restart)
  const dismiss = useUpdateStore((s) => s.dismiss)
  const busy = state.kind === 'checking' || state.kind === 'downloading'

  return (
    <Card title="Updates" api="updater" padding="none">
      <SettingRow
        label="This copy"
        hint="rigseed looks once when it starts, and never downloads or installs anything without being asked."
      >
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[11.5px] text-text-dim tabular-nums">
            {currentVersion}
          </span>
          <Button size="sm" onClick={() => void checkNow()} disabled={busy}>
            {state.kind === 'checking' ? 'Checking…' : 'Check for updates'}
          </Button>
        </div>
      </SettingRow>

      {state.kind === 'current' ? (
        <Outcome tone="ok" icon="check">
          This is the newest version.
        </Outcome>
      ) : null}

      {state.kind === 'failed' ? (
        <Outcome tone={state.failure === 'signature' ? 'danger' : 'warn'} icon="alert">
          {describeFailure(state.failure, state.detail)}
        </Outcome>
      ) : null}

      {state.kind === 'available' ? (
        <div className="flex flex-col gap-3 border-t border-line px-4 py-3.5">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-[13px] font-semibold text-text">Version {state.version}</span>
            <span className="font-mono text-[10.5px] text-text-dimmer tabular-nums">
              you have {currentVersion}
            </span>
          </div>

          {/* The changelog, as published. Scrolls rather than truncates: a
              release note cut off mid-sentence is worse than one that asks
              for a scroll. */}
          {state.notes ? (
            <div className="max-h-44 overflow-y-auto rounded-md border border-line bg-surface2 px-3 py-2.5">
              <p className="text-[12.5px] whitespace-pre-wrap text-text-dim">{state.notes}</p>
            </div>
          ) : null}

          <Warning text={restartWarning(activeTransfers)} />

          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={() => void install()}>
              Download and install
            </Button>
            <Button size="sm" onClick={dismiss}>
              Not now
            </Button>
          </div>
        </div>
      ) : null}

      {state.kind === 'downloading' ? (
        <div className="flex flex-col gap-2 border-t border-line px-4 py-3.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[12.5px] text-text-dim">Downloading {state.version}</span>
            <span className="font-mono text-[10.5px] text-text-dimmer tabular-nums">
              {state.progress.known
                ? `${state.progress.percent}%`
                : /* No content length, so the bytes are all there is to show.
                     A percentage invented from a total nobody sent would be a
                     guess rendered as a fact. */
                  formatBytes(state.received)}
            </span>
          </div>
          {/*
            No bar at all when the server sent no content length, rather than a
            bar sitting at zero. ProgressBar has no indeterminate mode and
            should not grow one for this: a bar is a claim about how far along
            something is, and here there is nothing to base that claim on. The
            byte count above keeps moving, which is the honest signal.
          */}
          {state.progress.known ? (
            <ProgressBar
              height={4}
              value={state.progress.percent ?? 0}
              label={`Downloading version ${state.version}`}
            />
          ) : null}
        </div>
      ) : null}

      {state.kind === 'ready' ? (
        <div className="flex flex-col gap-3 border-t border-line px-4 py-3.5">
          <p className="text-[12.5px] text-text">
            Version {state.version} is installed. It starts running when rigseed restarts.
          </p>
          <Warning text={restartWarning(activeTransfers)} />
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={() => void restart()}>
              Restart now
            </Button>
            {/* Not a dismissal of the update, which is already applied. It
                only puts the restart off, which is the point of separating
                the two. */}
            <Button size="sm" onClick={dismiss}>
              Later
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  )
}

/** One line of outcome, coloured by how much it matters. */
function Outcome({
  tone,
  icon,
  children,
}: {
  tone: 'ok' | 'warn' | 'danger'
  icon: 'check' | 'alert'
  children: React.ReactNode
}) {
  const Icon = icon === 'check' ? icons.check : icons.alert
  return (
    <div className="flex items-start gap-2 border-t border-line px-4 py-3">
      <Icon
        className={cn(
          'mt-[1px] size-[13px] shrink-0',
          tone === 'ok' && 'text-ok',
          tone === 'warn' && 'text-warn',
          tone === 'danger' && 'text-danger',
        )}
        strokeWidth={2}
      />
      <p className="text-[12.5px] text-text-dim">{children}</p>
    </div>
  )
}

/** The restart caution, drawn only when there is something to lose. */
function Warning({ text }: { text: string | null }) {
  if (!text) return null
  return (
    <p className="flex items-start gap-2 text-[12px] text-warn">
      <icons.alert className="mt-[1px] size-[12px] shrink-0" strokeWidth={2} />
      <span>{text}</span>
    </p>
  )
}
