import {
  Activity,
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  BookOpen,
  Check,
  Cloud,
  Monitor,
  Plus,
  Server,
  Wifi,
  CircleCheck,
  Filter,
  Hourglass,
  Layers,
  LayoutGrid,
  List,
  Rows2,
  Brush,
  Disc,
  FileText,
  Folder,
  FolderOpen,
  Package,
  Palette,
  Pause,
  Rabbit,
  Play,
  Rss,
  Search,
  Settings,
  Signal,
  Tags,
  Trash2,
  Turtle,
  Waves,
  X,
} from 'lucide-react'

/**
 * Lucide at the rigseed drawing convention: 2px stroke, round caps and joins.
 * The design system names Lucide as the stand-in for the prototypes' inlined
 * paths, since it is the same convention at the same weight.
 */
export const icons = {
  transfers: Waves,
  search: Search,
  rss: Rss,
  categories: Tags,
  logs: FileText,
  settings: Settings,
  connections: Signal,
  folder: Folder,
  folderOpen: FolderOpen,
  download: ArrowDownToLine,
  // The status filters. Each one gets its own glyph rather than seven
  // folders: the list is scanned by shape long before it is read, and seven
  // identical icons make the colour of the active row the only thing telling
  // them apart.
  all: Layers,
  upload: ArrowUpFromLine,
  complete: CircleCheck,
  active: Activity,
  stalled: Hourglass,
  /** Auto-download rules, which are a filter over a feed. */
  /* The three Transfers layouts, chunky to dense, so the strip reads as a
     density scale before any label is read: two fat rows, four squares,
     three thin lines. */
  layoutEasy: Rows2,
  layoutGrid: LayoutGrid,
  layoutList: List,

  filter: Filter,
  palette: Palette,
  resume: Play,
  pause: Pause,
  remove: Trash2,
  clear: X,
  add: Plus,
  // The alternative-limits pair. Full speed is the rabbit; the throttled mode
  // is the turtle, which is the icon qBittorrent has used for it for years.
  rabbit: Rabbit,
  turtle: Turtle,
  check: Check,
  alert: AlertCircle,
  /** The test-connection glyph: signal arcs, not the nav rail's bars. */
  test: Wifi,
  // What kind of machine a connection points at. Guessed from the address,
  // because the daemon has no way to tell us and the shape is what makes a
  // list of four instances readable at a glance.
  desktop: Monitor,
  lan: Server,
  remote: Cloud,
} as const

/**
 * The icons a category can be given.
 *
 * Separate from the map above because these are user-chosen rather than
 * assigned by the app, and the stored value is the key: swapping the drawing
 * later must not orphan every category somebody already labelled.
 */
export const categoryIcons = {
  disc: Disc,
  brush: Brush,
  box: Package,
  book: BookOpen,
  folder: Folder,
  file: FileText,
} as const

/** The icon keys a connection can take. */
export type InstanceKind = 'desktop' | 'lan' | 'remote'

/**
 * Which glyph a connection gets, guessed from its address.
 *
 * Returns the key rather than the component so callers can index `icons`
 * directly, which is how every other dynamic icon in the app is rendered. A
 * function returning a component would be created fresh on each render.
 *
 * The daemon cannot tell us what kind of machine it runs on, and four
 * identical icons make the label the only thing separating four rows. A
 * private address is something on this network; anything else is out there.
 */
export function instanceKind(host: string, bundled: boolean): InstanceKind {
  if (bundled) return 'desktop'
  const name = host.split(':')[0] ?? ''
  const isPrivate =
    /^(10\.|127\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(name) ||
    name === 'localhost' ||
    name.endsWith('.local')
  return isPrivate ? 'lan' : 'remote'
}
