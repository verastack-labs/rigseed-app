import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  ASK_KEY,
  readAskPreference,
  shouldAskBeforeAdding,
  writeAskPreference,
} from '@/features/search/add-behaviour'

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('shouldAskBeforeAdding', () => {
  describe('with nothing stored, the layout decides', () => {
    it('adds straight away on Easy', () => {
      // Easy is the layout that asks for fewer decisions. A dialog is a
      // decision.
      expect(shouldAskBeforeAdding(null, 'easy')).toBe(false)
    })

    it('opens the dialog on Grid', () => {
      expect(shouldAskBeforeAdding(null, 'grid')).toBe(true)
    })

    it('opens the dialog on List', () => {
      // The reported fault: this returned false for every layout, so somebody
      // on List had to find a switch to get the behaviour their layout already
      // implied.
      expect(shouldAskBeforeAdding(null, 'list')).toBe(true)
    })
  })

  describe('a stored value outranks the layout', () => {
    it('honours an explicit no, even on a dense layout', () => {
      expect(shouldAskBeforeAdding(false, 'list')).toBe(false)
    })

    it('honours an explicit yes, even on Easy', () => {
      // Somebody on Easy who wants to choose a save path every time has said
      // so, and that is not the layout's business to override.
      expect(shouldAskBeforeAdding(true, 'easy')).toBe(true)
    })
  })
})

describe('readAskPreference', () => {
  it('reports null when the switch has never been touched', () => {
    // Null rather than false is the whole mechanism: it is what lets the
    // layout answer instead.
    expect(readAskPreference()).toBeNull()
  })

  it('reads back what was written', () => {
    writeAskPreference(true)
    expect(readAskPreference()).toBe(true)
    writeAskPreference(false)
    expect(readAskPreference()).toBe(false)
  })

  it('treats unreadable storage as untouched rather than as no', () => {
    // A browser with storage blocked throws here rather than returning null.
    // Answering false would silently skip the dialog for everyone in a private
    // window, which is the same fault in a smaller place.
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })
    expect(readAskPreference()).toBeNull()
    expect(shouldAskBeforeAdding(readAskPreference(), 'list')).toBe(true)
  })

  it('does not throw when storage refuses a write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })
    expect(() => writeAskPreference(true)).not.toThrow()
  })
})

describe('the stored key', () => {
  it('is the one the page has always used, so nobody loses their setting', () => {
    // Renaming it would silently reset every existing preference to untouched.
    expect(ASK_KEY).toBe('rigseed:search:ask-before-adding')
  })
})
