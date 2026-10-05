/**
 * Reading what the updater tells us, and saying it in a sentence.
 *
 * The plugin reports failures as errors carrying a message from whichever
 * layer failed: its own configuration check, reqwest, or the signature
 * verifier. Those messages are accurate and none of them are addressed to the
 * person using the app, so they are classified here and described in words
 * that say what to do next.
 *
 * The classification is deliberately narrow. Patterns nobody has observed are
 * not guessed at: an unrecognised failure keeps its original message, because
 * a confident sentence invented for an error somebody has never seen is how
 * they end up debugging the wrong thing.
 */

export type UpdateFailure = 'signature' | 'no-channel' | 'no-manifest' | 'network' | 'unknown'

/**
 * Ordered, because the patterns overlap. A failed signature check can carry a
 * URL in its message, and a 404 arrives through the same request machinery as
 * a dns failure, so the most specific reading is tried first.
 */
const PATTERNS: ReadonlyArray<readonly [UpdateFailure, readonly RegExp[]]> = [
  ['signature', [/signature/i, /minisign/i, /failed to validate/i]],
  ['no-channel', [/not configured/i, /no endpoint/i, /endpoints? .*(empty|missing|not set)/i]],
  ['no-manifest', [/404/, /not found/i, /valid release json/i, /no releases/i]],
  ['network', [/sending request/i, /dns/i, /connection (refused|reset|closed)/i, /timed? ?out/i]],
]

export function classifyUpdateError(error: unknown): UpdateFailure {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : String(error ?? '')
  if (!message) return 'unknown'

  for (const [kind, patterns] of PATTERNS) {
    if (patterns.some((p) => p.test(message))) return kind
  }
  return 'unknown'
}

/**
 * A sentence for each, written for the person reading it rather than the
 * person who wrote the updater.
 */
export function describeFailure(failure: UpdateFailure, detail?: string): string {
  switch (failure) {
    case 'signature':
      /*
       * The only one of these that is not a nuisance.
       *
       * Every other failure means the update did not arrive. This one means
       * something arrived and was not ours, so it says refused rather than
       * failed, and it does not offer a retry: trying again against the same
       * tampered file would do the same thing.
       */
      return 'That update was refused. Its signature did not match rigseed’s, which means the file was not the one we published. Nothing was installed.'
    case 'no-channel':
      return 'This build has no update channel set up, so it cannot check. Newer versions are on the releases page.'
    case 'no-manifest':
      return 'No update information was published at the address this build checks. Nothing is wrong with your copy.'
    case 'network':
      return 'Could not reach the update server. That is usually the connection rather than the update.'
    case 'unknown':
      return detail
        ? `The update check failed: ${detail}`
        : 'The update check failed, and the reason given was empty.'
  }
}

export interface Progress {
  /** 0 to 100, or null when the server sent no content length. */
  percent: number | null
  known: boolean
}

/**
 * A bar parked at zero reads as stuck, and some servers send no content
 * length at all, so an unknown total says so rather than implying no progress.
 * The byte count beside it still moves either way.
 */
export function downloadProgress(received: number, total: number | null): Progress {
  if (!total || total <= 0) return { percent: null, known: false }
  const raw = (received / total) * 100
  /*
   * Rounded to a tenth, because the division does not land where arithmetic
   * says it should: 57 of 100 bytes is 56.99999999999999 in floating point,
   * which reaches a label as that and a bar width as a number with fifteen
   * decimals in it. A tenth is finer than any bar can draw and coarse enough
   * to be free of that.
   */
  const clamped = Math.min(100, Math.max(0, raw))
  return { percent: Math.round(clamped * 10) / 10, known: true }
}

/**
 * What applying an update does to what is running.
 *
 * Returns null when nothing is active: a caution that appears every time,
 * including the times it does not apply, is one people learn to skip.
 *
 * It says transfers resume, because they do. The daemon restarts and picks its
 * torrents back up from its own session. Without that clause the warning reads
 * as "you will lose your downloads", which is untrue and would stop people
 * updating at all, which is the opposite of what an updater is for.
 */
export function restartWarning(activeTransfers: number): string | null {
  if (activeTransfers <= 0) return null
  const count = `${activeTransfers} active transfer${activeTransfers === 1 ? '' : 's'}`
  return `Installing restarts the daemon. Your ${count} will stop and resume once rigseed is back.`
}
