import { beforeEach, describe, expect, it, vi } from 'vitest'

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

// Mocked rather than spied on: the store imports `forget` by name, and the
// real one falls through to an in-memory map outside Tauri, so a spy would
// pass without proving the call was made.
const forget = vi.fn<(id: string) => Promise<void>>(() => Promise.resolve())
vi.mock('@/services/secrets', () => ({ forget: (id: string) => forget(id) }))

const state = () => useConnectionStore.getState()

const draft = (over: Partial<ConnectionDraft> = {}): ConnectionDraft => ({
  ...emptyDraft(),
  label: 'Home server',
  host: '192.168.1.5',
  ...over,
})

const saved = (over: Partial<Connection> = {}): Connection => ({
  ...draft(),
  id: 'one',
  ...over,
})

describe('connection store', () => {
  beforeEach(() => {
    state().reset()
    localStorage.clear()
    forget.mockClear()
  })

  it('starts on the built-in daemon rather than on nothing', () => {
    // Null is a working choice, not an empty one: rigseed runs its own daemon,
    // so a fresh install with no saved connections is still usable.
    expect(state().activeId).toBeNull()
    expect(state().connections).toEqual([])
  })

  it('hands back the new id, since the password is filed under it', () => {
    const id = state().add(draft())
    expect(id).toBeTruthy()
    expect(state().connections.map((one) => one.id)).toEqual([id])
  })

  it('gives each connection its own id, same address or not', () => {
    const first = state().add(draft())
    const second = state().add(draft({ label: 'Same box, second daemon', port: 8081 }))
    expect(first).not.toBe(second)
  })

  it('never stores a password, whatever it is handed', () => {
    // The store is a plaintext JSON file. This is the whole reason the
    // keychain exists, so it is worth a test rather than a comment.
    state().add({ ...draft(), password: 'hunter2' } as ConnectionDraft)
    expect(JSON.stringify(state().connections)).not.toContain('hunter2')
  })

  it('trims what it is given, so a stray space is not a second daemon', () => {
    state().add(draft({ label: '  Home server  ', host: ' 192.168.1.5 ', username: ' admin ' }))
    const [one] = state().connections
    expect(one).toMatchObject({ label: 'Home server', host: '192.168.1.5', username: 'admin' })
  })

  it('stores a path with one leading slash and no trailing one', () => {
    // `//api/v2/...` is a 404 from qBittorrent's router rather than a
    // redirect, so the joining has to be right before the request is built.
    state().add(draft({ path: '/qbt/' }))
    expect(state().connections[0]?.path).toBe('/qbt')
    state().add(draft({ label: 'Other', path: 'qbt' }))
    expect(state().connections[1]?.path).toBe('/qbt')
  })

  it('keeps the id across an edit', () => {
    // The keychain entry is keyed by it. A new id on every save would strand
    // the password and log the user out for renaming their server.
    const id = state().add(draft())
    state().update(id, { label: 'Renamed', port: 9090 })
    expect(state().connections[0]).toMatchObject({ id, label: 'Renamed', port: 9090 })
  })

  it('forgets the password when the connection goes', () => {
    const id = state().add(draft())
    state().remove(id)
    expect(forget).toHaveBeenCalledWith(id)
  })

  it('falls back to the built-in daemon when the active one is removed', () => {
    // Not to the next in the list. Silently connecting to some other remote
    // instance is a worse surprise than dropping to the local one.
    const first = state().add(draft())
    state().add(draft({ label: 'Second', port: 8081 }))
    state().setActive(first)
    state().remove(first)
    expect(state().activeId).toBeNull()
  })

  it('leaves the active one alone when a different connection is removed', () => {
    const first = state().add(draft())
    const second = state().add(draft({ label: 'Second', port: 8081 }))
    state().setActive(first)
    state().remove(second)
    expect(state().activeId).toBe(first)
  })
})

describe('baseUrlOf', () => {
  it('builds the scheme from the flag rather than from the host', () => {
    expect(baseUrlOf(saved())).toBe('http://192.168.1.5:8080')
    expect(baseUrlOf(saved({ https: true, port: 8443 }))).toBe('https://192.168.1.5:8443')
  })

  it('keeps the reverse proxy prefix', () => {
    expect(baseUrlOf(saved({ path: '/qbt' }))).toBe('http://192.168.1.5:8080/qbt')
  })
})

describe('addressOf', () => {
  it('drops the scheme, which the list has no room for', () => {
    expect(addressOf(saved({ https: true }))).toBe('192.168.1.5:8080')
  })
})

describe('parseAddress', () => {
  it('reads a URL pasted out of a browser bar', () => {
    // The single most likely thing anybody does with this field.
    expect(parseAddress('http://192.168.1.5:8080')).toEqual({
      host: '192.168.1.5',
      port: 8080,
      https: false,
      path: '',
    })
  })

  it('reads a bare host and port, which has no scheme to parse', () => {
    expect(parseAddress('nas.local:8080')).toMatchObject({ host: 'nas.local', port: 8080 })
  })

  it('takes https from the scheme', () => {
    expect(parseAddress('https://qbt.example.org:8443')).toMatchObject({
      https: true,
      port: 8443,
    })
  })

  it("falls back to the scheme's own port when none was given", () => {
    expect(parseAddress('https://qbt.example.org')).toMatchObject({ port: 443, https: true })
    expect(parseAddress('http://qbt.example.org')).toMatchObject({ port: 80 })
  })

  it('keeps a reverse proxy prefix off the pasted URL', () => {
    expect(parseAddress('https://example.org/qbt/')).toMatchObject({ path: '/qbt' })
  })

  it('says nothing rather than guessing at an empty or broken field', () => {
    expect(parseAddress('')).toBeNull()
    expect(parseAddress('   ')).toBeNull()
    expect(parseAddress('http://')).toBeNull()
  })
})

describe('problemWith', () => {
  it('passes a filled-in draft', () => {
    expect(problemWith(draft())).toBeNull()
  })

  it('wants a name, since the list shows nothing else', () => {
    expect(problemWith(draft({ label: '   ' }))).toBe('Give it a name.')
  })

  it('wants an address', () => {
    expect(problemWith(draft({ host: '' }))).toBe('Give it an address.')
  })

  it('rejects a port outside the range', () => {
    expect(problemWith(draft({ port: 0 }))).toMatch(/1 to 65535/)
    expect(problemWith(draft({ port: 70000 }))).toMatch(/1 to 65535/)
    expect(problemWith(draft({ port: Number.NaN }))).toMatch(/1 to 65535/)
  })

  it('wants a username only when there is a login to do', () => {
    // A daemon that bypasses auth for localhost has no password to get right,
    // and asking for one implies it matters.
    expect(problemWith(draft({ username: '' }))).toMatch(/username/)
    expect(problemWith(draft({ username: '', requiresAuth: false }))).toBeNull()
  })

  it('names the connection that already points there', () => {
    const clash = problemWith(draft(), [saved({ label: 'Home server' })])
    expect(clash).toBe('Home server already points at 192.168.1.5:8080.')
  })

  it('treats the same host over a different scheme as a different daemon', () => {
    // Running plain and TLS on one port is unusual but the addresses are not
    // the same thing, and refusing the second would be wrong.
    expect(problemWith(draft({ https: true }), [saved()])).toBeNull()
  })

  it('compares addresses after trimming, not before', () => {
    expect(problemWith(draft({ host: ' 192.168.1.5 ' }), [saved()])).toMatch(/already points/)
  })
})
