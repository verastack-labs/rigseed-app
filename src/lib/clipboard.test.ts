import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { copy } from '@/lib/clipboard'
import { useNoticeStore } from '@/state/notice-store'

const notices = () => useNoticeStore.getState().notices

/** Replaces `navigator.clipboard` for one test, since jsdom ships none. */
function withClipboard(writeText: unknown) {
  Object.defineProperty(navigator, 'clipboard', {
    value: writeText === undefined ? undefined : { writeText },
    configurable: true,
  })
}

describe('copy', () => {
  beforeEach(() => {
    useNoticeStore.getState().clear()
  })

  afterEach(() => {
    withClipboard(undefined)
  })

  it('says what it copied', () => {
    // A clipboard write leaves nothing on screen. Without a confirmation the
    // only way to know it worked is to paste somewhere and look.
    const writeText = vi.fn(() => Promise.resolve())
    withClipboard(writeText)

    return copy('magnet link', 'magnet:?xt=urn:btih:abc').then((ok) => {
      expect(ok).toBe(true)
      expect(writeText).toHaveBeenCalledWith('magnet:?xt=urn:btih:abc')
      expect(notices()).toHaveLength(1)
      expect(notices()[0]).toMatchObject({ tone: 'ok', what: 'Copied magnet link' })
    })
  })

  it('never puts the value on screen', () => {
    // A magnet is hundreds of characters and a save path is a line of its own.
    const writeText = vi.fn(() => Promise.resolve())
    withClipboard(writeText)
    const magnet = `magnet:?xt=urn:btih:${'a'.repeat(200)}`

    return copy('magnet link', magnet).then(() => {
      expect(notices()[0]?.detail).toBeUndefined()
    })
  })

  it('reports a refused copy rather than swallowing it', async () => {
    // writeText rejects when the document is not focused or permission is
    // refused. The old `void` threw that away, so a refusal and a success
    // looked exactly alike.
    withClipboard(() => Promise.reject(new Error('Document is not focused')))

    const ok = await copy('info hash', 'abc123')
    expect(ok).toBe(false)
    expect(notices()[0]).toMatchObject({
      tone: 'warn',
      what: 'Copy info hash',
      detail: 'Document is not focused',
    })
  })

  it('speaks up when there is no clipboard at all', async () => {
    // The worst of the three cases the old code had. `navigator.clipboard` is
    // undefined in any non-secure context, and `?.` turned the whole
    // expression into a silent no-op: no error, no warning, nothing copied,
    // and nothing on screen to say so.
    withClipboard(undefined)

    const ok = await copy('save path', '/downloads')
    expect(ok).toBe(false)
    expect(notices()[0]).toMatchObject({
      tone: 'warn',
      what: 'Copy save path',
      detail: 'the clipboard is not available here',
    })
  })

  it('does not report success before the write settles', async () => {
    // Resolving the notice off the promise rather than beside it. A
    // confirmation raised synchronously would appear even for a write that
    // goes on to reject.
    let settle = (): void => {}
    withClipboard(() => new Promise<void>((resolve) => (settle = resolve)))

    const pending = copy('name', 'ubuntu.iso')
    expect(notices()).toHaveLength(0)

    settle()
    await pending
    expect(notices()[0]).toMatchObject({ tone: 'ok', what: 'Copied name' })
  })
})
