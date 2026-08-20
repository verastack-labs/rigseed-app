import { ApiError, type Transport } from '@/services/transport'

/**
 * The transport that talks to the daemon through Rust.
 *
 * The whole reason this exists is one header. qBittorrent's CSRF protection
 * compares a request's `Origin` against its own host and answers a mismatch
 * with 401, and inside a webview there is no way to send the right one:
 *
 * - `fetch` in the page carries the page's origin, and `Origin` is a forbidden
 *   header name, so nothing in the page can change it.
 * - `tauri-plugin-http` performs the request in Rust but still forwards the
 *   page's origin, and overrides one the caller sets. Measured: the daemon
 *   logged `Origin header: 'http://localhost:1420'` for requests that had set
 *   `Origin` to the daemon's own address.
 *
 * A request built in `src-tauri/src/http.rs` sends neither `Origin` nor
 * `Referer`, which is the case qBittorrent accepts and how every native client
 * talks to it. The session cookie lives in a jar on the Rust side, which is
 * also where it should be: the webview never sees the credentials again after
 * handing them over.
 *
 * The alternative was turning the daemon's CSRF protection off, which is one
 * line and would have worked. Making our own requests stop looking like a
 * cross-site attack is the better answer than telling the daemon to stop
 * noticing them.
 */

interface RustResponse {
  status: number
  body: string
}

/** Same shape as the HTTP transport's, so callers cannot tell them apart. */
function parse<T>(path: string, response: RustResponse): T {
  if (response.status < 200 || response.status >= 300) {
    throw new ApiError(response.status, path, `${path} responded ${response.status}`)
  }

  const text = response.body
  if (!text) return undefined as T
  try {
    return JSON.parse(text) as T
  } catch {
    // Several endpoints answer with a bare word, `Ok.` among them.
    return text as T
  }
}

/** Numbers and booleans go over as strings, which is what the API expects. */
function strings(params: Record<string, string | number | boolean> = {}) {
  return Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
}

export function createTauriTransport(baseUrl: string): Transport {
  const call = async <T>(command: string, args: Record<string, unknown>): Promise<T> => {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<T>(command, args)
  }

  return {
    async get<T>(path: string, params?: Record<string, string | number | boolean>): Promise<T> {
      const response = await call<RustResponse>('api_get', {
        baseUrl,
        path,
        params: strings(params),
      })
      return parse<T>(path, response)
    },

    async post<T>(path: string, body?: Record<string, string | number | boolean>): Promise<T> {
      const response = await call<RustResponse>('api_post', {
        baseUrl,
        path,
        body: strings(body),
      })
      return parse<T>(path, response)
    },

    async postForm<T>(path: string, form: FormData): Promise<T> {
      // FormData cannot cross the boundary, so it is flattened into parts. File
      // contents travel as a plain byte array rather than base64: this is a
      // process boundary, not a network, and base64 would cost a third more
      // bytes for a `.torrent` to be decoded immediately on the other side.
      const parts = await Promise.all(
        [...form.entries()].map(async ([name, value]) =>
          typeof value === 'string'
            ? { name, value }
            : {
                name,
                fileName: value.name,
                bytes: [...new Uint8Array(await value.arrayBuffer())],
              },
        ),
      )

      const response = await call<RustResponse>('api_post_form', { baseUrl, path, parts })
      return parse<T>(path, response)
    },
  }
}
