import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SectionHeader } from '@/components/ui/section-header'
import { Switch } from '@/components/ui/switch'
import { icons, instanceKind } from '@/lib/icons'
import { cn } from '@/lib/utils'
import type { ConnectionDraft } from '@/state/connection-store'

/**
 * What a test of a connection came back with.
 *
 * The four stats the design asks for are version, Web API version, torrents
 * and session uptime. There is no uptime anywhere in qBittorrent's Web API,
 * so the fourth is the daemon's own network status, which `sync/maindata`
 * does carry and which is the thing worth knowing about a remote instance.
 */
export type TestResult =
  | {
      ok: true
      version: string
      webApiVersion: string
      torrents: number
      network: 'connected' | 'firewalled' | 'disconnected'
      at: number
    }
  | { ok: false; reason: string; endpoint: string; at: number }

export interface ConnectionDetailProps {
  /** The edited copy. Null while nothing is selected. */
  draft: ConnectionDraft | null
  /**
   * True for the built-in daemon, whose address rigseed owns.
   *
   * Its host and port are locked rather than hidden: seeing where it is
   * answers a real question, and being unable to type in the field answers
   * the next one.
   */
  locked: boolean
  /** True when this connection does not exist yet. */
  adding: boolean
  /** Whether this is the one the app is running on. */
  active: boolean
  /** Whether the draft differs from what is saved. */
  dirty: boolean
  test: TestResult | null
  testing: boolean
  /**
   * The password as typed, which is never part of the draft.
   *
   * Held by the caller so it survives a switch between rows and can be
   * written to the keychain on save, without this component knowing anything
   * about keychains.
   */
  password: string
  /** False when there is nowhere durable to put a password. */
  keychain: boolean
  onPasswordChange: (next: string) => void
  onChange: (patch: Partial<ConnectionDraft>) => void
  onTest: () => void
  onMakeActive: () => void
  onSave: () => void
  onRemove: () => void
}

const clockOf = (at: number): string =>
  new Date(at).toLocaleTimeString(undefined, { hour12: false })

const NETWORK_LABEL = {
  connected: 'Connected',
  firewalled: 'Firewalled',
  disconnected: 'Disconnected',
} as const

/** One of the four stats under Last contact. */
function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-[5px]">
      <SectionHeader>{label}</SectionHeader>
      <span
        className={cn(
          'truncate font-mono text-[13px] font-medium',
          accent ? 'text-accent' : 'text-text',
        )}
      >
        {value}
      </span>
    </div>
  )
}

/**
 * A test that did not work, in the words the far end used.
 *
 * The reason is the only thing separating a wrong password from a closed
 * port, and the endpoint beside it says which of the four steps in `connect`
 * gave up, which is the difference between "not qBittorrent" and "wrong
 * password".
 */
function ErrorCard({ test }: { test: Extract<TestResult, { ok: false }> }) {
  return (
    <div className="flex shrink-0 items-start gap-3 rounded-xl border border-danger bg-danger-soft px-[17px] py-[15px]">
      <span className="flex size-[30px] shrink-0 items-center justify-center rounded-lg bg-danger-soft text-danger">
        <icons.alert className="size-[15px]" strokeWidth={2.2} />
      </span>
      <div className="flex flex-1 flex-col gap-1">
        <span className="text-[12.5px] font-semibold text-text">Could not reach this instance</span>
        <span className="text-[11.5px] leading-[1.5] text-text-dim">{test.reason}</span>
      </div>
      <span className="shrink-0 font-mono text-[10.5px] text-danger">{test.endpoint}</span>
    </div>
  )
}

/**
 * One instance, in full.
 *
 * Edits are staged. Every field here is addressing for a connection that may
 * be the one the app is currently running on, and rewriting the address of a
 * live connection halfway through typing it would drop the session on the
 * third keystroke. Nothing is written until Save.
 */
export function ConnectionDetail({
  draft,
  locked,
  adding,
  active,
  dirty,
  test,
  testing,
  password,
  keychain,
  onPasswordChange,
  onChange,
  onTest,
  onMakeActive,
  onSave,
  onRemove,
}: ConnectionDetailProps) {
  if (!draft) return null

  const Icon = adding ? icons.add : icons[instanceKind(draft.host, locked)]
  const failed = test !== null && !test.ok

  const subtitle = adding
    ? 'Point this at a qBittorrent instance running its Web UI.'
    : locked
      ? 'Runs on this machine, managed by rigseed'
      : active
        ? 'Remote instance · in use'
        : 'Remote instance · saved'

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {/* Capped at the width the cards have in the prototype at its 1440px
          canvas, so this is identical there and does not stretch a host field
          across half a metre of screen on a wide window. */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 pt-[22px] pb-6 [&>*]:w-full [&>*]:max-w-[912px]">
        <div className="flex shrink-0 items-center gap-3.5">
          <span
            className={cn(
              'flex size-[44px] shrink-0 items-center justify-center rounded-[11px]',
              failed ? 'bg-danger-soft text-danger' : 'bg-accent-soft text-accent',
            )}
          >
            <Icon className="size-[21px]" strokeWidth={1.9} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
            <span className="truncate text-[20px] leading-none font-semibold tracking-[-0.015em] text-text">
              {adding ? 'New connection' : draft.label || 'Untitled'}
            </span>
            <span className="truncate text-[12px] text-text-dim">{subtitle}</span>
          </div>
          <Button
            variant="secondary"
            onClick={onTest}
            disabled={testing}
            icon={<icons.test className="size-[14px]" strokeWidth={2} />}
          >
            {testing ? 'Testing…' : test ? 'Test again' : 'Test connection'}
          </Button>
        </div>

        <Card title="Address" api="base url" padding="none">
          <div className="flex flex-col gap-3.5 px-[18px] py-4">
            <div className="grid grid-cols-[1.6fr_108px] gap-3">
              <label className="flex flex-col gap-1.5">
                <SectionHeader>Host</SectionHeader>
                <Input
                  mono
                  aria-label="Host"
                  placeholder="192.168.1.24"
                  disabled={locked}
                  value={draft.host}
                  onChange={(event) => onChange({ host: event.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <SectionHeader>Port</SectionHeader>
                <Input
                  mono
                  aria-label="Port"
                  placeholder="8080"
                  disabled={locked}
                  value={draft.port}
                  onChange={(event) => onChange({ port: Number(event.target.value) })}
                />
              </label>
            </div>

            <label className="flex flex-col gap-1.5">
              <SectionHeader>Display name</SectionHeader>
              <Input
                aria-label="Display name"
                placeholder="Home NAS"
                value={draft.label}
                onChange={(event) => onChange({ label: event.target.value })}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <SectionHeader>Path</SectionHeader>
              <Input
                mono
                aria-label="Path"
                placeholder="/qbt"
                disabled={locked}
                value={draft.path}
                onChange={(event) => onChange({ path: event.target.value })}
              />
            </label>

            <div className="flex items-center gap-3.5 rounded-[9px] bg-surface2 px-3.5 py-3">
              <div className="flex flex-1 flex-col gap-[3px]">
                <span className="text-[12.5px] font-semibold text-text">Use HTTPS</span>
                <span className="text-[11.5px] text-text-dim">
                  {draft.https
                    ? 'Requests go over TLS.'
                    : 'Plain HTTP - fine on a trusted local network.'}
                </span>
              </div>
              <Switch
                label="Use HTTPS"
                checked={draft.https}
                disabled={locked}
                onChange={(next) => onChange({ https: next })}
              />
            </div>

            {locked ? (
              <span className="text-[11.5px] leading-[1.5] text-pretty text-text-dim">
                The bundled instance runs on this machine and cannot be moved or removed. Its
                credentials are generated on first launch and stored in the system keychain.
              </span>
            ) : null}
          </div>
        </Card>

        {/* Hidden entirely for the bundled instance: rigseed generated that
            login and there is nothing in it for anybody to fill in. */}
        {locked ? null : (
          <Card title="Authentication" api="auth/login" padding="none">
            <div className="flex flex-col gap-3.5 px-[18px] py-4">
              <div className="flex items-center gap-3.5">
                <div className="flex flex-1 flex-col gap-[3px]">
                  <span className="text-[12.5px] font-semibold text-text">
                    This instance requires a login
                  </span>
                  <span className="text-[11.5px] text-text-dim">
                    Turn off only if the Web UI is set to bypass authentication.
                  </span>
                </div>
                <Switch
                  label="This instance requires a login"
                  checked={draft.requiresAuth}
                  onChange={(next) => onChange({ requiresAuth: next })}
                />
              </div>

              {draft.requiresAuth ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1.5">
                      <SectionHeader>Username</SectionHeader>
                      <Input
                        mono
                        aria-label="Username"
                        placeholder="admin"
                        value={draft.username}
                        onChange={(event) => onChange({ username: event.target.value })}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <SectionHeader>Password</SectionHeader>
                      <Input
                        mono
                        type="password"
                        aria-label="Password"
                        placeholder={adding ? '' : 'Unchanged'}
                        value={password}
                        onChange={(event) => onPasswordChange(event.target.value)}
                      />
                    </label>
                  </div>
                  <span className="font-mono text-[10.5px] text-text-dimmer">
                    {keychain
                      ? 'stored in the system keychain, never in config'
                      : 'kept for this session only - no keychain here'}
                  </span>
                </>
              ) : null}
            </div>
          </Card>
        )}

        {/* Hidden while adding: there is nothing to have contacted yet. */}
        {!adding && test?.ok ? (
          <Card title="Last contact" api="app/version · sync/maindata" padding="none">
            <div className="grid grid-cols-4 gap-[18px] px-[18px] py-3.5">
              <Stat label="qBittorrent" value={test.version} />
              <Stat label="Web API" value={test.webApiVersion} />
              <Stat label="Torrents" value={String(test.torrents)} accent />
              <Stat label="Network" value={NETWORK_LABEL[test.network]} />
            </div>
            <div className="border-t border-line px-[18px] py-2.5">
              <span className="font-mono text-[10.5px] text-text-dimmer">
                answered at {clockOf(test.at)}
              </span>
            </div>
          </Card>
        ) : null}

        {!adding && test && !test.ok ? <ErrorCard test={test} /> : null}

        {!adding && !test ? (
          <Card title="Last contact" api="app/version · sync/maindata" padding="section">
            <p className="text-[12px] leading-[1.6] text-text-dim">
              Not tried yet. Testing sends a login and asks the daemon what it is, and changes
              nothing on either side.
            </p>
          </Card>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-3 border-t border-line bg-sidebar px-6 py-[13px]">
        {/* No Remove for the bundled instance: rigseed owns it, and a button
            that could only ever be greyed out is worse than no button. */}
        {locked || adding ? null : (
          <Button
            variant="danger"
            onClick={onRemove}
            icon={<icons.remove className="size-[14px]" strokeWidth={2} />}
          >
            Remove
          </Button>
        )}
        <span className="font-mono text-[10.5px] text-text-dimmer">
          {locked
            ? 'the bundled instance cannot be removed'
            : adding
              ? 'nothing is saved until you add it'
              : 'removes the saved address only - nothing on that machine changes'}
        </span>
        <span className="flex-1" />
        {!adding && !active ? (
          <Button
            variant="secondary"
            onClick={onMakeActive}
            icon={<icons.check className="size-[14px]" strokeWidth={2.2} />}
          >
            Make active
          </Button>
        ) : null}
        <Button variant="primary" onClick={onSave} disabled={!adding && !dirty}>
          {adding ? 'Add connection' : 'Save changes'}
        </Button>
      </div>
    </div>
  )
}
