import { describe, expect, it } from 'vitest'

import {
  formatBytes,
  formatEta,
  formatEtaPlain,
  formatPercent,
  formatRatio,
  formatSpeed,
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

describe('stateTone', () => {
  it('never gives paused or stalled the accent', () => {
    // The design rule: attention is spent on live things only.
    expect(stateTone('pausedDL')).toBe('muted')
    expect(stateTone('pausedUP')).toBe('muted')
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
