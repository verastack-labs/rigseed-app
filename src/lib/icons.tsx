import {
  ArrowDownToLine,
  FileText,
  Folder,
  Palette,
  Rss,
  Search,
  Settings,
  Signal,
  Tags,
  Waves,
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
} as const

/** The cleat. A horizontal bar with flared horns and a rope loop at -38deg. */
export function BrandMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6.5 12h11M6.5 12 4 9.3M6.5 12 4 14.7M17.5 12 20 9.3M17.5 12 20 14.7" />
      <ellipse cx="12" cy="12" rx="5.2" ry="3.1" transform="rotate(-38 12 12)" strokeWidth="1.7" />
    </svg>
  )
}
