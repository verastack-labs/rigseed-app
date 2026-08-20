/**
 * Handing a path to the desktop.
 *
 * Two things, and they are genuinely different: *revealing* selects an item in
 * the file manager and opens the window around it, while *opening* launches it
 * in whatever the system considers its application. Double-clicking a video
 * should play it; a folder button should show it in Explorer, not open every
 * file inside it.
 *
 * Both are no-ops outside Tauri rather than errors. The app runs in a browser
 * during development and against the mock, where there is no desktop to hand
 * anything to, and a dead menu item is better than a thrown exception from a
 * click on a screen that is otherwise working.
 */

async function opener() {
  if (!(globalThis as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__) return null
  try {
    return await import('@tauri-apps/plugin-opener')
  } catch {
    return null
  }
}

/** True when the desktop can be asked at all, for hiding what would do nothing. */
export function canReachDesktop(): boolean {
  return Boolean((globalThis as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__)
}

/**
 * Show a file or folder in the system file manager, selected.
 *
 * The daemon reports `content_path` for a torrent, which is the file itself
 * for a single-file torrent and the folder for a multi-file one. Revealing
 * handles both: the file manager opens the parent either way and highlights
 * what was named.
 */
export async function revealInFolder(path: string): Promise<void> {
  const mod = await opener()
  if (!mod || !path) return
  try {
    await mod.revealItemInDir(path)
  } catch {
    // A path the daemon knows about but this machine does not, which happens
    // the moment somebody points rigseed at a remote instance. Not worth an
    // error dialog on a click that was a convenience.
  }
}

/** Launch a file in whatever the system opens it with. */
export async function openPath(path: string): Promise<void> {
  const mod = await opener()
  if (!mod || !path) return
  try {
    await mod.openPath(path)
  } catch {
    // Same as above: unopenable, or not on this machine.
  }
}
