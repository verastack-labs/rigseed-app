import { canReachDesktop } from '@/services/shell'

/** What happened, in the terms a caller has something to say about. */
export type SaveOutcome =
  | { kind: 'saved'; path: string; bytes: number }
  | { kind: 'cancelled' }
  | { kind: 'unsupported' }
  | { kind: 'failed'; reason: string }

/**
 * The characters a file name genuinely cannot hold.
 *
 * A torrent's name is whatever whoever made it typed, and plenty of real ones
 * carry a colon or a slash. Offering that verbatim as the default file name
 * makes the save dialog reject it, which reads as rigseed being broken rather
 * than as a name that cannot be a path.
 *
 * Hyphens and spaces are deliberately not in this class. Both are legal
 * everywhere, and a first version swept them in, which turned
 * `ubuntu-24.04.2-desktop-amd64` into `ubuntu 24.04.2 desktop amd64`. A
 * silently mangled name is worse than a rejected one, because nothing says it
 * happened.
 */
const UNSAFE = /[<>:"/\\|?*]/g

/** A torrent's name, made into something a save dialog will accept. */
export function fileNameFor(name: string): string {
  const cleaned = name.replace(UNSAFE, ' ').replace(/\s+/g, ' ').trim()
  // Trailing dots and spaces are legal in the string and not in a Windows file
  // name, and an empty result would offer a dialog with no name at all.
  const trimmed = cleaned.replace(/[. ]+$/, '')
  return `${trimmed === '' ? 'torrent' : trimmed.slice(0, 120)}.torrent`
}

/**
 * Saves a torrent's own `.torrent` file wherever the user chooses.
 *
 * Two halves that both have to happen outside the webview. The dialog plugin
 * asks where, and a Rust command does the fetching and the writing, because a
 * `.torrent` is bencoded binary while the transport's response carries a
 * string, and because rigseed has no filesystem plugin for JavaScript to write
 * with even if it had the bytes.
 *
 * `unsupported` rather than an error outside Tauri. The menu item that calls
 * this is hidden there, the same way Open containing folder is, so this is a
 * second line of defence rather than a message anybody should see.
 */
export async function saveTorrentFile(
  baseUrl: string,
  hash: string,
  name: string,
): Promise<SaveOutcome> {
  if (!canReachDesktop() || baseUrl === '') return { kind: 'unsupported' }

  try {
    const { save } = await import('@tauri-apps/plugin-dialog')
    const dest = await save({
      defaultPath: fileNameFor(name),
      filters: [{ name: 'Torrent file', extensions: ['torrent'] }],
    })
    // Null is the dialog being dismissed, which is a decision rather than a
    // failure and must not raise anything.
    if (dest === null) return { kind: 'cancelled' }

    const { invoke } = await import('@tauri-apps/api/core')
    const bytes = await invoke<number>('export_torrent', { baseUrl, hash, dest })
    return { kind: 'saved', path: dest, bytes }
  } catch (cause) {
    return { kind: 'failed', reason: cause instanceof Error ? cause.message : String(cause) }
  }
}
