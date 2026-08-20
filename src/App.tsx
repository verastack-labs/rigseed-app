import { HashRouter, Route, Routes } from 'react-router'

import { AppShell } from '@/components/shell/app-shell'
import { ApiProvider } from '@/services/context'
import { Placeholder } from '@/pages/placeholder'
import { TorrentDetail } from '@/pages/torrent-detail'
import { Categories } from '@/pages/categories'
import { Settings } from '@/pages/settings'
import { Transfers } from '@/pages/transfers'

/**
 * HashRouter rather than BrowserRouter.
 *
 * Tauri serves the frontend from a custom protocol with no server able to
 * rewrite unknown paths, so a reload on /settings would 404 under history
 * routing. The hash keeps every route reachable without any server rules,
 * and the window has no address bar for the hash to be ugly in.
 */
export function App() {
  return (
    <ApiProvider>
      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Transfers />} />
            {/* Hash rather than an index, because the daemon identifies a
                torrent by hash and nothing else survives a reorder. */}
            <Route path="torrent/:hash" element={<TorrentDetail />} />
            <Route
              path="search"
              element={<Placeholder title="Search" tier="V2" api="search/start" />}
            />
            <Route path="rss" element={<Placeholder title="RSS" tier="V2" api="rss/items" />} />
            <Route path="categories" element={<Categories />} />
            <Route path="logs" element={<Placeholder title="Logs" tier="V1" api="log/main" />} />
            <Route
              path="connections"
              element={<Placeholder title="Connections" tier="V2" api="auth/login" />}
            />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </HashRouter>
    </ApiProvider>
  )
}
