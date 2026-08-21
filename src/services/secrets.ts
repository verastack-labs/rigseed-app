/**
 * Connection passwords, in the OS keychain.
 *
 * The connection list is app-local config and lives in the store plugin,
 * which is a plaintext JSON file. A password must never go there, so it goes
 * to the keychain instead, keyed by the connection's id.
 *
 * Outside Tauri there is no keychain to write to. Rather than pretending, the
 * password lives in memory for the session and `persists()` answers false, so
 * a screen can say so instead of implying something was saved.
 */

const memory = new Map<string, string>()

function underTauri(): boolean {
  return Boolean((globalThis as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__)
}

async function invoke<T>(command: string, args: Record<string, unknown>): Promise<T | null> {
  if (!underTauri()) return null
  try {
    const { invoke: call } = await import('@tauri-apps/api/core')
    return await call<T>(command, args)
  } catch (error) {
    // A refused keychain is worth saying out loud: on Linux it usually means
    // no secret service is running, and the alternative is a login that
    // silently fails to persist.
    console.error(`rigseed: keychain ${command} failed`, error)
    return null
  }
}

/** Whether a password given to `store` will outlive the session. */
export function persists(): boolean {
  return underTauri()
}

export async function store(id: string, password: string): Promise<void> {
  if (!id) return
  if (!underTauri()) {
    if (password) memory.set(id, password)
    else memory.delete(id)
    return
  }
  await invoke<void>('secret_set', { id, password })
}

export async function read(id: string): Promise<string | null> {
  if (!id) return null
  if (!underTauri()) return memory.get(id) ?? null
  return await invoke<string | null>('secret_get', { id })
}

/**
 * Forgets a password.
 *
 * Removing a connection has to call this. Without it the keychain fills with
 * entries for connections nothing can reach any more, and the user has no
 * interface anywhere that would let them find or clear those.
 */
export async function forget(id: string): Promise<void> {
  if (!id) return
  memory.delete(id)
  if (underTauri()) await invoke<void>('secret_delete', { id })
}
