import { describe, expect, it } from 'vitest'

import { fileNameFor } from '@/services/torrent-file'

describe('fileNameFor', () => {
  it('keeps hyphens and spaces, which are legal everywhere', () => {
    // A first version swept both into its unsafe class and turned this exact
    // name into "ubuntu 24.04.2 desktop amd64". A silently mangled name is
    // worse than a rejected one, because nothing says it happened.
    expect(fileNameFor('ubuntu-24.04.2-desktop-amd64.iso')).toBe(
      'ubuntu-24.04.2-desktop-amd64.iso.torrent',
    )
  })

  it('replaces what a path genuinely cannot hold', () => {
    // Real torrent names carry colons and slashes constantly, and a save
    // dialog handed one rejects it in a way that reads as rigseed being
    // broken rather than as a name that cannot be a path.
    expect(fileNameFor('Some Show: S01/E02 <1080p>')).toBe('Some Show S01 E02 1080p.torrent')
  })

  it('collapses the gaps a replacement leaves behind', () => {
    expect(fileNameFor('a//b')).toBe('a b.torrent')
  })

  it('does not end on a dot or a space', () => {
    // Both are legal in the string and neither is legal at the end of a
    // Windows file name.
    expect(fileNameFor('trailing dots...')).toBe('trailing dots.torrent')
    expect(fileNameFor('trailing space   ')).toBe('trailing space.torrent')
  })

  it('still offers a name when nothing survives', () => {
    // A dialog opening with an empty name field is worse than a generic one.
    expect(fileNameFor('///')).toBe('torrent.torrent')
    expect(fileNameFor('')).toBe('torrent.torrent')
  })

  it('keeps the result short enough to be a path component', () => {
    const long = 'x'.repeat(400)
    const out = fileNameFor(long)
    expect(out.length).toBeLessThanOrEqual(128)
    expect(out.endsWith('.torrent')).toBe(true)
  })
})
