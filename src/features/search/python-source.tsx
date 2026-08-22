import { canReachDesktop, openUrl } from '@/services/shell'
import { cn } from '@/lib/utils'

/**
 * python.org's downloads page rather than a direct installer link.
 *
 * A direct link would pin an architecture and a version, and would go stale
 * on its own schedule. The downloads page picks the right build for whoever
 * is looking at it, which is the one thing this cannot get right from here.
 */
const PYTHON_DOWNLOADS = 'https://www.python.org/downloads/'

export interface PythonSourceProps {
  className?: string
}

/**
 * Where to get Python.
 *
 * qBittorrent's desktop app offers this on Windows when it cannot find one,
 * and it is the only part of that prompt worth copying. rigseed does not
 * offer to run an installer: downloading and executing a binary on somebody's
 * behalf is a bigger promise than a torrent client should be making, and it
 * has nothing sensible to do on the platforms where Python is already there.
 *
 * The version matters. qBittorrent's search engine needs Python 3, and the
 * downloads page defaults to it, so no version is named here to go stale.
 */
export function PythonSource({ className }: PythonSourceProps) {
  // Hidden rather than dead outside Tauri, which is the rule every shell
  // handoff follows: never offer what cannot happen.
  if (!canReachDesktop()) return null

  return (
    <span className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <span className="text-[11px] text-text-dim">
        Python 3 is a separate install, from python.org.
      </span>
      <button
        type="button"
        onClick={() => void openUrl(PYTHON_DOWNLOADS)}
        className="rounded text-[11px] font-semibold text-accent underline underline-offset-2 transition-colors duration-quick hover:text-accent2"
      >
        Get Python
      </button>
    </span>
  )
}
