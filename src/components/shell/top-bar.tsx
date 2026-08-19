import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router'

import { Appearance } from '@/components/ui/appearance'
import { ConnectionChip } from '@/components/shell/connection-chip'
import { IconButton } from '@/components/ui/icon-button'
import { cn } from '@/lib/utils'
import { useConnection } from '@/services/api-context'
import { useThemeStore } from '@/state/theme-store'

export interface TopBarProps {
  /** Mono breadcrumb after "All torrents", for example "/ settings". */
  breadcrumb?: string
  /** Transfers shows the connection dropdown instead of a back button. */
  isHome?: boolean
  className?: string
}

export function TopBar({ breadcrumb, isHome, className }: TopBarProps) {
  const navigate = useNavigate()
  const { mode, accent, setMode, setAccent, reopenSetup } = useThemeStore()
  const connection = useConnection()

  return (
    <header
      className={cn(
        'bg-sidebar border-line flex h-14 shrink-0 items-center gap-3.5 border-b px-[18px]',
        className,
      )}
    >
      {isHome ? (
        <ConnectionChip state={connection} />
      ) : (
        <>
          <IconButton title="Back" onClick={() => void navigate('/')}>
            <ChevronLeft className="size-4" strokeWidth={2} />
          </IconButton>
          <span className="text-text text-[12.5px] font-semibold">All torrents</span>
          {breadcrumb ? (
            <span className="text-text-dimmer font-mono text-[11.5px]">{breadcrumb}</span>
          ) : null}
        </>
      )}

      <span className="flex-1" />

      <Appearance
        mode={mode}
        accent={accent}
        onModeChange={setMode}
        onAccentChange={setAccent}
        onSetup={reopenSetup}
      />
    </header>
  )
}
