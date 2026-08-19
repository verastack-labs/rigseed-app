import { describe, expect, it } from 'vitest'

import { TorrentParseError, parseTorrent, readTorrentFile } from '@/utils/torrent-file'

const enc = new TextEncoder()

/**
 * Bencodes a plain JS value, so the fixtures read as the thing they encode.
 *
 * The return is Uint8Array<ArrayBuffer> rather than plain Uint8Array so it can
 * be handed to the File constructor, which will not take a view over a buffer
 * that might be shared.
 */
function bencode(value: unknown): Uint8Array<ArrayBuffer> {
  const parts: Uint8Array[] = []

  const walk = (v: unknown) => {
    if (typeof v === 'number') {
      parts.push(enc.encode(`i${v}e`))
    } else if (typeof v === 'string') {
      const bytes = enc.encode(v)
      parts.push(enc.encode(`${bytes.length}:`), bytes)
    } else if (v instanceof Uint8Array) {
      parts.push(enc.encode(`${v.length}:`), v)
    } else if (Array.isArray(v)) {
      parts.push(enc.encode('l'))
      v.forEach(walk)
      parts.push(enc.encode('e'))
    } else if (v && typeof v === 'object') {
      parts.push(enc.encode('d'))
      for (const [k, item] of Object.entries(v)) {
        const key = enc.encode(k)
        parts.push(enc.encode(`${key.length}:`), key)
        walk(item)
      }
      parts.push(enc.encode('e'))
    }
  }

  walk(value)
  const total = parts.reduce((n, p) => n + p.length, 0)
  const out = new Uint8Array(new ArrayBuffer(total))
  let at = 0
  for (const p of parts) {
    out.set(p, at)
    at += p.length
  }
  return out
}

describe('parseTorrent', () => {
  it('reads a multi-file torrent', () => {
    const meta = parseTorrent(
      bencode({
        announce: 'http://tracker.example/announce',
        info: {
          name: 'ubuntu-24.04.2',
          'piece length': 262144,
          files: [
            { length: 5_600_000_000, path: ['ubuntu-24.04.2-desktop-amd64.iso'] },
            { length: 308, path: ['SHA256SUMS'] },
            { length: 142_000_000, path: ['extras', 'screenshots.tar.gz'] },
          ],
        },
      }),
    )

    expect(meta.name).toBe('ubuntu-24.04.2')
    expect(meta.entries).toEqual([
      { path: 'ubuntu-24.04.2-desktop-amd64.iso', size: 5_600_000_000 },
      { path: 'SHA256SUMS', size: 308 },
      // Nested paths arrive as segments and are joined, which is what the
      // Contents table indents on.
      { path: 'extras/screenshots.tar.gz', size: 142_000_000 },
    ])
    expect(meta.totalSize).toBe(5_600_000_000 + 308 + 142_000_000)
  })

  it('treats a single-file torrent as one entry named after itself', () => {
    const meta = parseTorrent(
      bencode({ info: { name: 'debian-12.9.0-amd64-netinst.iso', length: 660_000_000 } }),
    )

    expect(meta.entries).toEqual([{ path: 'debian-12.9.0-amd64-netinst.iso', size: 660_000_000 }])
    expect(meta.totalSize).toBe(660_000_000)
  })

  it('walks past binary piece hashes without choking on them', () => {
    // Pieces are raw SHA-1s, so they contain bytes that are not valid UTF-8
    // and, more importantly here, bytes like 0x65 that mean "end" in bencode
    // if a parser is counting delimiters instead of lengths.
    const pieces = new Uint8Array(20 * 500)
    for (let i = 0; i < pieces.length; i += 1) pieces[i] = i % 256

    const meta = parseTorrent(
      bencode({ info: { name: 'binary', length: 42, pieces }, comment: 'after the pieces' }),
    )
    expect(meta.name).toBe('binary')
  })

  it('handles non-ASCII names', () => {
    const meta = parseTorrent(bencode({ info: { name: '日本語のファイル', length: 10 } }))
    expect(meta.name).toBe('日本語のファイル')
  })

  it('rejects anything that is not a torrent, rather than half-reading it', () => {
    // Better to say so when the file is picked than to add it and watch the
    // daemon reject it a second later.
    expect(() => parseTorrent(new Uint8Array(0))).toThrow(TorrentParseError)
    expect(() => parseTorrent(enc.encode('this is a text file'))).toThrow(TorrentParseError)
    expect(() => parseTorrent(bencode({ announce: 'x' }))).toThrow(/no info dictionary/)
    expect(() => parseTorrent(bencode({ info: { length: 5 } }))).toThrow(/no name/)
    expect(() => parseTorrent(bencode({ info: { name: 'x' } }))).toThrow(/no length/)
  })

  it('rejects a truncated file', () => {
    const full = bencode({ info: { name: 'ubuntu', length: 100 } })
    expect(() => parseTorrent(full.subarray(0, full.length - 4))).toThrow(TorrentParseError)
  })

  it('rejects a files list with nothing readable in it', () => {
    expect(() => parseTorrent(bencode({ info: { name: 'x', files: [{ length: 1 }] } }))).toThrow(
      /no readable files/,
    )
  })

  it('reads from a File, which is what the picker hands over', async () => {
    const bytes = bencode({ info: { name: 'sintel', length: 129_000_000 } })
    const meta = await readTorrentFile(new File([bytes], 'sintel.torrent'))
    expect(meta).toEqual({
      name: 'sintel',
      totalSize: 129_000_000,
      entries: [{ path: 'sintel', size: 129_000_000 }],
    })
  })
})
