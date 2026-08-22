import { canReachDesktop } from '@/services/shell'

/**
 * Notifications the operating system shows, as opposed to the in-app toasts.
 *
 * They answer a different question. A toast reports on something the user just
 * did and is looking at the window for. A desktop notification is for what
 * happened while they were not: a torrent client is a thing people leave
 * running behind other windows, and a download that finished an hour ago
 * announcing itself only inside a window nobody is looking at is not an
 * announcement.
 *
 * That is also the whole rule for what gets one. If it is a reaction to a
 * click, it is a toast. If it can happen with the window minimised, it is a
 * candidate for this, and even then only when it is worth interrupting for.
 *
 * Every function is a no-op outside Tauri rather than an error. The app runs
 * in a browser during development and against the mock, where there is no
 * desktop to ask.
 */

/** Reports a failed handoff without making it the caller's problem. */
function complain(what: string, error: unknown): void {
  console.error(`rigseed: could not ${what}`, error)
}

async function plugin() {
  if (!canReachDesktop()) return null
  try {
    return await import('@tauri-apps/plugin-notification')
  } catch (error) {
    complain('load the notification plugin', error)
    return null
  }
}

/**
 * Whether the OS has already agreed to let rigseed interrupt.
 *
 * False rather than throwing when there is nothing to ask, so a caller can
 * treat "no desktop" and "not allowed" the same way, which is what every
 * caller here wants.
 */
export async function alertsAllowed(): Promise<boolean> {
  const api = await plugin()
  if (!api) return false
  try {
    return await api.isPermissionGranted()
  } catch (error) {
    complain('check the notification permission', error)
    return false
  }
}

/**
 * Asks the OS for permission, if it has not already answered.
 *
 * Called when somebody turns the setting on, never on startup. A permission
 * prompt on first launch arrives before there is any reason for it, gets
 * refused on reflex, and on most systems cannot be asked again.
 */
export async function askForAlerts(): Promise<boolean> {
  const api = await plugin()
  if (!api) return false
  try {
    if (await api.isPermissionGranted()) return true
    return (await api.requestPermission()) === 'granted'
  } catch (error) {
    complain('ask for the notification permission', error)
    return false
  }
}

/**
 * Shows one, if that is allowed.
 *
 * Checks permission every time rather than caching it. It is revocable from
 * the operating system's own settings while rigseed is running, and a cached
 * yes turns that into a stream of silently failing calls.
 */
export async function alert(title: string, body: string): Promise<void> {
  const api = await plugin()
  if (!api) return
  try {
    if (!(await api.isPermissionGranted())) return
    api.sendNotification({ title, body })
  } catch (error) {
    complain(`show a notification for ${title}`, error)
  }
}
