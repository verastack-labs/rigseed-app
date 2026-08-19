/**
 * Reading a `.torrent` in the browser.
 *
 * The Web API cannot help here. `torrents/add` takes the file and answers
 * "Ok."; there is no endpoint that describes a torrent before it is added, and
 * `torrents/files` needs a hash that does not exist yet. So the file list, the
 * total size and the "5.56 GB needed" figure in the Add Torrent modal all have
 * to come from parsing the file the user just picked.
 *
 * Bencode is four types and no ambiguity, which is why this is eighty lines
 * rather than a dependency.
 */

export interface TorrentEntry {
  /** Full path inside the torrent, joined with `/`. */
  path: string
  size: number
}

export interface TorrentMeta {
  name: string
  totalSize: number
  /** A single-file torrent yields one entry named after the torrent itself. */
  entries: TorrentEntry[]
  /**
   * The `info` value's raw bytes, for hashing.
   *
   * A view into the original buffer, not a copy.
   */
  infoBytes: Uint8Array
}

export class TorrentParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TorrentParseError'
  }
}

type Bencode = number | Uint8Array | Bencode[] | BencodeDict
interface BencodeDict {
  [key: string]: Bencode
}

const ZERO = 0x30
const NINE = 0x39
const COLON = 0x3a
const END = 0x65 // 'e'
const INT = 0x69 // 'i'
const LIST = 0x6c // 'l'
const DICT = 0x64 // 'd'
const MINUS = 0x2d

/**
 * A cursor rather than slicing as we go.
 *
 * A torrent's piece hashes are routinely tens of megabytes of binary, and
 * every `subarray` on the way past them would copy. The index moves; the
 * buffer does not.
 */
class Reader {
  at = 0
  /**
   * Byte span of each value in the root dictionary.
   *
   * Recorded because the info hash is the SHA-1 of the `info` value exactly as
   * it appeared in the file. Re-encoding the parsed object would produce a
   * different hash the moment a key order or an integer form differed, and
   * bencode is only canonical if the producer made it so.
   */
  spans: Record<string, [number, number]> = {}
  private depth = 0

  constructor(readonly bytes: Uint8Array) {}

  byte(): number {
    if (this.at >= this.bytes.length) throw new TorrentParseError('truncated')
    return this.bytes[this.at]!
  }

  value(): Bencode {
    const b = this.byte()
    if (b === INT) return this.integer()
    if (b === LIST) return this.list()
    if (b === DICT) return this.dict()
    if (b >= ZERO && b <= NINE) return this.string()
    throw new TorrentParseError(`unexpected byte 0x${b.toString(16)} at ${this.at}`)
  }

  integer(): number {
    this.at += 1
    let out = ''
    while (this.byte() !== END) {
      const b = this.byte()
      if (b !== MINUS && (b < ZERO || b > NINE)) throw new TorrentParseError('bad integer')
      out += String.fromCharCode(b)
      this.at += 1
    }
    this.at += 1
    const n = Number(out)
    if (!Number.isFinite(n)) throw new TorrentParseError('bad integer')
    return n
  }

  string(): Uint8Array {
    let digits = ''
    while (this.byte() !== COLON) {
      digits += String.fromCharCode(this.byte())
      this.at += 1
    }
    this.at += 1
    const length = Number(digits)
    if (!Number.isSafeInteger(length) || length < 0) throw new TorrentParseError('bad string')
    const end = this.at + length
    if (end > this.bytes.length) throw new TorrentParseError('truncated')
    const out = this.bytes.subarray(this.at, end)
    this.at = end
    return out
  }

  list(): Bencode[] {
    this.at += 1
    const out: Bencode[] = []
    while (this.byte() !== END) out.push(this.value())
    this.at += 1
    return out
  }

  dict(): BencodeDict {
    this.at += 1
    this.depth += 1
    const out: BencodeDict = {}
    while (this.byte() !== END) {
      const key = text(this.string())
      const start = this.at
      out[key] = this.value()
      // Only the root's own keys. A nested dict with an `info` key of its own
      // would otherwise overwrite the span that matters.
      if (this.depth === 1) this.spans[key] = [start, this.at]
    }
    this.depth -= 1
    this.at += 1
    return out
  }
}

const decoder = new TextDecoder('utf-8')
const text = (bytes: Uint8Array): string => decoder.decode(bytes)

function isDict(value: Bencode | undefined): value is BencodeDict {
  return (
    typeof value === 'object' &&
    value !== null &&
    !ArrayBuffer.isView(value) &&
    !Array.isArray(value)
  )
}

/**
 * Name, size and file list from a `.torrent`.
 *
 * Throws rather than returning a partial result. A torrent whose `info`
 * dictionary cannot be read is not one the daemon will accept either, and
 * saying so at the point of picking the file is better than adding it and
 * watching it fail.
 */
export function parseTorrent(data: ArrayBuffer | Uint8Array): TorrentMeta {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
  if (bytes.length === 0) throw new TorrentParseError('empty file')

  const reader = new Reader(bytes)
  const root = reader.value()
  if (!isDict(root)) throw new TorrentParseError('not a torrent: root is not a dictionary')

  const info = root['info']
  if (!isDict(info)) throw new TorrentParseError('not a torrent: no info dictionary')

  const span = reader.spans['info']!
  const infoBytes = bytes.subarray(span[0], span[1])

  const nameBytes = info['name']
  if (!ArrayBuffer.isView(nameBytes)) throw new TorrentParseError('not a torrent: no name')
  const name = text(nameBytes as Uint8Array)

  const files = info['files']

  // Single file. `name` is the filename rather than a containing directory,
  // which is the one case where the torrent name and the only entry's path
  // are the same string.
  if (!Array.isArray(files)) {
    const length = info['length']
    if (typeof length !== 'number') throw new TorrentParseError('not a torrent: no length')
    return { name, totalSize: length, entries: [{ path: name, size: length }], infoBytes }
  }

  const entries: TorrentEntry[] = []
  for (const file of files) {
    if (!isDict(file)) continue
    const size = file['length']
    const segments = file['path']
    if (typeof size !== 'number' || !Array.isArray(segments)) continue
    const path = segments
      .filter((s): s is Uint8Array => ArrayBuffer.isView(s))
      .map(text)
      .join('/')
    if (path) entries.push({ path, size })
  }

  if (entries.length === 0) throw new TorrentParseError('not a torrent: no readable files')

  return { name, totalSize: entries.reduce((sum, e) => sum + e.size, 0), entries, infoBytes }
}

/** Convenience for the picker, which hands over a `File`. */
export async function readTorrentFile(file: File): Promise<TorrentMeta> {
  return parseTorrent(await file.arrayBuffer())
}

/**
 * The v1 info hash: SHA-1 of the `info` value, lowercase hex.
 *
 * Needed because file exclusions cannot be sent with the add. `torrents/add`
 * has no per-file parameter, so the priorities have to go in a follow-up
 * `torrents/filePrio`, and that takes a hash. Computing it here means the
 * follow-up can be made immediately rather than by polling the list and
 * guessing which new torrent was ours by name.
 *
 * v1 only. A v2-only torrent is identified by a SHA-256 hash instead, and
 * would need the same treatment against `meta version 2`; hybrid torrents
 * carry both and qBittorrent reports the v1 hash, which is this one.
 */
export async function infoHash(meta: TorrentMeta): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-1', meta.infoBytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
