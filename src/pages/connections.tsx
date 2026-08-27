import { useCallback, useEffect, useState } from 'react'

import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ConnectionDetail, type TestResult } from '@/features/connections/connection-detail'
import {
  InstanceColumn,
  type Instance,
  type InstanceStatus,
} from '@/features/connections/instance-column'
import { useConnection } from '@/services/api-context'
import { connect } from '@/services/connect'
import { notify } from '@/state/notice-store'
import { persists, read, store } from '@/services/secrets'
import {
  addressOf,
  baseUrlOf,
  emptyDraft,
  parseAddress,
  problemWith,
  useConnectionStore,
  type Connection,
  type ConnectionDraft,
} from '@/state/connection-store'

/** Key for the built-in daemon in maps that are otherwise keyed by id. */
const BUILT_IN = 'built-in'

/** `2m ago`, `3d ago`. Coarse on purpose: this is a meta line, not a clock. */
function ago(at: number, now: number): string {
  const seconds = Math.max(0, Math.round((now - at) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

/** The draft a connection starts editing from. */
const draftOf = (connection: Connection): ConnectionDraft => ({
  label: connection.label,
  host: connection.host,
  port: connection.port,
  https: connection.https,
  path: connection.path,
  username: connection.username,
  requiresAuth: connection.requiresAuth,
})

const same = (a: ConnectionDraft, b: ConnectionDraft): boolean =>
  a.label === b.label &&
  a.host === b.host &&
  a.port === b.port &&
  a.https === b.https &&
  a.path === b.path &&
  a.username === b.username &&
  a.requiresAuth === b.requiresAuth

/**
 * Connections.
 *
 * Edits are staged and written on Save. The connection being edited may be
 * the one the app is running on, and rewriting a live connection's address
 * halfway through typing it would drop the session on the third keystroke.
 *
 * A password is the exception: it is not part of the draft, because it is not
 * part of the stored connection either. It goes to the keychain when the rest
 * is saved, keyed by the same id.
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
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<ConnectionDraft | null>(null)
  const [password, setPassword] = useState('')
  const [tests, setTests] = useState<Record<string, TestResult>>({})
  const [testing, setTesting] = useState(false)
  const [removing, setRemoving] = useState<Connection | null>(null)

  const selected = connections.find((one) => one.id === selectedId) ?? null
  const keychain = persists()
  const key = adding ? 'new' : (selectedId ?? BUILT_IN)

  /**
   * Starts a fresh draft when the row changes.
   *
   * Adjusted during render rather than in an effect: an effect would paint a
   * frame showing the previous connection's values under the new one's title,
   * and the password field's next keystroke would be filed under the wrong id.
   */
  const [owner, setOwner] = useState<string | null>(null)
  if (owner !== key) {
    setOwner(key)
    setPassword('')
    setDraft(adding ? emptyDraft() : selected ? draftOf(selected) : null)
  }

  /**
   * The built-in daemon, as fields.
   *
   * Derived every render rather than kept in state. Its port is not known
   * until the connection resolves, and a snapshot taken when the screen
   * opened showed port 0 for the rest of the session.
   */
  const builtInDraft: ConnectionDraft = {
    ...emptyDraft(),
    label: 'Built into rigseed',
    host: connection.status === 'connected' ? (connection.label.split(':')[0] ?? '') : '127.0.0.1',
    port: connection.status === 'connected' ? Number(connection.label.split(':')[1] ?? 0) : 0,
    username: '',
    requiresAuth: false,
  }

  const locked = !adding && selected === null
  const shown = locked ? builtInDraft : draft

  const saved = adding ? null : selected ? draftOf(selected) : null
  const dirty = draft !== null && saved !== null && !same(draft, saved)

  const onSelect = useCallback((id: string | null) => {
    setAdding(false)
    setSelectedId(id)
  }, [])

  /**
   * Tries a real login, and says what came back.
   *
   * The same `connect` the app itself uses, so a test that passes and a
   * connection that then fails cannot disagree: there is one code path, and
   * it is the one that knows qBittorrent answers a failed login with 200.
   *
   * Tests the draft rather than what is saved. Testing the saved copy would
   * make the button useless for the thing it is for, which is finding out
   * whether the address just typed is right.
   */
  const onTest = useCallback(async () => {
    if (!shown) return
    setTesting(true)
    try {
      const secret = password || (selectedId ? ((await read(selectedId)) ?? '') : '')
      const result = await connect({
        baseUrl: baseUrlOf(shown),
        username: shown.requiresAuth ? shown.username : '',
        password: shown.requiresAuth ? secret : '',
        label: shown.label,
      })
      const at = Date.now()

      if (result.status !== 'connected') {
        setTests((prev) => ({
          ...prev,
          [key]: {
            ok: false,
            reason: result.status === 'failed' ? result.reason : 'Nothing answered.',
            // Which of the four steps in `connect` gave up. It is the
            // difference between "not qBittorrent" and "wrong password".
            endpoint:
              result.status === 'failed' && result.reason.includes('rejected')
                ? 'auth/login → 403'
                : 'app/version',
            at,
          },
        }))
        // Said out loud as well as written into the panel. The result card is
        // below the fold on a short window and does not move when it changes,
        // so a second failed attempt could look like nothing had happened.
        notify({
          tone: 'warn',
          what: 'Test connection',
          detail: result.status === 'failed' ? result.reason : 'Nothing answered.',
        })
        return
      }

      // One extra call, for the two stats the header cards want. `full_update`
      // on a fresh session carries both the torrent list and the server state.
      let torrents = 0
      let network: 'connected' | 'firewalled' | 'disconnected' = 'disconnected'
      try {
        const data = await result.client.sync.maindata(0)
        torrents = Object.keys(data.torrents ?? {}).length
        network = data.server_state?.connection_status ?? 'disconnected'
      } catch {
        // Logged in but the sync call failed. The version numbers are still
        // worth reporting, so this is a gap in the stats rather than a failed
        // test.
      }

      setTests((prev) => ({
        ...prev,
        [key]: {
          ok: true,
          version: result.version,
          webApiVersion: result.webApiVersion,
          torrents,
          network,
          at,
        },
      }))
      // Names the daemon it reached, which is the part that says the address
      // was right rather than merely that something answered.
      notify({ tone: 'ok', what: 'Connection works', detail: `qBittorrent ${result.version}` })
    } finally {
      setTesting(false)
    }
  }, [key, password, selectedId, shown])

  const onSave = useCallback(() => {
    if (!draft) return
    if (adding) {
      const id = add(draft)
      if (password) void store(id, password)
      setAdding(false)
      setSelectedId(id)
      return
    }
    if (!selectedId) return
    update(selectedId, draft)
    if (password) void store(selectedId, password)
    setPassword('')
    // Re-read rather than assume the draft is now what is saved. The store
    // trims and normalises what it is given, so a label typed with a trailing
    // space would otherwise leave the pane permanently dirty against a copy
    // it can never match.
    const written = useConnectionStore.getState().connections.find((one) => one.id === selectedId)
    if (written) setDraft(draftOf(written))
  }, [add, adding, draft, password, selectedId, update])

  const onRemove = useCallback(() => {
    if (!removing) return
    remove(removing.id)
    if (selectedId === removing.id) setSelectedId(null)
    setRemoving(null)
  }, [remove, removing, selectedId])

  /**
   * A clock for the `2m ago` meta lines.
   *
   * In state and on a timer rather than read during render, which is impure
   * and would also freeze each label at whatever it said when the screen last
   * happened to re-render for some other reason.
   */
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])

  /** How a row's dot should read. */
  function statusOf(id: string | null): InstanceStatus {
    if (id === activeId) {
      if (connection.status === 'connected') return 'online'
      if (connection.status === 'connecting') return 'connecting'
      if (connection.status === 'failed') return 'refused'
      return 'offline'
    }
    const test = tests[id ?? BUILT_IN]
    if (!test) return 'unknown'
    return test.ok ? 'online' : 'refused'
  }

  function metaOf(id: string | null): string {
    if (id === activeId && connection.status === 'connected') return 'active now'
    const test = tests[id ?? BUILT_IN]
    return test ? ago(test.at, now) : 'not tested'
  }

  const instances: Instance[] = [
    {
      id: null,
      label: 'Built into rigseed',
      host:
        activeId === null && connection.status === 'connected'
          ? connection.label
          : 'port picked at launch',
      status: statusOf(null),
      meta: metaOf(null),
      bundled: true,
    },
    ...connections.map((one) => ({
      id: one.id,
      label: one.label,
      host: addressOf(one),
      status: statusOf(one.id),
      meta: metaOf(one.id),
      bundled: false,
    })),
  ]

  const problem = draft && adding ? problemWith(draft, connections) : null

  return (
    <div className="flex h-full min-h-0">
      <InstanceColumn
        instances={instances}
        selectedId={selectedId}
        activeId={activeId}
        adding={adding}
        onSelect={onSelect}
        onAdd={() => {
          setAdding(true)
          setSelectedId(null)
        }}
      />

      <ConnectionDetail
        draft={shown}
        locked={locked}
        adding={adding}
        active={!adding && activeId === selectedId}
        dirty={dirty}
        test={tests[key] ?? null}
        testing={testing}
        password={password}
        keychain={keychain}
        onPasswordChange={setPassword}
        onChange={(patch) => {
          setDraft((prev) => {
            if (!prev) return prev
            // A pasted URL fills in the rest. Somebody copying out of their
            // browser bar is the likeliest way the host field is ever filled,
            // and taking that literally as a hostname makes the first attempt
            // fail for no visible reason.
            if (typeof patch.host === 'string' && /[:/]/.test(patch.host)) {
              const parsed = parseAddress(patch.host)
              if (parsed) return { ...prev, ...parsed }
            }
            return { ...prev, ...patch }
          })
        }}
        onTest={() => void onTest()}
        onMakeActive={() => setActive(selectedId)}
        onSave={() => {
          if (problem) return
          onSave()
        }}
        onRemove={() => {
          if (selected) setRemoving(selected)
        }}
      />

      <ConfirmDialog
        open={removing !== null}
        title={`Remove ${removing?.label ?? 'this connection'}?`}
        {...(removing ? { target: baseUrlOf(removing) } : {})}
        tone="danger"
        confirmLabel="Remove connection"
        body="Nothing on that machine changes - this only forgets the address and its saved login. The keychain entry goes with it."
        onCancel={() => setRemoving(null)}
        onConfirm={onRemove}
      />
    </div>
  )
}
