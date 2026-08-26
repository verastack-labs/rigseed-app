import { useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { useNavigate } from 'react-router'
import { useShallow } from 'zustand/react/shallow'

import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { SectionHeader } from '@/components/ui/section-header'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Skeleton } from '@/components/ui/skeleton'
import { TransfersToolbar } from '@/components/shell/transfers-toolbar'
import { AddTorrentDialog } from '@/features/add-torrent/add-torrent-dialog'
import type { Source } from '@/features/add-torrent/source-picker'
import type { Torrent } from '@/types/qbittorrent'
import { AddFab, type AddSource } from '@/features/transfers/add-fab'
import { AltSpeedToggle } from '@/features/transfers/alt-speed-toggle'
import { Sidebar } from '@/features/transfers/sidebar'
import { SpeedLimitDialog } from '@/features/transfers/speed-limit-dialog'
import { saveTorrentFile } from '@/services/torrent-file'
import { notify } from '@/state/notice-store'
import { TorrentEasy } from '@/features/transfers/torrent-easy'
import { TorrentGrid } from '@/features/transfers/torrent-grid'
import { write } from '@/lib/write'
import { TorrentList } from '@/features/transfers/torrent-list'
import {
  categoryCounts,
  filterTorrents,
  statusCounts,
  tagCounts,
} from '@/features/transfers/filter'
import { icons } from '@/lib/icons'
import { nextIndex, useHotkeys } from '@/lib/use-hotkeys'
import { useApi, useConnection } from '@/services/api-context'
import { useThemeStore, type Layout } from '@/state/theme-store'
import { selectTorrentList, useTorrentStore } from '@/state/torrent-store'
import { hasActiveFilters, useTransfersStore } from '@/state/transfers-store'
import { useSyncPoll } from '@/state/use-sync-poll'
import { isPaused } from '@/utils/format'

export function Transfers() {
  useSyncPoll()
  const api = useApi()
  const connection = useConnection()
  const navigate = useNavigate()
  const searchRef = useRef<HTMLInputElement>(null)

  const torrents = useTorrentStore(useShallow(selectTorrentList))
  const serverState = useTorrentStore((s) => s.serverState)
  const loaded = useTorrentStore((s) => s.loaded)
  // Live, from the poll loop. Every write below is pointless while it is false.
  const reachable = useTorrentStore((s) => s.reachable)

  // Every category and tag the daemon knows, not only the ones currently in
  // use. The sidebar counts what is on screen; Add Torrent has to offer the
  // empty ones too, or a category with nothing in it becomes unreachable.
  const allCategories = useTorrentStore(useShallow((s) => Object.keys(s.categories)))
  const allTags = useTorrentStore(useShallow((s) => s.tags))

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
    selectOnly,
    clearSelection,
    clearFilters,
  } = useTransfersStore()
  const filtersActive = useTransfersStore(hasActiveFilters)

  const [confirmRemove, setConfirmRemove] = useState<readonly string[] | null>(null)
  // Null means closed. The source it opens on comes from the FAB option that
  // was clicked, so picking "Add magnet link" does not land on the file tab.
  const [adding, setAdding] = useState<Source | null>(null)

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

  /** Which torrent's limits are open, by hash. */
  const [limiting, setLimiting] = useState<string | null>(null)

  const act = {
    onResume: (hashes: readonly string[]) =>
      void write('Resume', () => api.torrents.resume(hashes)),
    onPause: (hashes: readonly string[]) => void write('Pause', () => api.torrents.pause(hashes)),
    onRemove: (hashes: readonly string[]) => setConfirmRemove(hashes),
    onRecheck: (hashes: readonly string[]) =>
      void write('Force recheck', () => api.torrents.recheck(hashes)),
    // The page owns the dialog rather than the row. One dialog for whichever
    // row asked beats one per row, and the limits it shows have to follow the
    // live torrent through every poll, which the row's copy would not.
    onSpeedLimits: (torrent: Torrent) => setLimiting(torrent.hash),
    /**
     * Saving the .torrent file, which reports three outcomes rather than two.
     *
     * A dismissed save dialog is a decision, not a failure, so it says nothing
     * at all. A successful one says so, because the file lands wherever the
     * user chose and there is nothing on this screen to show for it otherwise.
     */
    onSaveTorrentFile: (torrent: Torrent) => {
      const where = connection.status === 'connected' ? connection.baseUrl : ''
      void saveTorrentFile(where, torrent.hash, torrent.name).then((outcome) => {
        if (outcome.kind === 'saved') {
          notify({ tone: 'ok', what: 'Saved .torrent file', detail: outcome.path })
        } else if (outcome.kind === 'failed') {
          notify({ tone: 'warn', what: 'Save .torrent file', detail: outcome.reason })
        }
      })
    },
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

  /**
   * The keyboard map, per `motion-and-states.md` section 6.
   *
   * Everything acts on the selection, never on `scope`. The toolbar falls back
   * to everything in view when nothing is selected, which is fine behind a
   * labelled button and alarming behind a single keystroke: Space would pause
   * two hundred torrents and Delete would offer to remove them.
   *
   * The cursor is the most recently touched row rather than a separate piece
   * of state. `toggleSelected` appends, so the last entry is the one the user
   * last acted on, and arrowing from there is what a list is expected to do.
   */
  const cursor = visible.findIndex((t) => t.hash === selected[selected.length - 1])

  const move = (delta: number) => {
    const next = visible[nextIndex(cursor, delta, visible.length)]
    if (!next) return
    selectOnly([next.hash])
    // The row may be below the fold, and a selection nobody can see is worse
    // than no selection. `nearest` rather than `center` so a row already on
    // screen does not make the list jump under a held arrow key.
    document
      .querySelector(`[data-hash="${next.hash}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'auto' })
  }

  useHotkeys([
    { key: '/', run: () => searchRef.current?.focus() },
    { key: 'ArrowDown', run: () => move(1) },
    { key: 'ArrowUp', run: () => move(-1) },
    {
      key: 'a',
      mod: true,
      run: () => selectOnly(visible.map((t) => t.hash)),
    },
    {
      key: 'Enter',
      run: () => {
        const torrent = visible[cursor]
        if (torrent) void navigate(`/torrent/${torrent.hash}`)
      },
    },
    {
      key: ' ',
      run: () => {
        if (!selected.length || !reachable) return
        // Resume only when every selected torrent is already paused. A mixed
        // selection pauses, which is the reversible half of the pair.
        const chosen = visible.filter((t) => selected.includes(t.hash))
        const allPaused = chosen.length > 0 && chosen.every((t) => isPaused(t.state))
        if (allPaused) act.onResume(selected)
        else act.onPause(selected)
      },
    },
    {
      key: 'Delete',
      run: () => {
        if (selected.length && reachable) act.onRemove(selected)
      },
    },
    { key: 'Escape', run: clearSelection },
  ])

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
        <div className="flex min-w-0 items-center">
          <TransfersToolbar
            className="flex-1 border-b-0"
            selectedCount={selected.length}
            totalCount={visible.length}
            offline={!reachable}
            onClearSelection={clearSelection}
            onResume={() => act.onResume(scope)}
            onPause={() => act.onPause(scope)}
            onRemove={() => act.onRemove(scope)}
          />
          <div className="flex h-[52px] shrink-0 items-center gap-2.5 border-b border-line pr-6 pl-0">
            <Input
              mono
              size="sm"
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search torrents…"
              aria-label="Search torrents"
              icon={<Search className="size-[13px]" strokeWidth={2} />}
              // Shrinks before anything else does. A field that is narrower
              // than its placeholder still takes a query; a button that has
              // lost its label has lost the only thing naming it.
              className="w-[232px] min-w-[132px] shrink"
            />
            <SectionHeader className="hidden xl:block">View</SectionHeader>
            <SegmentedControl
              size="sm"
              label="View"
              iconsWhenNarrow
              options={[
                {
                  value: 'easy',
                  label: 'Easy',
                  icon: <icons.layoutEasy className="size-[14px]" strokeWidth={2} />,
                },
                {
                  value: 'grid',
                  label: 'Grid',
                  icon: <icons.layoutGrid className="size-[14px]" strokeWidth={2} />,
                },
                {
                  value: 'list',
                  label: 'List',
                  icon: <icons.layoutList className="size-[14px]" strokeWidth={2} />,
                },
              ]}
              value={activeLayout}
              onChange={(next) => setLayout(next as Layout)}
            />

            {/* A divider, then the alternative-limits switch, per the screen
                doc. It is global rather than per-selection, which is why it
                sits with the view controls and not in the action toolbar. */}
            <span className="h-5 w-px shrink-0 bg-line" />
            <AltSpeedToggle
              active={serverState.use_alt_speed_limits === true}
              offline={!reachable}
              onToggle={() =>
                void write('Switch speed limits', () => api.transfer.toggleSpeedLimitsMode())
              }
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
              title={filtersActive ? 'No torrents match these filters' : 'No torrents yet'}
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

      <AddFab
        offline={!reachable}
        onSelect={(picked: AddSource) => setAdding(picked === 'file' ? 'file' : 'magnet')}
      />

      {/* Mounted only while open, so every field starts fresh rather than
          carrying the last attempt's choices into the next torrent. */}
      {adding !== null ? (
        <AddTorrentDialog
          initialSource={adding}
          onClose={() => setAdding(null)}
          categories={allCategories}
          tags={allTags}
          freeSpace={serverState.free_space_on_disk ?? 0}
        />
      ) : null}

      {/* Looked up fresh each render rather than held in state, so the fields
          follow the daemon through every poll. A torrent removed while its
          limits are open closes the dialog instead of showing a stale copy. */}
      <SpeedLimitDialog
        torrent={visible.find((t) => t.hash === limiting) ?? null}
        onClose={() => setLimiting(null)}
        onLimit={(direction, bytes) =>
          limiting === null
            ? undefined
            : void write(direction === 'down' ? 'Set download limit' : 'Set upload limit', () =>
                direction === 'down'
                  ? api.torrents.setDownloadLimit([limiting], bytes)
                  : api.torrents.setUploadLimit([limiting], bytes),
              )
        }
      />

      <ConfirmDialog
        open={confirmRemove !== null}
        onCancel={() => setConfirmRemove(null)}
        onConfirm={(alsoDeleteFiles) => {
          if (confirmRemove)
            void write('Remove torrent', () => api.torrents.delete(confirmRemove, alsoDeleteFiles))
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
