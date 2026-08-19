import type { Transport } from '@/services/transport'

/**
 * Log in and out.
 *
 * qBittorrent answers a successful login with the body `Ok.` and an `SID`
 * cookie, and a failed one with `Fails.` and **HTTP 200**. So the status code
 * says nothing here and the body has to be read, which is why this cannot just
 * be another `transport.post` call site.
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
      const answer = await transport.post<string>('auth/login', { username, password })
      return String(answer).trim().startsWith('Ok')
    },
    logout: () => transport.post<void>('auth/logout'),
  }
}

export type AuthApi = ReturnType<typeof createAuthApi>
