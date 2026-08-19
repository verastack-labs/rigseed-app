import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'

import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { SectionHeader } from '@/components/ui/section-header'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Skeleton } from '@/components/ui/skeleton'
import { TransfersToolbar } from '@/components/shell/transfers-toolbar'
import { AddFab } from '@/features/transfers/add-fab'
import { Sidebar } from '@/features/transfers/sidebar'
import { TorrentEasy } from '@/features/transfers/torrent-easy'
import { TorrentGrid } from '@/features/transfers/torrent-grid'
import { TorrentList } from '@/features/transfers/torrent-list'
import {
  categoryCounts,
  filterTorrents,
  statusCounts,
  tagCounts,
} from '@/features/transfers/filter'
import { icons } from '@/lib/icons'
import { useApi } from '@/services/context'
import { useThemeStore, type Layout } from '@/state/theme-store'
import { selectTorrentList, useTorrentStore } from '@/state/torrent-store'
import { hasActiveFilters, useTransfersStore } from '@/state/transfers-store'
import { useSyncPoll } from '@/state/use-sync-poll'

export function Transfers() {
  useSyncPoll()
  const api = useApi()

  const torrents = useTorrentStore(useShallow(selectTorrentList))
  const serverState = useTorrentStore((s) => s.serverState)
  const loaded = useTorrentStore((s) => s.loaded)

  const defaultLayout = useThemeStore((s) => s.defaultLayout)
  const {
    status,
    category,
    tag,
    query,
    layout,
    selected,
    setStatus,
    setCategory,
    setTag,
    setQuery,
    setLayout,
    toggleSelected,
    clearSelection,
    clearFilters,
  } = useTransfersStore()
  const filtersActive = useTransfersStore(hasActiveFilters)

  const [confirmRemove, setConfirmRemove] = useState<readonly string[] | null>(null)

  // The screen's own choice wins, otherwise the one picked at first run.
  const activeLayout: Layout = layout ?? defaultLayout

  // Accumulated in the store on each poll, not here: appending during render
  // would be a write while rendering.
  const speedHistory = useTorrentStore((s) => s.speedHistory)
  const down = serverState.dl_info_speed ?? 0
  const up = serverState.up_info_speed ?? 0

  const visible = useMemo(
    () => filterTorrents(torrents, { status, category, tag, query }),
    [torrents, status, category, tag, query],
  )
  const counts = useMemo(() => statusCounts(torrents), [torrents])
  const categories = useMemo(() => categoryCounts(torrents), [torrents])
  const tags = useMemo(() => tagCounts(torrents), [torrents])

  const act = {
    onResume: (hashes: readonly string[]) => void api.torrents.resume(hashes),
    onPause: (hashes: readonly string[]) => void api.torrents.pause(hashes),
    onRemove: (hashes: readonly string[]) => setConfirmRemove(hashes),
  }

  // With nothing selected the toolbar acts on everything in view, which is
  // what the fixed labels rely on the audience already understanding.
  const scope = selected.length ? selected : visible.map((t) => t.hash)

  const layoutProps = {
    torrents: visible,
    selected,
    onToggle: toggleSelected,
    ...act,
  }

  return (
    <div className="relative flex h-full">
      <Sidebar
        status={status}
        statusCounts={counts}
        categories={categories}
        tags={tags}
        category={category}
        tag={tag}
        filtersActive={filtersActive}
        downSpeed={down}
        upSpeed={up}
        downHistory={speedHistory.down}
        upHistory={speedHistory.up}
        onStatus={setStatus}
        onCategory={setCategory}
        onTag={setTag}
        onClear={clearFilters}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center">
          <TransfersToolbar
            className="flex-1 border-b-0"
            selectedCount={selected.length}
            totalCount={visible.length}
            onClearSelection={clearSelection}
            onResume={() => act.onResume(scope)}
            onPause={() => act.onPause(scope)}
            onRemove={() => act.onRemove(scope)}
          />
          <div className="flex h-[52px] items-center gap-2.5 border-b border-line pr-6 pl-0">
            <Input
              mono
              size="sm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search torrents…"
              aria-label="Search torrents"
              icon={<Search className="size-[13px]" strokeWidth={2} />}
              className="w-[232px]"
            />
            <SectionHeader>View</SectionHeader>
            <SegmentedControl
              size="sm"
              label="View"
              options={[
                { value: 'easy', label: 'Easy' },
                { value: 'grid', label: 'Grid' },
                { value: 'list', label: 'List' },
              ]}
              value={activeLayout}
              onChange={(next) => setLayout(next as Layout)}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {!loaded ? (
            <div className="p-6">
              <Skeleton rows={6} rowHeight={96} />
            </div>
          ) : visible.length === 0 ? (
            <EmptyState
              icon={<icons.folder className="size-6" strokeWidth={1.7} />}
              title={filtersActive ? 'No torrents match these filters' : 'Nothing here yet'}
              body={
                filtersActive
                  ? 'Nothing matches every filter you have applied at once. Clearing them brings the rest of the list back.'
                  : 'Add a torrent with the button in the corner. A magnet link or a .torrent file both work.'
              }
              action={
                filtersActive ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="rounded-lg bg-accent-soft px-4 py-2 text-[12.5px] font-semibold text-accent transition-colors duration-quick hover:bg-accent hover:text-accent-on"
                  >
                    Clear filters
                  </button>
                ) : undefined
              }
            />
          ) : activeLayout === 'easy' ? (
            <TorrentEasy {...layoutProps} />
          ) : activeLayout === 'list' ? (
            <TorrentList {...layoutProps} />
          ) : (
            <TorrentGrid {...layoutProps} />
          )}
        </div>
      </div>

      <AddFab onSelect={() => {}} />

      <ConfirmDialog
        open={confirmRemove !== null}
        onCancel={() => setConfirmRemove(null)}
        onConfirm={(alsoDeleteFiles) => {
          if (confirmRemove) void api.torrents.delete(confirmRemove, alsoDeleteFiles)
          setConfirmRemove(null)
          clearSelection()
        }}
        title={
          confirmRemove && confirmRemove.length > 1
            ? `Remove ${confirmRemove.length} torrents?`
            : 'Remove this torrent?'
        }
        body="The torrent stops and leaves the list. The files it already downloaded stay on disk unless you also tick the option below."
        confirmLabel="Remove"
        optionLabel="Also delete the files on disk"
      />
    </div>
  )
}
