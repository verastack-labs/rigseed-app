import {
  ArrowDownToLine,
  FileText,
  Folder,
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
