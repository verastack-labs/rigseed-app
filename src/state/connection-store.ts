import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { forget } from '@/services/secrets'

/**
 * A daemon the user told rigseed about.
 *
 * Everything here is addressing and preference: none of it is secret, which
 * is what makes it safe to persist. The password is not a field, and adding
 * one would put it in a plaintext JSON file. It lives in the OS keychain
 * instead, keyed by this `id`, which is the only link between the two halves.
 *
 * That is also why the id, rather than the address, is the identity. Move a
 * daemon to a new port and its login should follow it; run two against the
 * same host and they should keep separate ones.
 */
export interface Connection {
  id: string
  /** What to call it on screen. Free text, and the only thing the user sees. */
  label: string
  host: string
  port: number
  https: boolean
  /**
   * A prefix, for a daemon behind a reverse proxy that is not at the root.
   *
   * Empty for the ordinary case. Stored without a trailing slash so joining
   * it to `/api/v2/...` cannot produce a double one, which qBittorrent's
   * router answers with a 404 rather than a redirect.
   */
  path: string
  username: string
  /**
   * Whether to send a login at all.
   *
   * qBittorrent can be told to skip authentication for localhost or for a
   * whitelisted subnet, and a daemon configured that way has no password to
   * get right. Sending one anyway is not harmful, but asking the user for a
   * credential that is not used is, so this is a real distinction rather than
   * an empty username.
   */
  requiresAuth: boolean
}

/** A connection before it has an id: what a form produces. */
export type ConnectionDraft = Omit<Connection, 'id'>

interface ConnectionState {
  connections: Connection[]
  /**
   * Which one to use, or null for the built-in daemon.
   *
   * Null rather than an id because the built-in daemon is not in this list
   * and must not be. rigseed starts it, picks its port at run time and keeps
   * its generated password in the keychain, so any copy written here would be
   * stale by the next launch and wrong in a way the user could not correct.
   */
  activeId: string | null
  add: (draft: ConnectionDraft) => string
  update: (id: string, patch: Partial<ConnectionDraft>) => void
  remove: (id: string) => void
  setActive: (id: string | null) => void
  reset: () => void
}

/** Trims and strips slashes, so `/qbt/` and `qbt` store identically. */
const cleanPath = (path: string): string => {
  const trimmed = path.trim().replace(/^\/+|\/+$/g, '')
  return trimmed ? `/${trimmed}` : ''
}

/**
 * Normalises a draft, and names every field it keeps.
 *
 * Written out rather than spread so the persisted shape is a closed set. A
 * spread would carry anything a caller happened to attach straight into the
 * JSON file, and the one field that must never reach it is a password.
 */
const clean = (draft: ConnectionDraft): ConnectionDraft => ({
  label: draft.label.trim(),
  host: draft.host.trim(),
  port: draft.port,
  https: draft.https,
  path: cleanPath(draft.path),
  username: draft.username.trim(),
  requiresAuth: draft.requiresAuth,
})

export const useConnectionStore = create<ConnectionState>()(
  persist(
    (set) => ({
      connections: [],
      activeId: null,

      add: (draft) => {
        const id = crypto.randomUUID()
        set((prev) => ({ connections: [...prev.connections, { ...clean(draft), id }] }))
        return id
      },

      update: (id, patch) =>
        set((prev) => ({
          connections: prev.connections.map((one) =>
            one.id === id ? { ...clean({ ...one, ...patch }), id } : one,
          ),
        })),

      /**
       * Removes a connection and the password that belonged to it.
       *
       * Both, deliberately. A keychain entry whose connection is gone is
       * unreachable from every screen in the app, so leaving it behind means
       * the user's keychain accumulates rigseed passwords they have no way to
       * find, let alone clear.
       *
       * The active one falling back to null rather than to another saved
       * connection is the same reasoning: the built-in daemon is the one
       * choice that is always valid, and quietly connecting to some other
       * remote instance because it happened to be next in the list is a worse
       * surprise than dropping to the local one.
       */
      remove: (id) =>
        set((prev) => {
          void forget(id)
          return {
            connections: prev.connections.filter((one) => one.id !== id),
            activeId: prev.activeId === id ? null : prev.activeId,
          }
        }),

      setActive: (id) => set({ activeId: id }),

      reset: () => set({ connections: [], activeId: null }),
    }),
    { name: 'rigseed.connections' },
  ),
)

/** Where to send requests. `https://host:port` with the prefix, if any. */
export function baseUrlOf(
  connection: Pick<Connection, 'host' | 'port' | 'https' | 'path'>,
): string {
  const scheme = connection.https ? 'https' : 'http'
  return `${scheme}://${connection.host}:${connection.port}${connection.path}`
}

/** Host and port for a one-line summary, without the scheme noise. */
export function addressOf(connection: Pick<Connection, 'host' | 'port' | 'path'>): string {
  return `${connection.host}:${connection.port}${connection.path}`
}

export interface ParsedAddress {
  host: string
  port: number
  https: boolean
  path: string
}

/**
 * Reads an address a user typed or pasted.
 *
 * People paste `http://192.168.1.5:8080` out of a browser bar far more often
 * than they type a bare host, and a form that rejects that, or worse takes it
 * literally as a hostname, is a form that fails at the first thing anybody
 * tries. So the scheme, port and prefix are pulled out of whatever arrives.
 *
 * Null when there is nothing usable, which the caller shows as a hint rather
 * than as an error: the field is being typed into.
 */
export function parseAddress(input: string): ParsedAddress | null {
  const text = input.trim()
  if (!text) return null

  // Given a scheme, `URL` does the work. Without one it reads the host as a
  // protocol, so the common bare `192.168.1.5:8080` needs one supplied.
  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(text)

  try {
    const url = new URL(hasScheme ? text : `http://${text}`)
    if (!url.hostname) return null

    const https = url.protocol === 'https:'
    // qBittorrent's own default, and the one the port field starts on. A
    // pasted URL with no port meant the scheme's default, so honour that.
    const port = url.port ? Number(url.port) : https ? 443 : 80

    return { host: url.hostname, port, https, path: cleanPath(url.pathname) }
  } catch {
    return null
  }
}

/**
 * What is wrong with a draft, or null when nothing is.
 *
 * `existing` is every other connection, so a duplicate can be named. Two
 * entries pointing at one daemon are not an error the app has to prevent, but
 * they are almost always a mistake, and the user cannot tell them apart in a
 * list afterwards.
 */
export function problemWith(draft: ConnectionDraft, existing: Connection[] = []): string | null {
  if (!draft.label.trim()) return 'Give it a name.'
  if (!draft.host.trim()) return 'Give it an address.'
  if (!Number.isInteger(draft.port) || draft.port < 1 || draft.port > 65535) {
    return 'The port has to be a number from 1 to 65535.'
  }
  if (draft.requiresAuth && !draft.username.trim()) return 'Give it a username, or turn off login.'

  const target = addressOf(clean(draft))
  const clash = existing.find((one) => addressOf(one) === target && one.https === draft.https)
  if (clash) return `${clash.label} already points at ${target}.`

  return null
}

/** A blank draft, on qBittorrent's default port. */
export function emptyDraft(): ConnectionDraft {
  return {
    label: '',
    host: '',
    port: 8080,
    https: false,
    path: '',
    username: 'admin',
    requiresAuth: true,
  }
}
