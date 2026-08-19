import {
  ArrowDownToLine,
  BookOpen,
  Brush,
  Disc,
  FileText,
  Folder,
  Package,
  Palette,
  Pause,
  Play,
  Rss,
  Search,
  Settings,
  Signal,
  Tags,
  Trash2,
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
  download: ArrowDownToLine,
  palette: Palette,
  resume: Play,
  pause: Pause,
  remove: Trash2,
  clear: X,
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
