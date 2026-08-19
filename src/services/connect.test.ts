import { describe, expect, it, vi } from 'vitest'

import { connect } from '@/services/connect'
import { capabilitiesFor } from '@/services/torrents'
import * as transportModule from '@/services/transport'
import type { Transport } from '@/services/transport'

/** A transport that answers from a table and records what it was asked. */
function fakeTransport(answers: Record<string, unknown>) {
  const calls: string[] = []
  const answer = <T>(path: string): Promise<T> => {
    calls.push(path)
    if (!(path in answers)) return Promise.reject(new Error(`unexpected ${path}`))
    const value = answers[path]
    return value instanceof Error ? Promise.reject(value) : Promise.resolve(value as T)
  }
  const transport: Transport = {
    get: (path) => answer(path),
    post: (path) => answer(path),
    postForm: (path) => answer(path),
  }
  return { transport, calls }
}

// Spread the real module so `createHttpTransport` is a spyable property.
// Every other export stays exactly what it was.
vi.mock('@/services/transport', async (original) => {
  const actual = await original<typeof transportModule>()
  return { ...actual }
})

describe('capabilitiesFor', () => {
  it('reads stop and start as 2.11 and later', () => {
    // Web API 2.11, which shipped with qBittorrent 5.0, renamed
    // torrents/pause and torrents/resume to stop and start.
    expect(capabilitiesFor('2.11.2').stopStart).toBe(true)
    expect(capabilitiesFor('2.11.0').stopStart).toBe(true)
    expect(capabilitiesFor('3.0.0').stopStart).toBe(true)
  })

  it('reads anything earlier as pause and resume', () => {
    // Found against a real 5.0.0beta1, which reports 2.10.4 and answers 404
    // for torrents/stop. Assuming the new names would have made Pause a button
    // that does nothing, on a daemon that was working perfectly.
    expect(capabilitiesFor('2.10.4').stopStart).toBe(false)
    expect(capabilitiesFor('2.8.3').stopStart).toBe(false)
  })

  it('assumes modern when the version does not parse', () => {
    // A daemon that cannot say what it is is far more likely to be something
    // new than something from before 2021.
    expect(capabilitiesFor('').stopStart).toBe(true)
    expect(capabilitiesFor('unknown').stopStart).toBe(true)
  })
})

describe('connect', () => {
  const target = { baseUrl: '', username: 'rigseed', password: 'hunter2' }

  it('treats a 200 that says Fails. as a rejection', async () => {
    // The trap this exists for. qBittorrent answers a bad login with HTTP 200
    // and the body `Fails.`, so a transport that only checks status codes
    // reports a healthy connection that 403s on every call after it.
    const { transport } = fakeTransport({ 'auth/login': 'Fails.' })
    vi.spyOn(transportModule, 'createHttpTransport').mockReturnValue(transport)

    const result = await connect(target)
    expect(result.status).toBe('failed')
    expect(result.status === 'failed' && result.reason).toMatch(/rejected/i)
  })

  it('asks what the daemon is before building the real client', async () => {
    const { transport, calls } = fakeTransport({
      'auth/login': 'Ok.',
      'app/version': 'v5.2.3',
      'app/webapiVersion': '2.11.2',
    })
    vi.spyOn(transportModule, 'createHttpTransport').mockReturnValue(transport)

    const result = await connect(target)
    expect(result.status).toBe('connected')
    expect(calls[0]).toBe('auth/login')
    expect(calls).toContain('app/webapiVersion')
  })

  it('separates unreachable from unauthenticated', async () => {
    // Two different things to tell somebody, and only one of them is worth
    // checking a password over.
    const { transport } = fakeTransport({ 'auth/login': new Error('ECONNREFUSED') })
    vi.spyOn(transportModule, 'createHttpTransport').mockReturnValue(transport)

    const result = await connect(target)
    expect(result.status === 'failed' && result.reason).toMatch(/could not reach/i)
  })
})

describe('waiting for a daemon that is still starting', () => {
  const target = { baseUrl: '', username: 'rigseed', password: 'hunter2' }

  it('retries while nothing answers', async () => {
    // The bundled daemon is spawned as the window opens and takes a moment to
    // bind its port, so the app is ready to ask before there is anything to
    // ask. Without this the first launch after install always shows sample
    // data, and only a restart fixes it.
    let attempts = 0
    const transport: Transport = {
      get: (path) =>
        path === 'app/version'
          ? Promise.resolve('v5.2.3' as never)
          : Promise.resolve('2.11.2' as never),
      post: () => {
        attempts += 1
        return attempts < 3
          ? Promise.reject(new Error('ECONNREFUSED'))
          : Promise.resolve('Ok.' as never)
      },
      postForm: () => Promise.resolve(undefined as never),
    }
    vi.spyOn(transportModule, 'createHttpTransport').mockReturnValue(transport)

    const result = await connect(target, { waitMs: 5_000 })
    expect(result.status).toBe('connected')
    expect(attempts).toBe(3)
  })

  it('does not retry a refusal', async () => {
    // A daemon that answered and said no has given a final answer. Asking
    // again is a slow way to lock the account out, and qBittorrent does count
    // failed logins per address.
    let attempts = 0
    const { transport } = fakeTransport({ 'auth/login': 'Fails.' })
    const counted: Transport = {
      ...transport,
      post: (path) => {
        attempts += 1
        return transport.post(path)
      },
    }
    vi.spyOn(transportModule, 'createHttpTransport').mockReturnValue(counted)

    const result = await connect(target, { waitMs: 5_000 })
    expect(result.status).toBe('failed')
    expect(attempts).toBe(1)
  })
})
