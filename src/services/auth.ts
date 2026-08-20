import type { Transport } from '@/services/transport'

/**
 * Log in and out.
 *
 * A failed login is `Fails.` with **HTTP 200**, so the status code cannot be
 * trusted here and the body has to be read. That is why this is not just
 * another `transport.post` call site.
 *
 * A successful one is not what the API documentation says. The docs promise
 * `Ok.`, and older daemons send it, but 5.2.3 answers **204 with no body at
 * all**. Measured against the bundled daemon: `auth/login` returned 204 and an
 * empty body, and `app/version` on the same session immediately returned
 * `v5.2.3`.
 *
 * So success is defined as "not refused" rather than as a particular word.
 * Checking for `Ok` cost most of a day: the daemon logged
 * `WebAPI login success` in the same second the app reported that the daemon
 * had rejected its credentials, and the two were describing the same request.
 *
 * The cookie is the session. Nothing in rigseed reads or stores it: the
 * browser holds it for the daemon's origin and `credentials: 'include'` sends
 * it back, which is also why the dev server proxies the daemon rather than the
 * page talking to another port.
 */
export function createAuthApi(transport: Transport) {
  return {
    /** Resolves true when the credentials were accepted. */
    login: async (username: string, password: string): Promise<boolean> => {
      const answer = await transport.post<string | undefined>('auth/login', {
        username,
        password,
      })
      // Empty covers the 204, and anything that is not a refusal is a session.
      const said = (answer ?? '').toString().trim()
      return !said.startsWith('Fails')
    },
    logout: () => transport.post<void>('auth/logout'),
  }
}

export type AuthApi = ReturnType<typeof createAuthApi>
