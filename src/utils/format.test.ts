import { describe, expect, it } from 'vitest'

import {
  formatAvailability,
  formatBytes,
  formatDuration,
  formatEta,
  formatEtaPlain,
  formatPercent,
  formatRatio,
  formatSince,
  formatSpeed,
  isPaused,
  STATE_LABEL,
  STATE_PLAIN,
  stateTone,
} from '@/utils/format'
import { ETA_INFINITE } from '@/types/qbittorrent'

describe('formatBytes', () => {
  it('never shows fractional bytes', () => {
    expect(formatBytes(512)).toBe('512 B')
  })

  it('steps through the units', () => {
    expect(formatBytes(5_700_000_000)).toBe('5.70 GB')
    expect(formatBytes(1_500_000)).toBe('1.50 MB')
  })

  it('drops a decimal once the number is wide', () => {
    expect(formatBytes(250_000_000_000)).toBe('250.0 GB')
  })

  it('treats decimals as a ceiling, not a target', () => {
    // The large-number rule used to override an explicit request for none, so
    // the save-path hint could not say "412 GB free" without saying "412.0".
    expect(formatBytes(412_000_000_000, 0)).toBe('412 GB')
    expect(formatBytes(5_700_000_000, 1)).toBe('5.7 GB')
    // And the default is unchanged either way.
    expect(formatBytes(412_000_000_000)).toBe('412.0 GB')
  })

  it('survives nonsense rather than printing NaN', () => {
    expect(formatBytes(Number.NaN)).toBe('0 B')
    expect(formatBytes(-1)).toBe('0 B')
  })
})

describe('formatEta', () => {
  it('renders the infinity sentinel as a symbol, not a number', () => {
    expect(formatEta(ETA_INFINITE)).toBe('∞')
  })

  it('drops to the two largest useful units', () => {
    expect(formatEta(45)).toBe('45s')
    expect(formatEta(252)).toBe('4m 12s')
    expect(formatEta(7200)).toBe('2h 0m')
    expect(formatEta(200_000)).toBe('2d 7h')
  })
})

describe('formatEtaPlain', () => {
  it('spells it out for the Easy layout', () => {
    expect(formatEtaPlain(252)).toBe('4 minutes left')
    expect(formatEtaPlain(30)).toBe('less than a minute left')
    expect(formatEtaPlain(7200)).toBe('2 hours left')
  })

  it('gets the singular right', () => {
    expect(formatEtaPlain(60)).toBe('1 minute left')
    expect(formatEtaPlain(3600)).toBe('1 hour left')
  })

  it('says there is no estimate rather than showing a symbol', () => {
    // The Easy layout has no room for notation a newcomer has to decode.
    expect(formatEtaPlain(ETA_INFINITE)).toBe('no estimate')
  })
})

describe('formatRatio and formatPercent', () => {
  it('always shows two decimals for a ratio', () => {
    expect(formatRatio(1.4)).toBe('1.40')
    expect(formatRatio(0)).toBe('0.00')
  })

  it('drops the decimal at the ends of a percentage', () => {
    expect(formatPercent(1)).toBe('100%')
    expect(formatPercent(0)).toBe('0%')
    expect(formatPercent(0.647)).toBe('64.7%')
  })

  it('clamps a progress outside 0 to 1', () => {
    expect(formatPercent(1.5)).toBe('100%')
    expect(formatPercent(-2)).toBe('0%')
  })
})

describe('formatSpeed', () => {
  it('reads zero as zero rather than blank', () => {
    expect(formatSpeed(0)).toBe('0 B/s')
  })

  it('appends per second', () => {
    expect(formatSpeed(12_400_000)).toBe('12.4 MB/s')
  })
})

describe('isPaused', () => {
  it('has a word for a stopped torrent in both label maps', () => {
    // A state with no entry renders a status dot with nothing beside it,
    // which the design rules forbid outright: never encode state by colour
    // alone. That is exactly what a real 5.x daemon produced.
    expect(STATE_LABEL.stoppedUP).toBe('paused')
    expect(STATE_PLAIN.stoppedDL).toBe('paused')
  })

  it('knows both names for the same state', () => {
    // 5.x renamed paused* to stopped* alongside the endpoint rename. Matching
    // only the old spelling made every stopped torrent on a modern daemon
    // read as running, with no word beside its dot and no muted tone.
    expect(isPaused('pausedDL')).toBe(true)
    expect(isPaused('pausedUP')).toBe(true)
    expect(isPaused('stoppedDL')).toBe(true)
    expect(isPaused('stoppedUP')).toBe(true)
  })

  it('does not catch anything else', () => {
    expect(isPaused('stalledUP')).toBe(false)
    expect(isPaused('downloading')).toBe(false)
    expect(isPaused('queuedDL')).toBe(false)
  })
})

describe('STATE_LABEL', () => {
  it('does not give two states the same word and different colours', () => {
    // uploading and stalledUP both read "seeding", separated only by the dot:
    // accent for one, grey for the other. That reads as a paused torrent to
    // anybody who has not learned the palette, and it is what the status
    // rules exist to prevent.
    expect(STATE_LABEL.uploading).toBe('seeding')
    expect(STATE_LABEL.stalledUP).toBe('idle')
    expect(STATE_LABEL.stalledUP).not.toBe(STATE_LABEL.uploading)
  })

  it('does not call an idle seed stalled either', () => {
    // Wrong in the other direction. Nothing is wrong with a seed nobody
    // wants right now, and "stalled" is what a broken download says.
    expect(STATE_LABEL.stalledUP).not.toBe(STATE_LABEL.stalledDL)
  })
})

describe('stateTone', () => {
  it('never gives paused or stalled the accent', () => {
    // The design rule: attention is spent on live things only.
    expect(stateTone('pausedDL')).toBe('muted')
    expect(stateTone('pausedUP')).toBe('muted')
    expect(stateTone('stoppedDL')).toBe('muted')
    expect(stateTone('stoppedUP')).toBe('muted')
    expect(stateTone('stalledDL')).toBe('muted')
  })

  it('gives seeding the secondary accent', () => {
    expect(stateTone('uploading')).toBe('accent2')
    expect(stateTone('stalledUP')).toBe('muted')
  })

  it('gives downloading the primary accent', () => {
    expect(stateTone('downloading')).toBe('accent')
  })

  it('flags real failures as danger', () => {
    expect(stateTone('error')).toBe('danger')
    expect(stateTone('missingFiles')).toBe('danger')
  })
})

describe('formatDuration', () => {
  it('says zero rather than infinity for a torrent just added', () => {
    // formatEta looks close enough to reuse and is not: it treats 0 as
    // unknowable and prints an infinity sign. Elapsed time of zero is a real
    // answer.
    expect(formatDuration(0)).toBe('0m')
  })

  it('does not give up past the ETA infinity sentinel', () => {
    // 8640000 is where formatEta stops and prints an infinity sign. A torrent
    // seeding for over a hundred days has been active for a sayable number.
    expect(formatDuration(8_640_000)).toBe('100d 0h')
    expect(formatDuration(12_000_000)).toBe('138d 21h')
  })

  it('drops to the two largest units that matter', () => {
    expect(formatDuration(45)).toBe('0m')
    expect(formatDuration(600)).toBe('10m')
    expect(formatDuration(3_900)).toBe('1h 5m')
    expect(formatDuration(348_980)).toBe('4d 0h')
  })
})

describe('formatSince', () => {
  const now = 1_780_000_000_000

  it('says never for the zero the daemon sends', () => {
    // seen_complete is 0 for a torrent nobody has ever finished, which is a
    // different answer from "a long time ago" and must not render as 1970.
    expect(formatSince(0, now)).toBe('never')
  })

  it('rounds a future timestamp to now rather than counting up', () => {
    // The daemon's clock can sit slightly ahead of ours, and "in 3 seconds"
    // reads as a bug.
    expect(formatSince(1_780_000_030, now)).toBe('just now')
  })

  it('climbs through the units', () => {
    expect(formatSince(1_780_000_000 - 30, now)).toBe('just now')
    expect(formatSince(1_780_000_000 - 600, now)).toBe('10m ago')
    expect(formatSince(1_780_000_000 - 7_200, now)).toBe('2h ago')
    expect(formatSince(1_780_000_000 - 172_800, now)).toBe('2d ago')
  })
})

describe('formatAvailability', () => {
  it('declines to print the -1 a seeding torrent reports', () => {
    // Not 0, which would read as "nobody has any of it" and is the opposite of
    // what a seeding torrent means.
    expect(formatAvailability(-1)).toBe('—')
  })

  it('keeps two decimals, where below 1 is the reading that matters', () => {
    expect(formatAvailability(0.873)).toBe('0.87')
    expect(formatAvailability(1.874)).toBe('1.87')
  })
})
