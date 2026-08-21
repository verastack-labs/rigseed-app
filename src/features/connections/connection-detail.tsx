import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { StatusDot, type StatusTone } from '@/components/ui/status-dot'
import { Switch } from '@/components/ui/switch'
import { SettingRow } from '@/features/settings/setting-row'
import { icons } from '@/lib/icons'
import { baseUrlOf, type Connection, type ConnectionDraft } from '@/state/connection-store'
import type { BuiltInInstance, InstanceHealth } from '@/features/connections/instance-column'

/** What a test of a connection came back with. */
export type TestResult =
  | { ok: true; version: string; webApiVersion: string; at: number }
  | { ok: false; reason: string; at: number }

export interface ConnectionDetailProps {
  /** The connection to show, or null for rigseed's own daemon. */
  connection: Connection | null
  builtIn: BuiltInInstance
  /** Whether this is the one the app is running on. */
  active: boolean
  /** How the app's own connection is doing. Only meaningful when active. */
  health: InstanceHealth
  test: TestResult | null
  testing: boolean
  /**
   * The password as typed, which is never in the connection itself.
   *
   * Held by the caller rather than here so it survives a switch between rows
   * and can be written to the keychain on save without this component
   * knowing anything about keychains.
   */
  password: string
  /** False when there is nowhere durable to put a password. */
  keychain: boolean
  onPasswordChange: (next: string) => void
  onChange: (patch: Partial<ConnectionDraft>) => void
  onTest: () => void
  onMakeActive: () => void
  onRemove: () => void
}

const clockOf = (at: number): string =>
  new Date(at).toLocaleTimeString(undefined, { hour12: false })

/** `accent2` for connected, which is what the footer's own dot uses. */
const HEALTH_TONE: Record<InstanceHealth, StatusTone> = {
  connected: 'accent2',
  connecting: 'warn',
  failed: 'danger',
  mock: 'muted',
}

const HEALTH_WORDS: Record<InstanceHealth, string> = {
  connected: 'In use, connected',
  connecting: 'In use, connecting',
  failed: 'In use, not reachable',
  mock: 'In use, showing sample data',
}

/**
 * The header, which is the same for the built-in daemon and a saved one.
 *
 * The status line says whether this row is the one running the app before it
 * says anything about health, because that is the question somebody arriving
 * on this screen is asking.
 */
function Header({
  label,
  address,
  active,
  health,
}: {
  label: string
  address: string
  active: boolean
  health: InstanceHealth
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 className="truncate text-[17px] leading-tight font-semibold text-text">{label}</h2>
        <span className="truncate font-mono text-[11px] text-text-dimmer">{address}</span>
      </div>
      <StatusDot
        tone={active ? HEALTH_TONE[health] : 'muted'}
        label={active ? HEALTH_WORDS[health] : 'Saved, not in use'}
        pulse={active && health === 'connecting'}
      />
    </div>
  )
}

/** Whatever the last test said, in the words it said it in. */
function LastContact({ test }: { test: TestResult | null }) {
  if (!test) {
    return (
      <p className="text-[12px] leading-[1.6] text-text-dim">
        Not tried yet. Testing sends a login and asks the daemon what version it is, and changes
        nothing on either side.
      </p>
    )
  }

  if (!test.ok) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-[12px] font-semibold text-danger">Failed at {clockOf(test.at)}</span>
        <p className="text-[12px] leading-[1.6] text-text-dim">{test.reason}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold text-ok">Answered at {clockOf(test.at)}</span>
      <p className="font-mono text-[11px] text-text-dim">
        qBittorrent {test.version} · Web API {test.webApiVersion}
      </p>
    </div>
  )
}

/**
 * One instance, in full.
 *
 * The built-in daemon and a saved one share a header, a last-contact card and
 * a bottom bar, and differ in the middle: there is nothing to edit about a
 * daemon whose port rigseed picks at run time and whose password rigseed
 * generated, so it gets an explanation where the others get fields.
 */
export function ConnectionDetail({
  connection,
  builtIn,
  active,
  health,
  test,
  testing,
  password,
  keychain,
  onPasswordChange,
  onChange,
  onTest,
  onMakeActive,
  onRemove,
}: ConnectionDetailProps) {
  const label = connection?.label || builtIn.label
  const address = connection ? baseUrlOf(connection) : builtIn.address

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
        <Header label={label} address={address} active={active} health={health} />

        {connection ? (
          <>
            <Card title="Address" padding="none">
              <SettingRow label="Name" hint="What this instance is called in the list.">
                <Input
                  aria-label="Name"
                  value={connection.label}
                  onChange={(event) => onChange({ label: event.target.value })}
                  className="w-[220px]"
                />
              </SettingRow>
              <SettingRow label="Host" hint="A hostname or an IP address. A pasted URL works too.">
                <Input
                  aria-label="Host"
                  mono
                  value={connection.host}
                  onChange={(event) => onChange({ host: event.target.value })}
                  className="w-[220px]"
                />
              </SettingRow>
              <SettingRow label="Port" hint="qBittorrent's Web UI port, 8080 out of the box.">
                <Input
                  aria-label="Port"
                  mono
                  type="number"
                  value={connection.port}
                  onChange={(event) => onChange({ port: Number(event.target.value) })}
                  className="w-[110px]"
                />
              </SettingRow>
              <SettingRow
                label="Use HTTPS"
                hint="Only if the daemon or the proxy in front of it serves TLS."
              >
                <Switch
                  label="Use HTTPS"
                  checked={connection.https}
                  onChange={(next) => onChange({ https: next })}
                />
              </SettingRow>
              <SettingRow
                label="Path"
                hint="Leave empty unless a reverse proxy serves it under a prefix."
              >
                <Input
                  aria-label="Path"
                  mono
                  placeholder="/qbt"
                  value={connection.path}
                  onChange={(event) => onChange({ path: event.target.value })}
                  className="w-[220px]"
                />
              </SettingRow>
            </Card>

            <Card title="Authentication" api="auth/login" padding="none">
              <SettingRow
                label="Requires a login"
                hint="qBittorrent can be told to skip this for local or whitelisted addresses."
              >
                <Switch
                  label="Requires a login"
                  checked={connection.requiresAuth}
                  onChange={(next) => onChange({ requiresAuth: next })}
                />
              </SettingRow>
              {connection.requiresAuth ? (
                <>
                  <SettingRow label="Username" hint="Whatever the daemon's Web UI was set up with.">
                    <Input
                      aria-label="Username"
                      mono
                      value={connection.username}
                      onChange={(event) => onChange({ username: event.target.value })}
                      className="w-[220px]"
                    />
                  </SettingRow>
                  <SettingRow
                    label="Password"
                    hint={
                      keychain
                        ? "Kept in the system keychain, never in rigseed's own files."
                        : 'Kept for this session only. There is no keychain to write to here.'
                    }
                  >
                    <Input
                      aria-label="Password"
                      type="password"
                      value={password}
                      placeholder={keychain ? 'Unchanged' : ''}
                      onChange={(event) => onPasswordChange(event.target.value)}
                      className="w-[220px]"
                    />
                  </SettingRow>
                </>
              ) : null}
            </Card>
          </>
        ) : (
          <Card title="Managed by rigseed" padding="section">
            <p className="text-[12px] leading-[1.6] text-text-dim">
              rigseed starts this one itself and looks after it: it picks a free port at every
              launch and keeps a generated password in the system keychain, so there is nothing here
              to fill in and nothing worth writing down. Torrents it is running stay where they are
              whichever instance you switch to.
            </p>
          </Card>
        )}

        <Card title="Last contact" padding="section">
          <LastContact test={test} />
        </Card>
      </div>

      <div className="flex shrink-0 items-center gap-2.5 border-t border-line bg-sidebar px-6 py-3.5">
        <Button variant="secondary" size="sm" onClick={onTest} disabled={testing}>
          {testing ? 'Testing…' : 'Test connection'}
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onMakeActive}
          disabled={active}
          title={active ? 'Already in use' : undefined}
        >
          {active ? 'In use' : 'Make active'}
        </Button>
        <span className="flex-1" />
        {/* The built-in daemon has no Remove: rigseed owns it, and a button
            that could only ever be greyed out is worse than no button. */}
        {connection ? (
          <Button
            variant="danger"
            size="sm"
            onClick={onRemove}
            icon={<icons.remove className="size-[14px]" strokeWidth={2} />}
          >
            Remove
          </Button>
        ) : null}
      </div>
    </div>
  )
}
