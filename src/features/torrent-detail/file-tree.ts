import type { TorrentFile } from '@/types/qbittorrent'

/**
 * A torrent's files, as the tree they always were.
 *
 * `torrents/files` returns a flat list whose `name` is a torrent-relative
 * path. The tab rendered that list verbatim and faked the hierarchy with
 * `paddingLeft: depth * 14`, which meant there were no folders: a torrent with
 * two hundred files in forty directories printed two hundred rows, every one
 * of them visible, every one of them wearing a folder icon whether it was a
 * folder or not. Nothing could be collapsed because there was nothing to
 * collapse.
 *
 * So the shape is built here, away from the rendering, where it can be tested
 * without a DOM.
 */

export interface FileNode {
  kind: 'file'
  /** The full torrent-relative path, and the identity of the row. */
  path: string
  /** The last segment, which is what the row prints. */
  name: string
  file: TorrentFile
}

export interface FolderNode {
  kind: 'folder'
  path: string
  name: string
  children: TreeNode[]
  /**
   * Every file at or below this folder, flattened.
   *
   * Carried so that ticking or repriorising a collapsed folder can act on what
   * it contains without the caller walking the tree again. A folder whose
   * contents are hidden still has to be operable, or collapsing becomes a way
   * to lose access to your own files.
   */
  files: TorrentFile[]
  size: number
  /** Size-weighted, so the bar tracks bytes rather than file count. */
  progress: number
}

export type TreeNode = FileNode | FolderNode

/** One rendered line: a node and how far in it sits. */
export interface Row {
  node: TreeNode
  depth: number
}

/**
 * Folders first, then names.
 *
 * Directories above files is the order every file manager uses, so it needs no
 * explaining. Within a kind, `localeCompare` with numeric collation puts
 * `Part 2` before `Part 10`, which plain code-point order gets backwards on
 * exactly the names episodic torrents carry.
 */
function compareNodes(a: TreeNode, b: TreeNode): number {
  if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1
  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
}

interface Building {
  folders: Map<string, Building>
  files: FileNode[]
}

const emptyBuilding = (): Building => ({ folders: new Map(), files: [] })

export function buildFileTree(files: readonly TorrentFile[]): TreeNode[] {
  const root = emptyBuilding()

  for (const file of files) {
    // A leading or doubled separator would otherwise mint a folder with no
    // name, which renders as a blank row that can never be explained.
    const segments = file.name.split('/').filter(Boolean)
    if (segments.length === 0) continue

    const leaf = segments[segments.length - 1]!
    let at = root
    let walked = ''

    for (const segment of segments.slice(0, -1)) {
      walked = walked ? `${walked}/${segment}` : segment
      let next = at.folders.get(walked)
      if (!next) {
        next = emptyBuilding()
        at.folders.set(walked, next)
      }
      at = next
    }

    at.files.push({ kind: 'file', path: file.name, name: leaf, file })
  }

  const finish = (node: Building): TreeNode[] => {
    const out: TreeNode[] = []

    for (const [path, child] of node.folders) {
      const children = finish(child)
      const nested: TorrentFile[] = []
      for (const entry of children) {
        if (entry.kind === 'folder') nested.push(...entry.files)
        else nested.push(entry.file)
      }
      const size = nested.reduce((sum, f) => sum + f.size, 0)
      out.push({
        kind: 'folder',
        path,
        name: path.split('/').pop() ?? path,
        children,
        files: nested,
        size,
        // Guarded, because a folder of zero-byte files would divide by zero and
        // print NaN% rather than the 0% it plainly is.
        progress: size > 0 ? nested.reduce((sum, f) => sum + f.size * f.progress, 0) / size : 0,
      })
    }

    out.push(...node.files)
    return out.sort(compareNodes)
  }

  return finish(root)
}

/**
 * The tree as the list of rows currently on screen.
 *
 * A folder's children are emitted only when its path is in `expanded`, so
 * collapsing is the absence of rows rather than rows that are hidden with CSS.
 * That matters for a torrent with thousands of files: the collapsed ones are
 * never rendered at all.
 */
export function flattenTree(
  nodes: readonly TreeNode[],
  expanded: ReadonlySet<string>,
  depth = 0,
): Row[] {
  const rows: Row[] = []
  for (const node of nodes) {
    rows.push({ node, depth })
    if (node.kind === 'folder' && expanded.has(node.path)) {
      rows.push(...flattenTree(node.children, expanded, depth + 1))
    }
  }
  return rows
}

/**
 * What is open before anybody clicks anything.
 *
 * Everything starts collapsed, with one exception that is not a compromise:
 * almost every torrent wraps its entire contents in a single folder named
 * after the torrent. Leaving that collapsed would open the tab on exactly one
 * row, repeating the title above it, with the actual contents one mandatory
 * click away. So a chain of single wrapper folders is opened, and the first
 * level that genuinely branches is where collapsing begins.
 */
export function defaultExpanded(nodes: readonly TreeNode[]): Set<string> {
  const open = new Set<string>()
  let level = nodes
  while (level.length === 1 && level[0]!.kind === 'folder') {
    const only = level[0] as FolderNode
    open.add(only.path)
    level = only.children
  }
  return open
}
