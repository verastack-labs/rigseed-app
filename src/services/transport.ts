/**
 * The HTTP layer every namespace module sits on.
 *
 * Deliberately an interface rather than a concrete fetch wrapper. The mock
 * transport implements the same shape, so every screen can be built and
 * reviewed against fixtures before the sidecar exists, and the namespace
 * modules never learn which one they are talking to.
 */

export interface Transport {
  /** GET with query params. Returns parsed JSON. */
  get<T>(path: string, params?: Record<string, string | number | boolean>): Promise<T>
  /** POST as application/x-www-form-urlencoded, which is what the API expects. */
  post<T>(path: string, body?: Record<string, string | number | boolean>): Promise<T>
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function encode(params: Record<string, string | number | boolean>): string {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')
}

/**
 * Reads a response as JSON, tolerating the endpoints that answer with a bare
 * string or an empty body.
 *
 * The API is not uniform about this: most of `torrents/*` returns `Ok.` as
 * plain text, `app/version` returns a bare version string, and JSON.parse on
 * either of those throws. Treating a non-JSON 2xx as success is correct rather
 * than lenient.
 */
async function readBody<T>(response: Response): Promise<T> {
  const text = await response.text()
  if (!text) return undefined as T
  try {
    return JSON.parse(text) as T
  } catch {
    return text as T
  }
}

export interface HttpTransportOptions {
  /** For example "http://127.0.0.1:8080". No trailing slash. */
  baseUrl: string
  /** Bundled instance aside, remote connections carry an SID cookie. */
  credentials?: RequestCredentials
  fetchImpl?: typeof fetch
}

export function createHttpTransport({
  baseUrl,
  credentials = 'include',
  fetchImpl = fetch,
}: HttpTransportOptions): Transport {
  const url = (path: string) => `${baseUrl.replace(/\/$/, '')}/api/v2/${path}`

  const check = async (response: Response, path: string) => {
    if (response.ok) return
    // 403 means the session lapsed, which the connection layer handles by
    // re-authenticating rather than by surfacing an error to the screen.
    throw new ApiError(response.status, path, `${path} responded ${response.status}`)
  }

  return {
    async get<T>(path: string, params?: Record<string, string | number | boolean>): Promise<T> {
      const query = params && Object.keys(params).length ? `?${encode(params)}` : ''
      const response = await fetchImpl(url(path) + query, { credentials })
      await check(response, path)
      return readBody<T>(response)
    },

    async post<T>(path: string, body?: Record<string, string | number | boolean>): Promise<T> {
      const response = await fetchImpl(url(path), {
        method: 'POST',
        credentials,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        ...(body ? { body: encode(body) } : {}),
      })
      await check(response, path)
      return readBody<T>(response)
    },
  }
}
