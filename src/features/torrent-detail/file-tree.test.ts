import { describe, expect, it } from 'vitest'

import {
  buildFileTree,
  defaultExpanded,
  flattenTree,
  type FolderNode,
  type TreeNode,
} from '@/features/torrent-detail/file-tree'
import type { TorrentFile } from '@/types/qbittorrent'

let nextIndex = 0
const file = (name: string, size = 100, progress = 1): TorrentFile => ({
  index: nextIndex++,
  name,
  size,
  progress,
  priority: 1,
  piece_range: [0, 1],
})

const names = (nodes: readonly TreeNode[]) => nodes.map((n) => n.name)
const folder = (nodes: readonly TreeNode[], name: string) =>
  nodes.find((n) => n.kind === 'folder' && n.name === name) as FolderNode

describe('buildFileTree', () => {
  it('turns a flat list of paths into nested folders', () => {
    const tree = buildFileTree([file('Ubuntu/docs/readme.txt'), file('Ubuntu/ubuntu.iso')])

    expect(names(tree)).toEqual(['Ubuntu'])
    const ubuntu = folder(tree, 'Ubuntu')
    expect(names(ubuntu.children)).toEqual(['docs', 'ubuntu.iso'])
    expect(names(folder(ubuntu.children, 'docs').children)).toEqual(['readme.txt'])
  })

  it('puts folders above files, whatever order they arrived in', () => {
    // The API returns them in torrent order, which is neither alphabetical nor
    // grouped, so the old list interleaved directories and loose files.
    const tree = buildFileTree([file('zeta.txt'), file('alpha/one.txt'), file('beta.txt')])
    expect(names(tree)).toEqual(['alpha', 'beta.txt', 'zeta.txt'])
  })

  it('orders names the way a person counts', () => {
    const tree = buildFileTree([file('Part 10.mkv'), file('Part 2.mkv'), file('Part 1.mkv')])
    expect(names(tree)).toEqual(['Part 1.mkv', 'Part 2.mkv', 'Part 10.mkv'])
  })

  it('adds up the size of everything beneath a folder, however deep', () => {
    const tree = buildFileTree([
      file('show/s1/e1.mkv', 300),
      file('show/s1/e2.mkv', 200),
      file('show/cover.jpg', 500),
    ])
    const show = folder(tree, 'show')
    expect(show.size).toBe(1000)
    expect(folder(show.children, 's1').size).toBe(500)
  })

  it('weights a folder progress by bytes, not by file count', () => {
    // Nine finished tiny files next to one huge unfinished one is not 90%
    // done, and a folder bar that says so is worse than no bar.
    const tree = buildFileTree([file('d/big.bin', 900, 0), file('d/small.txt', 100, 1)])
    expect(folder(tree, 'd').progress).toBeCloseTo(0.1)
  })

  it('reports zero rather than NaN for a folder of empty files', () => {
    const tree = buildFileTree([file('d/a.txt', 0, 0), file('d/b.txt', 0, 0)])
    expect(folder(tree, 'd').progress).toBe(0)
  })

  it('collects every descendant file so a collapsed folder stays operable', () => {
    const tree = buildFileTree([file('a/b/c/deep.bin'), file('a/top.bin')])
    expect(folder(tree, 'a').files).toHaveLength(2)
  })

  it('keeps a single-file torrent as a single file, not a folder', () => {
    const tree = buildFileTree([file('ubuntu.iso')])
    expect(tree).toHaveLength(1)
    expect(tree[0]!.kind).toBe('file')
  })

  it('ignores empty segments rather than minting a nameless folder', () => {
    // A leading or doubled separator used to produce a blank row that could
    // never be explained to anyone looking at it.
    const tree = buildFileTree([file('/lead/a.txt'), file('double//b.txt')])
    expect(names(tree)).toEqual(['double', 'lead'])
    expect(names(folder(tree, 'double').children)).toEqual(['b.txt'])
  })
})

describe('flattenTree', () => {
  const tree = buildFileTree([file('Ubuntu/docs/readme.txt'), file('Ubuntu/ubuntu.iso')])

  it('shows only the top level when nothing is expanded', () => {
    expect(flattenTree(tree, new Set()).map((r) => r.node.name)).toEqual(['Ubuntu'])
  })

  it('reveals one level per expanded folder', () => {
    const rows = flattenTree(tree, new Set(['Ubuntu']))
    expect(rows.map((r) => r.node.name)).toEqual(['Ubuntu', 'docs', 'ubuntu.iso'])
    // Still shut, so its contents are absent rather than hidden.
    expect(rows.map((r) => r.node.name)).not.toContain('readme.txt')
  })

  it('reveals a nested folder only once its parent is open too', () => {
    // Expanding a child whose parent is shut must not teleport rows to the top.
    expect(flattenTree(tree, new Set(['Ubuntu/docs'])).map((r) => r.node.name)).toEqual(['Ubuntu'])
    expect(
      flattenTree(tree, new Set(['Ubuntu', 'Ubuntu/docs'])).map((r) => r.node.name),
    ).toEqual(['Ubuntu', 'docs', 'readme.txt', 'ubuntu.iso'])
  })

  it('reports the depth each row sits at, for the indent', () => {
    // Ubuntu, then docs, then its file, then back out to Ubuntu's own file.
    const rows = flattenTree(tree, new Set(['Ubuntu', 'Ubuntu/docs']))
    expect(rows.map((r) => r.node.name)).toEqual(['Ubuntu', 'docs', 'readme.txt', 'ubuntu.iso'])
    expect(rows.map((r) => r.depth)).toEqual([0, 1, 2, 1])
  })
})

describe('defaultExpanded', () => {
  it('opens the wrapper folder a torrent is named after', () => {
    // Otherwise the tab opens on exactly one row, repeating the title above it.
    const tree = buildFileTree([file('Ubuntu/a.iso'), file('Ubuntu/b.iso')])
    expect([...defaultExpanded(tree)]).toEqual(['Ubuntu'])
  })

  it('follows a chain of wrappers to the first real branch', () => {
    const tree = buildFileTree([file('a/b/one.txt'), file('a/b/two.txt')])
    expect([...defaultExpanded(tree)]).toEqual(['a', 'a/b'])
  })

  it('stops where the tree genuinely branches', () => {
    const tree = buildFileTree([file('a/one.txt'), file('b/two.txt')])
    expect([...defaultExpanded(tree)]).toEqual([])
  })

  it('stops at a folder that sits beside a loose file', () => {
    const tree = buildFileTree([file('Ubuntu/a.iso'), file('readme.txt')])
    expect([...defaultExpanded(tree)]).toEqual([])
  })

  it('opens nothing for a single-file torrent', () => {
    expect([...defaultExpanded(buildFileTree([file('ubuntu.iso')]))]).toEqual([])
  })
})
