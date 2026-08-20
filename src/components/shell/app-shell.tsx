import { useState } from 'react'
import { Menu } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router'

import { Footer } from '@/components/shell/footer'
import { SetupModal } from '@/components/shell/setup-modal'
import { TopBar } from '@/components/shell/top-bar'
import { NavRail } from '@/components/ui/nav-rail'
import { RailItem } from '@/components/ui/rail-item'
import { BrandMark } from '@/components/brand-mark'
import { icons } from '@/lib/icons'
import { useThemeAttributes } from '@/state/use-theme-attributes'
import { useWindowIcon } from '@/state/use-window-icon'

const DESTINATIONS = [
  { to: '/', label: 'Transfers', Icon: icons.transfers, breadcrumb: undefined },
  { to: '/search', label: 'Search', Icon: icons.search, breadcrumb: '/ search' },
  { to: '/rss', label: 'RSS', Icon: icons.rss, breadcrumb: '/ rss' },
  { to: '/categories', label: 'Categories & tags', Icon: icons.categories, breadcrumb: '/ categories & tags' },
  { to: '/logs', label: 'Logs', Icon: icons.logs, breadcrumb: '/ logs' },
  { to: '/connections', label: 'Connections', Icon: icons.connections, breadcrumb: '/ connections' },
  { to: '/settings', label: 'Settings', Icon: icons.settings, breadcrumb: '/ settings' },
] as const

/**
 * The frame every screen sits in.
 *
 * The rail is fixed and overlays, so expanding it never reflows the content.
 * The content area is padded 60px from the left to clear the collapsed rail.
 */
export function AppShell() {
  useThemeAttributes()
  // The same theme, applied to the one piece of chrome the CSS cascade cannot
  // reach. Does nothing outside Tauri.
  useWindowIcon()
  const [railExpanded, setRailExpanded] = useState(false)
  const { pathname } = useLocation()
  const current = DESTINATIONS.find((d) => d.to === pathname)

  return (
    <div className="bg-bg flex h-full">
      <NavRail
        expanded={railExpanded}
        onToggle={() => setRailExpanded((v) => !v)}
        brand={<BrandMark />}
      >
        <RailItem
          icon={<Menu className="size-[17px]" strokeWidth={2} />}
          label={railExpanded ? 'Hide labels' : 'Show labels'}
          expanded={railExpanded}
          onClick={() => setRailExpanded((v) => !v)}
        />
        {DESTINATIONS.map((d) => (
          <NavLink key={d.to} to={d.to} className="contents">
            {({ isActive }) => (
              <RailItem
                icon={<d.Icon className="size-[17px]" strokeWidth={2} />}
                label={d.label}
                active={isActive}
                expanded={railExpanded}
              />
            )}
          </NavLink>
        ))}
      </NavRail>

      <div className="flex min-w-0 flex-1 flex-col pl-[60px]">
        <TopBar isHome={pathname === '/'} breadcrumb={current?.breadcrumb ?? ''} />
        <main className="min-h-0 flex-1 overflow-auto">
          <Outlet />
        </main>
        <Footer counts={current?.label.toLowerCase() ?? ''} api="sync/maindata" />
      </div>

      <SetupModal />
    </div>
  )
}
