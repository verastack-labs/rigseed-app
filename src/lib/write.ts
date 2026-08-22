import { detailOf, notify } from '@/state/notice-store'

/**
 * Runs a write and says so when it does not happen.
 *
 * Every action in rigseed was a bare `void api.something()`. The daemon
 * refusing, the network dropping, or the session having expired all produced
 * the same thing on screen: nothing. The row did not change, no message
 * appeared, and the next poll quietly restored the old value, so the click
 * read as having been ignored rather than as having failed.
 *
 * `void write('Pause torrent', () => api.torrents.pause(hashes))` instead. The
 * label is what was attempted in the user's terms, not the endpoint: somebody
 * who clicked Pause needs to know pausing failed, and `torrents/stop` is a
 * detail underneath that.
 *
 * Silent on success on purpose. A confirmation for every successful action is
 * noise, and the result is already visible in the thing that changed. The
 * exceptions are actions with nothing to show for themselves, which pass
 * `announce` and get one line.
 */
export async function write(
  what: string,
  job: () => Promise<unknown>,
  options: { announce?: string } = {},
): Promise<boolean> {
  try {
    await job()
    if (options.announce) notify({ tone: 'ok', what: options.announce })
    return true
  } catch (cause) {
    const detail = detailOf(cause)
    notify(detail === undefined ? { tone: 'warn', what } : { tone: 'warn', what, detail })
    return false
  }
}
