import { describe, expect, it } from 'vitest'

import {
  changed,
  describeEffective,
  draftFrom,
  humanMinutes,
  modeOf,
  toWire,
  wireValue,
} from '@/features/transfers/share-limits'
import type { Torrent } from '@/types/qbittorrent'

const torrent = (over: Partial<Torrent> = {}) =>
  ({
    hash: 'abc',
    name: 'ubuntu-24.04.2-desktop-amd64.iso',
    ratio_limit: -2,
    max_ratio: -1,
    seeding_time_limit: -2,
    max_seeding_time: -1,
    inactive_seeding_time_limit: -2,
    max_inactive_seeding_time: -1,
    share_limit_action: 'Default',
    ...over,
  }) as Torrent

describe('reading the wire sentinels', () => {
  it('keeps global and unlimited apart', () => {
    // The distinction the whole module exists for. A torrent following a
    // global limit changes behaviour when Settings changes; one set to
    // unlimited does not, and any "is it -1?" check reads them as the same.
    expect(modeOf(-2)).toBe('global')
    expect(modeOf(-1)).toBe('unlimited')
    expect(modeOf(2.5)).toBe('custom')
  })

  it('treats zero as a real limit rather than a sentinel', () => {
    // Only -1 and -2 are sentinels. A ratio limit of 0 is a torrent told to
    // stop the instant it has uploaded anything, which is odd but is not the
    // same as unlimited.
    expect(modeOf(0)).toBe('custom')
  })
})

describe('writing the wire sentinels', () => {
  it('sends the sentinel for each mode', () => {
    expect(wireValue('global', 5)).toBe(-2)
    expect(wireValue('unlimited', 5)).toBe(-1)
    expect(wireValue('custom', 5)).toBe(5)
  })

  it('falls back to global, not unlimited, on an empty custom box', () => {
    // The conservative reading. "No limit" is a decision to seed forever and
    // an empty box is not a decision, so an unfinished edit must not commit
    // the torrent to never stopping.
    expect(wireValue('custom', Number(''))).toBe(-2)
    expect(wireValue('custom', Number('nonsense'))).toBe(-2)
    expect(wireValue('custom', -4)).toBe(-2)
  })
})

describe('draftFrom', () => {
  it('reads the setting, never the resolved value', () => {
    // Filling the inputs from max_ratio would turn a torrent that follows the
    // global limit into one explicitly set to unlimited the moment anything
    // was saved. The two fields disagree here exactly as they do on a real
    // daemon with its global limit switched off.
    const draft = draftFrom(torrent({ ratio_limit: -2, max_ratio: -1 }))
    expect(draft.ratioMode).toBe('global')
    expect(draft.ratio).toBe('')
  })

  it('carries a custom limit into the box', () => {
    const draft = draftFrom(torrent({ ratio_limit: 2.5, max_ratio: 2.5, seeding_time_limit: 1440 }))
    expect(draft.ratioMode).toBe('custom')
    expect(draft.ratio).toBe('2.5')
    expect(draft.seedingMinutes).toBe('1440')
  })

  it('defaults the action on a daemon too old to send one', () => {
    // 5.0 added share_limit_action. Older daemons omit it, and the parameter
    // is still required on the way out.
    const old = torrent()
    delete (old as { share_limit_action?: unknown }).share_limit_action
    expect(draftFrom(old).action).toBe('Default')
  })
})

describe('toWire', () => {
  it('always produces all four parameters', () => {
    // The endpoint overwrites every limit it is handed, so a partial call
    // silently resets whatever it omits.
    expect(Object.keys(toWire(draftFrom(torrent()))).sort()).toEqual([
      'inactiveSeedingTimeLimit',
      'ratioLimit',
      'seedingTimeLimit',
      'shareLimitAction',
    ])
  })

  it('round-trips a torrent unchanged', () => {
    const one = torrent({ ratio_limit: 3, seeding_time_limit: 90, share_limit_action: 'Stop' })
    expect(toWire(draftFrom(one))).toEqual({
      ratioLimit: 3,
      seedingTimeLimit: 90,
      inactiveSeedingTimeLimit: -2,
      shareLimitAction: 'Stop',
    })
  })
})

describe('changed', () => {
  it('is false for a draft nobody has touched', () => {
    // The dialog writes on every change, and a write that changes nothing can
    // still fail and report a failure for something the user did not do.
    const one = torrent({ ratio_limit: 3 })
    expect(changed(draftFrom(one), one)).toBe(false)
  })

  it('sees an emptied custom box as no change when it was already global', () => {
    const one = torrent()
    const draft = { ...draftFrom(one), ratioMode: 'custom' as const, ratio: '' }
    expect(changed(draft, one)).toBe(false)
  })

  it('sees the switch from global to unlimited', () => {
    // Identical resolved values on a daemon with global limits off, and a
    // genuinely different setting. Comparing max_ratio would miss it.
    const one = torrent({ ratio_limit: -2, max_ratio: -1 })
    expect(changed({ ...draftFrom(one), ratioMode: 'unlimited' }, one)).toBe(true)
  })

  it('sees a changed action on its own', () => {
    const one = torrent()
    expect(changed({ ...draftFrom(one), action: 'Remove' }, one)).toBe(true)
  })
})

describe('describeEffective', () => {
  it('says nothing will stop it when the resolved limit is off', () => {
    // The reason both fields exist. A torrent set to follow a global limit
    // that is switched off is not limited at all, and saying "global limit"
    // would leave somebody believing a cap is in place.
    expect(describeEffective(-1, 'ratio')).toBe('nothing will stop it')
    expect(describeEffective(undefined, 'minutes')).toBe('nothing will stop it')
  })

  it('names the limit that will actually apply', () => {
    expect(describeEffective(2.5, 'ratio')).toBe('stops at ratio 2.5')
    expect(describeEffective(1440, 'minutes')).toBe('stops after 1 d')
  })
})

describe('humanMinutes', () => {
  it('keeps small values in minutes', () => {
    expect(humanMinutes(45)).toBe('45 min')
  })

  it('turns hours and days into their own units', () => {
    expect(humanMinutes(90)).toBe('1.5 h')
    expect(humanMinutes(1440)).toBe('1 d')
    expect(humanMinutes(4320)).toBe('3 d')
  })

  it('does not leave a trailing .0', () => {
    expect(humanMinutes(120)).toBe('2 h')
  })
})
