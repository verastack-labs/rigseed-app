import { describe, expect, it } from 'vitest'

import { createAuthApi } from '@/services/auth'
import type { Transport } from '@/services/transport'

/** A transport that answers `auth/login` with whatever is given. */
function answering(answer: unknown): Transport {
  return {
    get: () => Promise.resolve(undefined as never),
    post: () => Promise.resolve(answer as never),
    postForm: () => Promise.resolve(undefined as never),
  }
}

describe('what counts as a successful login', () => {
  it('accepts an empty body, which is what 5.2.3 sends', async () => {
    // The regression this exists for. The API documentation promises `Ok.`
    // and older daemons send it; 5.2.3 answers 204 with no body at all.
    // Measured against the bundled daemon: auth/login returned 204 and an
    // empty body, and app/version on the same session returned v5.2.3.
    //
    // Checking for `Ok` meant the daemon logged `WebAPI login success` in the
    // same second the app reported that it had been rejected, and the two
    // were describing the same request.
    const api = createAuthApi(answering(''))
    await expect(api.login('rigseed', 'hunter2')).resolves.toBe(true)
  })

  it('accepts undefined, which is an empty body once parsed', async () => {
    const api = createAuthApi(answering(undefined))
    await expect(api.login('rigseed', 'hunter2')).resolves.toBe(true)
  })

  it('still accepts the documented Ok.', async () => {
    const api = createAuthApi(answering('Ok.'))
    await expect(api.login('rigseed', 'hunter2')).resolves.toBe(true)
  })

  it('refuses on Fails., which arrives with HTTP 200', async () => {
    // The reason the status code cannot be trusted here: a wrong password is
    // a 200 with a body saying otherwise.
    const api = createAuthApi(answering('Fails.'))
    await expect(api.login('rigseed', 'wrong')).resolves.toBe(false)
  })

  it('is not fooled by whitespace around the answer', async () => {
    const api = createAuthApi(answering('  Fails.\n'))
    await expect(api.login('rigseed', 'wrong')).resolves.toBe(false)
  })
})
