import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const ROOTS = ['src/pages', 'src/features', 'src/components']

/** Namespaces on the client. A call on one of these is a request. */
const CALL = /\bapi\.(torrents|transfer|app|search|rss|log)\.[a-zA-Z]+\s*\(/g

/**
 * A clipboard write, which is a write like any other and was not being swept.
 *
 * Three files carried `void navigator.clipboard?.writeText(v)` and this sweep
 * never looked, because it only matched `api.`. Each one could fail in three
 * ways and report none of them: `writeText` rejects on a refused permission or
 * an unfocused document, and where `navigator.clipboard` is undefined the `?.`
 * turned the whole expression into a silent no-op.
 *
 * `copy` in `lib/clipboard.ts` is what these go through now, so the pattern
 * below should never match again outside that file.
 */
const CLIPBOARD = /navigator\.clipboard\s*\??\.\s*write(Text)?\s*\(/g

function sources(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) sources(path, found)
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) found.push(path)
  }
  return found
}

/**
 * Whether this call is inside something that will notice it failed.
 *
 * Walks back from the call for whichever comes last: a bare `void`, which
 * throws the result away, or something that catches. Two things count as
 * catching, and the second is not a loophole. A reporting wrapper says so on
 * screen, and a `try` means the code deliberately handles its own failure,
 * which the reads do: a plugin list that cannot be fetched shows a loading
 * shape rather than a message, and that is the right answer for a read.
 */
function reported(text: string, at: number): boolean {
  const window = text.slice(Math.max(0, at - 400), at)
  const handled = Math.max(
    window.lastIndexOf('write('),
    window.lastIndexOf('pluginWrite('),
    window.lastIndexOf('installPlugin('),
    window.lastIndexOf('try {'),
  )
  const bare = window.lastIndexOf('void ')
  return bare === -1 || handled > bare
}

describe('every write reports when it fails', () => {
  it('leaves no request thrown away behind a bare void', () => {
    // This exists because the first sweep missed several. It searched for
    // `void api.` and the misses were all `void (` followed by a conditional:
    // the detail page's pause, its file priorities, its per-torrent speed
    // limits, and both category writes. Each one failed in silence for the
    // same reason the fourteen that were found did.
    //
    // A screen that cannot report a failed write is not a style problem. The
    // row does not change, the next poll restores the old value, and the click
    // reads as ignored rather than as refused.
    const offenders: string[] = []

    for (const file of ROOTS.flatMap((root) => sources(root))) {
      const text = readFileSync(file, 'utf8')
      for (const match of text.matchAll(CALL)) {
        const at = match.index
        if (at === undefined || reported(text, at)) continue
        const line = text.slice(0, at).split('\n').length
        offenders.push(`${file.replace(/\\/g, '/')}:${line} ${match[0]}`)
      }
    }

    expect(offenders).toEqual([])
  })

  it('leaves no clipboard write going straight to the browser', () => {
    // The sweep above was written to catch requests thrown away behind a bare
    // `void`, and it worked, but its pattern only ever matched `api.`. Three
    // clipboard writes sat in plain sight the whole time with exactly the
    // defect it exists to prevent, and one of them was in a menu shipped two
    // days earlier.
    //
    // A copy that fails is the worst kind of silent failure, because there is
    // nothing on screen to contradict it either way: the menu closes, and the
    // clipboard still holds whatever it held before.
    const offenders: string[] = []

    for (const file of ROOTS.flatMap((root) => sources(root))) {
      const text = readFileSync(file, 'utf8')
      for (const match of text.matchAll(CLIPBOARD)) {
        const at = match.index
        if (at === undefined) continue
        const line = text.slice(0, at).split('\n').length
        offenders.push(`${file.replace(/\\/g, '/')}:${line} ${match[0]}`)
      }
    }

    // Everything goes through `copy`, which reports all three failure modes.
    expect(offenders).toEqual([])
  })
})
