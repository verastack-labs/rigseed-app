import { ApiError } from '@/services/transport'

/**
 * What the daemon means when it refuses a move.
 *
 * qBittorrent answers `torrents/setLocation` with a status and no body, so
 * without this the user reads "torrents/setLocation responded 403", which
 * names our endpoint and their problem in the wrong order. Each of the three
 * says something genuinely different and each has a different fix.
 *
 * Its own module rather than sitting beside the dialog, because a file that
 * exports both a component and a function loses fast refresh for the whole
 * file.
 */
export function moveFailureDetail(cause: unknown): string | undefined {
  if (!(cause instanceof ApiError)) return undefined
  switch (cause.status) {
    case 400:
      return 'No folder was given.'
    case 403:
      return 'That folder exists but rigseed cannot write to it. Check its permissions, or pick one inside your home folder.'
    case 409:
      return 'That folder could not be created. The drive may be full, read-only, or disconnected.'
    default:
      // Anything else is reported as itself rather than guessed at.
      return undefined
  }
}
