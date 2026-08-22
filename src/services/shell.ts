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

async function dialog() {
  if (!canReachDesktop()) return null
  try {
    return await import('@tauri-apps/plugin-dialog')
  } catch (error) {
    complain('load the dialog plugin for', '', error)
    return null
  }
}

/**
 * Ask for a folder and return what was chosen.
 *
 * Null covers both "there is no desktop to ask" and "the person closed the
 * picker", because a caller has the same job in either case: leave the field
 * as it was. The multi-select form of the API can return an array, which is
 * not something this ever asks for, so it is treated as no answer.
 */
export async function pickFolder(startingAt?: string): Promise<string | null> {
  const mod = await dialog()
  if (!mod) return null
  try {
    const chosen = await mod.open({
      directory: true,
      multiple: false,
      title: 'Choose where to save',
      ...(startingAt ? { defaultPath: startingAt } : {}),
    })
    return typeof chosen === 'string' ? chosen : null
  } catch (error) {
    complain('open a folder picker at', startingAt ?? '', error)
    return null
  }
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

/**
 * Open a link in the system browser.
 *
 * Never in the webview. rigseed's window has no address bar, no back button
 * and no way to tell the user where they have ended up, so navigating it to a
 * third-party page would strand them in something that looks like the app and
 * is not.
 *
 * Outside Tauri this does nothing rather than falling back to `window.open`,
 * which is the same rule the rest of this module follows: the caller checks
 * `canReachDesktop()` and does not offer what cannot happen.
 */
export async function openUrl(url: string): Promise<void> {
  const mod = await opener()
  if (!mod || !url) return
  try {
    await mod.openUrl(url)
  } catch (error) {
    complain('open', url, error)
  }
}
