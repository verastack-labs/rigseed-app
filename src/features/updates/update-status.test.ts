import { describe, expect, it } from 'vitest'

import {
  classifyUpdateError,
  describeFailure,
  downloadProgress,
  restartWarning,
} from '@/features/updates/update-status'

describe('classifyUpdateError', () => {
  it('names a signature failure as its own thing', () => {
    // The one failure that is not a nuisance. Everything else here means the
    // update did not arrive; this one means something arrived and was not ours.
    expect(classifyUpdateError(new Error('Failed to validate signature'))).toBe('signature')
    expect(classifyUpdateError(new Error('signature error: invalid'))).toBe('signature')
  })

  it('separates a missing channel from a failed one', () => {
    // Nothing is wrong with the machine in this case, the build simply has no
    // endpoint, which is true of every copy before the first release that
    // carries a manifest.
    expect(classifyUpdateError(new Error('Updater is not configured'))).toBe('no-channel')
    expect(classifyUpdateError(new Error('no endpoint set for the updater'))).toBe('no-channel')
  })

  it('reads a missing manifest as a missing manifest', () => {
    expect(classifyUpdateError(new Error('404 Not Found'))).toBe('no-manifest')
    expect(classifyUpdateError(new Error('Could not fetch a valid release JSON'))).toBe(
      'no-manifest',
    )
  })

  it('reads a failure to reach anything as a network failure', () => {
    expect(classifyUpdateError(new Error('error sending request for url'))).toBe('network')
    expect(classifyUpdateError(new Error('dns error: failed to lookup address'))).toBe('network')
    expect(classifyUpdateError(new Error('connection refused'))).toBe('network')
  })

  it('refuses to guess at anything it does not recognise', () => {
    // The point of the fallback. Inventing a cause for an error nobody has
    // seen before is how a user ends up debugging the wrong thing.
    expect(classifyUpdateError(new Error('something nobody has seen before'))).toBe('unknown')
    expect(classifyUpdateError('a bare string')).toBe('unknown')
    expect(classifyUpdateError(null)).toBe('unknown')
    expect(classifyUpdateError(undefined)).toBe('unknown')
  })

  it('matches regardless of case', () => {
    expect(classifyUpdateError(new Error('SIGNATURE ERROR'))).toBe('signature')
  })
})

describe('describeFailure', () => {
  it('says what a signature failure means, plainly', () => {
    const text = describeFailure('signature')
    expect(text).toMatch(/signature/i)
    // It must not read like a network hiccup. This is the one a person should
    // not shrug at.
    expect(text).toMatch(/not install|refus/i)
  })

  it('does not treat a missing channel as a fault', () => {
    expect(describeFailure('no-channel')).toMatch(/not set up|no update channel/i)
  })

  it('hands back the original message for an unknown failure', () => {
    // Shown rather than swallowed, because a sentence invented for an
    // unrecognised error sends somebody looking in the wrong place.
    expect(describeFailure('unknown', 'ECONNRESET at line 4')).toContain('ECONNRESET at line 4')
  })

  it('still says something useful when an unknown failure carries no detail', () => {
    expect(describeFailure('unknown')).toBeTruthy()
    expect(describeFailure('unknown')).not.toContain('undefined')
  })
})

describe('downloadProgress', () => {
  it('reports a percentage when the length is known', () => {
    expect(downloadProgress(0, 100)).toEqual({ percent: 0, known: true })
    expect(downloadProgress(57, 100)).toEqual({ percent: 57, known: true })
    expect(downloadProgress(100, 100)).toEqual({ percent: 100, known: true })
  })

  it('reports unknown rather than zero when the server sent no length', () => {
    // A bar parked at 0% says "stuck". A bar that says it does not know says
    // what is true, and the byte count beside it still moves.
    expect(downloadProgress(2_000_000, null)).toEqual({ percent: null, known: false })
    expect(downloadProgress(2_000_000, 0)).toEqual({ percent: null, known: false })
  })

  it('never exceeds 100, even if more bytes arrive than were promised', () => {
    expect(downloadProgress(120, 100).percent).toBe(100)
  })

  it('never goes negative', () => {
    expect(downloadProgress(-5, 100).percent).toBe(0)
  })
})

describe('restartWarning', () => {
  it('says nothing when nothing is running', () => {
    // No warning to give, so none is given. A standing caution that applies
    // half the time teaches people to skip it the other half.
    expect(restartWarning(0)).toBeNull()
  })

  it('names the count when transfers are active', () => {
    expect(restartWarning(1)).toMatch(/1 active transfer\b/)
    expect(restartWarning(4)).toMatch(/4 active transfers\b/)
  })

  it('says transfers resume, because they do', () => {
    // The daemon restarts and picks its torrents back up. Without this the
    // warning reads as "you will lose your downloads", which is not true and
    // would stop people updating at all.
    expect(restartWarning(2)).toMatch(/resume/i)
  })
})
