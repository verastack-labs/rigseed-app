import { useEffect, useState } from 'react'
import { Menu } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router'

import { Footer } from '@/components/shell/footer'
import { Toaster } from '@/components/shell/toaster'
import { CloseChoice } from '@/features/shell/close-choice'
import { useCloseRequest } from '@/state/use-close-request'
import { useTorrentAlerts } from '@/state/use-torrent-alerts'
import { SetupModal } from '@/components/shell/setup-modal'
import { TopBar } from '@/components/shell/top-bar'
import { NavRail } from '@/components/ui/nav-rail'
import { RailItem } from '@/components/ui/rail-item'
import { BrandMark } from '@/components/brand-mark'
import { icons } from '@/lib/icons'
import { useConnection } from '@/services/api-context'
import { useTorrentStore } from '@/state/torrent-store'
import { useThemeAttributes } from '@/state/use-theme-attributes'
import { useWindowIcon } from '@/state/use-window-icon'
import { updateNeedsAttention, useUpdateStore } from '@/state/update-store'

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
  // Watches the torrent store for finishes and failures, and raises an OS
  // notification for each if that has been turned on. In the shell rather than
  // on Transfers, because the whole point is what happens while nobody is
  // looking at that screen.
  useTorrentAlerts()
  // Rust prevents every close and asks here, because the preference lives on
  // this side and a dialog can only be drawn on this side.
  const closing = useCloseRequest()
  const [railExpanded, setRailExpanded] = useState(false)
  const { pathname } = useLocation()
  const current = DESTINATIONS.find((d) => d.to === pathname)
  const connection = useConnection()
  // Live, from the poll loop. The connection state only knows how startup went.
  const reachable = useTorrentStore((s) => s.reachable)

  /*
   * One quiet look for a newer version, per launch.
   *
   * In an effect with an empty dependency list, not on a timer and not on
   * every navigation: this asks a remote server, and asking it repeatedly
   * because somebody moved between screens would be rude to them and to us.
   * The store refuses a second run anyway, so a double invoke in StrictMode
   * costs nothing.
   *
   * Nothing is shown when it finds something. The result is a dot on the rail
   * and a filled-in card in Settings for whenever somebody goes looking. An
   * update is not a live thing, and interrupting a running transfer to
   * announce one would be the application talking about itself over the work
   * it is supposed to be doing.
   */
  const checkQuietly = useUpdateStore((s) => s.checkQuietly)
  useEffect(() => {
    void checkQuietly()
  }, [checkQuietly])

  const updateWaiting = useUpdateStore((s) => updateNeedsAttention(s.state))


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
          // The rail overlays the content, so leaving it open after a
          // destination is chosen covers the screen the choice just asked
          // for. Closed on the choice rather than on the route change,
          // because collapsing from an effect is a cascading render and the
          // lint rule is right about that.
          <NavLink
            key={d.to}
            to={d.to}
            className="contents"
            onClick={() => setRailExpanded(false)}
          >
            {({ isActive }) => (
              <RailItem
                icon={
                  <span className="relative inline-flex">
                    <d.Icon className="size-[17px]" strokeWidth={2} />
                    {/*
                      The whole announcement. A dot on the destination that can
                      do something about it, rather than a banner over the
                      screen somebody is using. It is drawn with a ring in the
                      rail's own background so it reads as sitting on the icon
                      at either rail width.
                    */}
                    {d.to === '/settings' && updateWaiting ? (
                      <span
                        aria-hidden="true"
                        className="bg-accent ring-sidebar absolute -top-0.5 -right-0.5 size-[7px] rounded-full ring-2"
                      />
                    ) : null}
                  </span>
                }
                label={d.to === '/settings' && updateWaiting ? `${d.label} (update available)` : d.label}
                active={isActive}
                expanded={railExpanded}
              />
            )}
          </NavLink>
        ))}
      </NavRail>

      <div className="flex min-w-0 flex-1 flex-col pl-[60px]">
        <TopBar isHome={pathname === '/'} breadcrumb={current?.breadcrumb ?? ''} />
        {/* `overflow-auto` here let the whole page scroll sideways whenever
            anything inside was too wide, and the Transfers sidebar went with
            it: the filter list and the speed card slid out of the window
            along with the content they are meant to sit beside. Vertical
            scrolling stays, horizontal never belongs to the shell. Anything
            that genuinely needs to scroll sideways owns that itself, next to
            the content rather than around the whole screen. */}
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          <Outlet />
        </main>
        {/* Outside main, so a page that scrolls does not carry it away, and
            after it, so it is last in the tab order rather than sitting
            between the top bar and the page. */}
        <Toaster />
        <CloseChoice
          open={closing.asking}
          onKeepRunning={closing.keepRunning}
          onQuit={closing.quit}
        />
        <Footer
          counts={current?.label.toLowerCase() ?? ''}
          api="sync/maindata"
          status={connection.status === 'connected' && !reachable ? 'reconnecting' : connection.status}
          {...(connection.status === 'connected'
            ? { daemon: `qbittorrent ${connection.version} / api ${connection.webApiVersion}` }
            : {})}
        />
      </div>

      <SetupModal />
    </div>
  )
}
