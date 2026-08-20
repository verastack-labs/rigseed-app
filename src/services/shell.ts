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
 *
 * What they are *not* is silent. An earlier version swallowed every failure
 * without a word, and `opener:default` turned out not to grant `open_path` at
 * all, so double-clicking a file did nothing and said nothing. A missing
 * capability is our bug, not the user's, and it has to be visible to whoever
 * is looking at the console.
 */

/**
 * Report a failed handoff without interrupting the click.
 *
 * Not a dialog: the common cause is a path this machine does not have, which
 * happens the moment somebody points rigseed at a remote instance, and that
 * does not deserve a modal. The console is enough to tell a broken permission
 * apart from an absent file.
 */
function complain(what: string, path: string, error: unknown): void {
  console.error(`rigseed: could not ${what} ${path}`, error)
}

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
  } catch (error) {
    complain('reveal', path, error)
  }
}

/** Launch a file in whatever the system opens it with. */
export async function openPath(path: string): Promise<void> {
  const mod = await opener()
  if (!mod || !path) return
  try {
    await mod.openPath(path)
  } catch (error) {
    complain('open', path, error)
  }
}
