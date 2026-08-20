import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { IconTile } from '@/components/ui/icon-tile'
import { Input } from '@/components/ui/input'
import { ProgressBar } from '@/components/ui/progress-bar'
import { SectionHeader } from '@/components/ui/section-header'
import { StatusDot } from '@/components/ui/status-dot'
import { SwatchRow } from '@/components/ui/swatch-row'
import { Switch } from '@/components/ui/switch'
import { categoryIcons } from '@/lib/icons'
import { CATEGORY_ICON_KEYS, swatchColor, type CategoryIconKey, type SwatchKey } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { canReachDesktop, pickFolder } from '@/services/shell'
import type { Torrent } from '@/types/qbittorrent'
import { STATE_LABEL, formatBytes, formatPercent, stateTone } from '@/utils/format'

/** Everything the editor can change. Categories carry the extra three. */
export interface LabelDraft {
  name: string
  color: SwatchKey
  icon: CategoryIconKey
  savePath: string
  /** Automatic Torrent Management: torrents move when the category changes. */
  managed: boolean
}

export interface LabelEditorProps {
  kind: 'category' | 'tag'
  draft: LabelDraft
  onChange: (next: LabelDraft) => void
  /** Null when creating, so the name field is editable and Delete is absent. */
  editing: string | null
  members: readonly Torrent[]
  /** From `server_state.free_space_on_disk`. Zero means not reported yet. */
  freeSpace: number
  dirty: boolean
  onSave: () => void
  onCancel: () => void
  onDelete: () => void
  className?: string
}

/**
 * The right half of Categories & Tags: one label, everything about it.
 *
 * Creating and editing are the same pane rather than a dialog and a pane. The
 * fields are identical, and a separate create dialog is a second copy of every
 * validation rule that has to be kept in step with this one.
 *
 * The name is only editable while creating. `torrents/editCategory` takes the
 * name as the key of what to change, so the API has no rename: doing it
 * properly means create, move every member across, remove the old one. That is
 * a real operation with a real failure mode halfway through, not a text field,
 * so it is not offered as one.
 */
export function LabelEditor({
  kind,
  draft,
  onChange,
  editing,
  members,
  freeSpace,
  dirty,
  onSave,
  onCancel,
  onDelete,
  className,
}: LabelEditorProps) {
  const isCategory = kind === 'category'
  const set = <K extends keyof LabelDraft>(key: K, value: LabelDraft[K]) =>
    onChange({ ...draft, [key]: value })

  const used = members.reduce((total, t) => total + t.completed, 0)
  const nameTaken = !editing && draft.name.trim().length === 0

  return (
    <div className={cn('flex min-w-0 flex-1 flex-col', className)}>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <div className="flex flex-col gap-5">
          <section className="flex flex-col gap-2">
            <SectionHeader>Name</SectionHeader>
            <Input
              size="lg"
              value={draft.name}
              disabled={Boolean(editing)}
              onChange={(e) => set('name', e.target.value)}
              aria-label={`${isCategory ? 'Category' : 'Tag'} name`}
              placeholder={isCategory ? 'Documentaries' : 'archive'}
            />
            <p className="text-[11.5px] leading-[1.55] text-text-dim">
              {editing
                ? isCategory
                  ? 'The API has no rename. Changing a category name means creating the new one, moving every torrent across and removing the old one, so it is not offered here.'
                  : 'The API has no rename for tags either. Create the new one and delete this one.'
                : isCategory
                  ? 'Torrents added with this category go to its save path.'
                  : 'Tags are free-form labels. A torrent can carry many.'}
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <SectionHeader>Colour</SectionHeader>
            <SwatchRow
              value={draft.color}
              onChange={(next) => set('color', next)}
              label={`${isCategory ? 'Category' : 'Tag'} colour`}
            />
          </section>

          {isCategory ? (
            <section className="flex flex-col gap-2">
              <SectionHeader>Icon</SectionHeader>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_ICON_KEYS.map((key) => {
                  const Glyph = categoryIcons[key]
                  const chosen = draft.icon === key
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={chosen}
                      aria-label={key}
                      onClick={() => set('icon', key)}
                      className={cn(
                        'rounded-lg p-0.5 transition-shadow duration-quick',
                        chosen && 'ring-2 ring-accent',
                      )}
                    >
                      <IconTile size={30} color={swatchColor(draft.color)}>
                        <Glyph className="size-[15px]" strokeWidth={2} />
                      </IconTile>
                    </button>
                  )
                })}
              </div>
            </section>
          ) : null}

          {isCategory ? (
            <Card title="Save location" api="torrents/editCategory" padding="section">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Input
                    mono
                    value={draft.savePath}
                    onChange={(e) => set('savePath', e.target.value)}
                    aria-label="Category save path"
                    placeholder="Default from preferences"
                    className="min-w-0 flex-1"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!canReachDesktop()}
                    title={canReachDesktop() ? undefined : 'Available in the desktop app'}
                    onClick={() => {
                      void pickFolder(draft.savePath).then((chosen) => {
                        if (chosen) set('savePath', chosen)
                      })
                    }}
                  >
                    Browse
                  </Button>
                </div>

                <div className="flex items-start gap-3">
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[12.5px] font-semibold text-text">
                      Manage this path automatically
                    </span>
                    <span className="text-[11.5px] text-text-dim">
                      Torrents move here when the category changes.
                    </span>
                  </span>
                  <Switch
                    checked={draft.managed}
                    onChange={(next) => set('managed', next)}
                    label="Manage this path automatically"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3 rounded-lg bg-surface2 px-3.5 py-3">
                  {[
                    { label: 'Free space', value: freeSpace > 0 ? formatBytes(freeSpace, 0) : '—' },
                    { label: 'Used here', value: used > 0 ? formatBytes(used) : '—' },
                    { label: 'Torrents affected', value: String(members.length) },
                  ].map((stat) => (
                    <span key={stat.label} className="flex min-w-0 flex-col gap-1">
                      <SectionHeader>{stat.label}</SectionHeader>
                      <span className="font-mono text-[12.5px] text-text tabular-nums">
                        {stat.value}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          ) : null}

          <Card
            title={`Torrents ${isCategory ? 'in' : 'tagged'} ${draft.name || 'this label'}`}
            api="torrents/info"
            padding="none"
          >
            {members.length === 0 ? (
              <p className="px-[18px] py-5 text-[12.5px] text-text-dim">
                {editing
                  ? `Nothing carries this ${kind} yet.`
                  : `Torrents will appear here once they carry this ${kind}.`}
              </p>
            ) : (
              members.map((torrent) => (
                <div
                  key={torrent.hash}
                  className="grid grid-cols-[1fr_120px_90px_110px] items-center gap-3 border-t border-line px-[18px] py-2.5 first:border-t-0"
                >
                  <span className="min-w-0 truncate text-[12.5px] text-text" title={torrent.name}>
                    {torrent.name}
                  </span>
                  <span className="flex items-center gap-2">
                    <ProgressBar
                      className="flex-1"
                      value={torrent.progress * 100}
                      height={4}
                      label={torrent.name}
                    />
                    <span className="shrink-0 font-mono text-[10.5px] text-text-dim tabular-nums">
                      {formatPercent(torrent.progress)}
                    </span>
                  </span>
                  <span className="text-right font-mono text-[11px] text-text-dim tabular-nums">
                    {formatBytes(torrent.size)}
                  </span>
                  <StatusDot
                    tone={stateTone(torrent.state)}
                    label={STATE_LABEL[torrent.state]}
                    className="justify-self-end"
                  />
                </div>
              ))
            )}
          </Card>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 border-t border-line bg-sidebar px-6 py-3.5">
        {editing ? (
          <>
            <Button variant="secondary" size="sm" onClick={onDelete}>
              Delete {kind}
            </Button>
            <span className="font-mono text-[10.5px] text-text-dimmer">
              {isCategory
                ? 'Torrents stay. They lose the category and keep their files.'
                : 'Torrents stay. They lose the tag and keep their files.'}
            </span>
          </>
        ) : null}
        <span className="flex-1" />
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={!dirty}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={onSave} disabled={!dirty || nameTaken}>
          {editing ? 'Save changes' : `Create ${kind}`}
        </Button>
      </div>
    </div>
  )
}
