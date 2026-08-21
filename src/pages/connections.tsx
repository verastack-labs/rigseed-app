import { useCallback, useState } from 'react'

import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FormDialog } from '@/components/ui/form-dialog'
import { Input } from '@/components/ui/input'
import { SectionHeader } from '@/components/ui/section-header'
import { ConnectionDetail, type TestResult } from '@/features/connections/connection-detail'
import { InstanceColumn, type InstanceHealth } from '@/features/connections/instance-column'
import { useConnection } from '@/services/api-context'
import { connect } from '@/services/connect'
import { persists, read, store } from '@/services/secrets'
import {
  baseUrlOf,
  emptyDraft,
  parseAddress,
  problemWith,
  useConnectionStore,
  type Connection,
  type ConnectionDraft,
} from '@/state/connection-store'

/** The app's own connection state, in the four words the column speaks. */
function healthOf(status: string): InstanceHealth {
  if (status === 'connected') return 'connected'
  if (status === 'failed') return 'failed'
  if (status === 'mock') return 'mock'
  return 'connecting'
}

/**
 * Connections.
 *
 * Edits are live: there is no Apply here, because every field is addressing
 * for a connection that is not currently carrying anything. The exception is
 * the one thing that is not in the store at all, and the password writes
 * straight to the keychain on each change rather than at some commit point.
 * A commit point would need a flush on unmount, and closing the window does
 * not unmount anything, so a password typed and then closed on would be lost.
 */
export function Connections() {
  const connection = useConnection()
  const connections = useConnectionStore((state) => state.connections)
  const activeId = useConnectionStore((state) => state.activeId)
  const add = useConnectionStore((state) => state.add)
  const update = useConnectionStore((state) => state.update)
  const remove = useConnectionStore((state) => state.remove)
  const setActive = useConnectionStore((state) => state.setActive)

  const [selectedId, setSelectedId] = useState<string | null>(activeId)
  const [password, setPassword] = useState('')
  const [tests, setTests] = useState<Record<string, TestResult>>({})
  const [testing, setTesting] = useState(false)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<ConnectionDraft>(emptyDraft)
  const [newPassword, setNewPassword] = useState('')
  const [removing, setRemoving] = useState<Connection | null>(null)

  const selected = connections.find((one) => one.id === selectedId) ?? null
  const keychain = persists()

  /**
   * Clears the typed password when the row changes.
   *
   * Adjusted during render rather than in an effect, which is the sanctioned
   * way to follow a changing input: an effect would paint one frame with the
   * previous row's password still in the field, and that field's next
   * keystroke writes to the keychain under the new row's id.
   */
  const [passwordOwner, setPasswordOwner] = useState(selectedId)
  if (passwordOwner !== selectedId) {
    setPasswordOwner(selectedId)
    setPassword('')
  }

  const onPasswordChange = useCallback(
    (next: string) => {
      setPassword(next)
      if (selectedId) void store(selectedId, next)
    },
    [selectedId],
  )

  /**
   * Tries a real login, and says what came back.
   *
   * The same `connect` the app itself uses, so a test that passes and a
   * connection that then fails cannot disagree: there is one code path, and
   * it is the one that knows a login can fail with HTTP 200.
   */
  const onTest = useCallback(async () => {
    const key = selectedId ?? 'built-in'
    setTesting(true)
    try {
      if (!selected) {
        // The built-in daemon is either the one already running the app or it
        // is not reachable from here: rigseed holds its credentials in Rust
        // and this screen has no way to ask for them a second time.
        const at = Date.now()
        setTests((prev) => ({
          ...prev,
          [key]:
            connection.status === 'connected'
              ? {
                  ok: true,
                  version: connection.version,
                  webApiVersion: connection.webApiVersion,
                  at,
                }
              : { ok: false, reason: 'rigseed has not got a working local daemon.', at },
        }))
        return
      }

      const secret = password || (await read(selected.id)) || ''
      const result = await connect({
        baseUrl: baseUrlOf(selected),
        username: selected.requiresAuth ? selected.username : '',
        password: selected.requiresAuth ? secret : '',
        label: selected.label,
      })
      const at = Date.now()
      setTests((prev) => ({
        ...prev,
        [key]:
          result.status === 'connected'
            ? { ok: true, version: result.version, webApiVersion: result.webApiVersion, at }
            : {
                ok: false,
                reason: result.status === 'failed' ? result.reason : 'Nothing answered.',
                at,
              },
      }))
    } finally {
      setTesting(false)
    }
  }, [connection, password, selected, selectedId])

  const onAdd = useCallback(() => {
    const id = add(draft)
    if (newPassword) void store(id, newPassword)
    setSelectedId(id)
    setAdding(false)
    setDraft(emptyDraft())
    setNewPassword('')
  }, [add, draft, newPassword])

  const onRemove = useCallback(() => {
    if (!removing) return
    remove(removing.id)
    if (selectedId === removing.id) setSelectedId(null)
    setRemoving(null)
  }, [remove, removing, selectedId])

  const builtInAddress =
    activeId === null && connection.status === 'connected'
      ? connection.label
      : 'port picked at launch'

  const problem = problemWith(draft, connections)

  return (
    <div className="flex h-full min-h-0">
      <InstanceColumn
        builtIn={{ label: 'Built into rigseed', address: builtInAddress }}
        connections={connections}
        selectedId={selectedId}
        activeId={activeId}
        health={healthOf(connection.status)}
        onSelect={setSelectedId}
        onAdd={() => setAdding(true)}
      />

      <ConnectionDetail
        connection={selected}
        builtIn={{ label: 'Built into rigseed', address: builtInAddress }}
        active={activeId === selectedId}
        health={healthOf(connection.status)}
        test={tests[selectedId ?? 'built-in'] ?? null}
        testing={testing}
        password={password}
        keychain={keychain}
        onPasswordChange={onPasswordChange}
        onChange={(patch) => {
          if (selectedId) update(selectedId, patch)
        }}
        onTest={() => void onTest()}
        onMakeActive={() => setActive(selectedId)}
        onRemove={() => {
          if (selected) setRemoving(selected)
        }}
      />

      <FormDialog
        open={adding}
        title="Add a connection"
        description="A qBittorrent running somewhere else, with its Web UI switched on."
        api="auth/login"
        submitLabel="Add"
        submitDisabled={problem !== null}
        onCancel={() => {
          setAdding(false)
          setDraft(emptyDraft())
          setNewPassword('')
        }}
        onSubmit={onAdd}
      >
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <SectionHeader>Name</SectionHeader>
            <Input
              aria-label="Name"
              placeholder="Home server"
              value={draft.label}
              onChange={(event) => setDraft({ ...draft, label: event.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <SectionHeader>Address</SectionHeader>
            <Input
              mono
              aria-label="Address"
              placeholder="192.168.1.5:8080"
              value={draft.host}
              onChange={(event) => {
                // Reads a pasted URL and fills the rest in. Somebody copying
                // out of their browser bar is the likeliest way this field is
                // ever filled, and taking that literally as a hostname makes
                // the first attempt fail for no visible reason.
                const parsed = parseAddress(event.target.value)
                setDraft(parsed ? { ...draft, ...parsed } : { ...draft, host: event.target.value })
              }}
            />
            <span className="font-mono text-[10.5px] text-text-dimmer">
              {draft.host ? baseUrlOf(draft) : 'A host and port, or a URL to paste.'}
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <SectionHeader>Username</SectionHeader>
            <Input
              mono
              aria-label="Username"
              value={draft.username}
              onChange={(event) => setDraft({ ...draft, username: event.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <SectionHeader>Password</SectionHeader>
            <Input
              type="password"
              aria-label="Password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
            <span className="text-[10.5px] text-text-dimmer">
              {keychain
                ? 'Goes to the system keychain, not to a rigseed file.'
                : 'Kept for this session only. There is no keychain to write to here.'}
            </span>
          </label>

          {problem && draft.host ? <span className="text-[11px] text-warn">{problem}</span> : null}
        </div>
      </FormDialog>

      <ConfirmDialog
        open={removing !== null}
        title="Remove this connection?"
        {...(removing ? { target: removing.label } : {})}
        tone="danger"
        confirmLabel="Remove"
        body="rigseed forgets the address and the password. Nothing on the far end changes: the daemon keeps running and keeps every torrent it has."
        onCancel={() => setRemoving(null)}
        onConfirm={onRemove}
      />
    </div>
  )
}
