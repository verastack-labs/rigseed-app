import { useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { LabelEditor, type LabelDraft } from '@/features/labels/label-editor'
import { LabelList, type LabelSummary } from '@/features/labels/label-list'
import { DEFAULT_CATEGORY_ICON, swatchFor } from '@/lib/labels'
import { useApi } from '@/services/api-context'
import { categoryStyle, tagColor, useLabelStore } from '@/state/label-store'
import { selectTorrentList, useTorrentStore } from '@/state/torrent-store'
import { useSyncPoll } from '@/state/use-sync-poll'

type Kind = 'category' | 'tag'

/** A torrent's tags, as a list rather than the comma string the API sends. */
const tagsOf = (raw: string) =>
  raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)

/**
 * Categories & tags.
 *
 * Two kinds of label on one screen, because they are the same job: name a
 * group of torrents so it can be found again. They differ in exactly two ways
 * and the screen shows both. A category is exclusive and owns a save path; a
 * tag is free-form and a torrent can carry many.
 *
 * The list comes from the sync loop rather than its own request. The store
 * already holds every category and tag the daemon knows, including the empty
 * ones, and a second poller for the same data is a second thing that can be
 * stale.
 */
export function Categories() {
  useSyncPoll()
  const api = useApi()

  const torrents = useTorrentStore(useShallow(selectTorrentList))
  const categories = useTorrentStore(useShallow((s) => s.categories))
  const tags = useTorrentStore(useShallow((s) => s.tags))
  const freeSpace = useTorrentStore((s) => s.serverState?.free_space_on_disk ?? 0)

  const styles = useLabelStore()

  const [kind, setKind] = useState<Kind>('category')
  const [filter, setFilter] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<LabelDraft | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isCategory = kind === 'category'

  /** Everything the row and the editor need, derived once per render. */
  const items: LabelSummary[] = useMemo(() => {
    const names = isCategory ? Object.keys(categories) : [...tags]
    return names
      .map((name) => {
        const members = torrents.filter((t) =>
          isCategory ? t.category === name : tagsOf(t.tags).includes(name),
        )
        const size = members.reduce((total, t) => total + t.size, 0)
        const style = categoryStyle(styles, name)
        return {
          name,
          sub: isCategory
            ? categories[name]?.savePath || 'default save path'
            : `used on ${members.length} torrent${members.length === 1 ? '' : 's'}`,
          color: isCategory ? style.color : tagColor(styles, name),
          ...(isCategory ? { icon: style.icon } : {}),
          count: members.length,
          size,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [isCategory, categories, tags, torrents, styles])

  const members = useMemo(() => {
    const name = draft?.name
    if (!name) return []
    return torrents.filter((t) =>
      isCategory ? t.category === name : tagsOf(t.tags).includes(name),
    )
  }, [draft?.name, isCategory, torrents])

  /** What the editor started from, for the dirty check and for Cancel. */
  const original = useMemo((): LabelDraft | null => {
    if (!editing) return null
    const style = categoryStyle(styles, editing)
    return {
      name: editing,
      color: isCategory ? style.color : tagColor(styles, editing),
      icon: style.icon,
      savePath: isCategory ? (categories[editing]?.savePath ?? '') : '',
      managed: isCategory ? torrents.some((t) => t.category === editing && t.auto_tmm) : false,
    }
  }, [editing, isCategory, categories, styles, torrents])

  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(original)

  const choose = (name: string) => {
    setEditing(name)
    const style = categoryStyle(styles, name)
    setDraft({
      name,
      color: isCategory ? style.color : tagColor(styles, name),
      icon: style.icon,
      savePath: isCategory ? (categories[name]?.savePath ?? '') : '',
      managed: isCategory ? torrents.some((t) => t.category === name && t.auto_tmm) : false,
    })
  }

  const startNew = () => {
    setEditing(null)
    setDraft({
      name: '',
      color: swatchFor(''),
      icon: DEFAULT_CATEGORY_ICON,
      savePath: '',
      managed: false,
    })
  }

  const switchKind = (next: Kind) => {
    setKind(next)
    setEditing(null)
    setDraft(null)
    setFilter('')
  }

  const save = async () => {
    if (!draft) return
    const name = draft.name.trim()
    if (!name) return

    if (isCategory) {
      // create and edit take the same two arguments; which one applies is
      // whether the daemon already knows the name.
      if (editing) await api.torrents.editCategory(name, draft.savePath)
      else await api.torrents.createCategory(name, draft.savePath)

      styles.setCategoryStyle(name, { icon: draft.icon, color: draft.color })

      // Automatic management is a property of a torrent, not of a category:
      // qBittorrent has no per-category flag for it. The switch therefore
      // means "manage the torrents in this category", which is the only thing
      // it can honestly do.
      if (original && draft.managed !== original.managed) {
        const affected = torrents.filter((t) => t.category === name).map((t) => t.hash)
        if (affected.length) await api.torrents.setAutoManagement(affected, draft.managed)
      }
    } else {
      if (!editing) await api.torrents.createTags([name])
      styles.setTagColor(name, draft.color)
    }

    setEditing(name)
  }

  const remove = async () => {
    if (!editing) return
    if (isCategory) {
      await api.torrents.removeCategories([editing])
      styles.forgetCategory(editing)
    } else {
      await api.torrents.deleteTags([editing])
      styles.forgetTag(editing)
    }
    setConfirmDelete(false)
    setEditing(null)
    setDraft(null)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-start gap-6 border-b border-line px-6 py-5">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h1 className="text-[30px] leading-none font-semibold tracking-[-0.02em] text-text">
            Categories &amp; tags
          </h1>
          <p className="text-[12.5px] leading-[1.55] text-text-dim">
            Categories set a save path and can manage it automatically. Tags are free-form labels a
            torrent can carry many of.
          </p>
        </div>
        <SegmentedControl<Kind>
          label="Label kind"
          value={kind}
          onChange={switchKind}
          options={[
            { value: 'category', label: `Categories ${Object.keys(categories).length}` },
            { value: 'tag', label: `Tags ${tags.length}` },
          ]}
        />
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="flex w-[440px] shrink-0 flex-col">
          <div className="shrink-0 border-b border-line bg-sidebar px-3.5 pt-3">
            <Button variant="primary" size="sm" fullWidth onClick={startNew}>
              New {kind}
            </Button>
          </div>
          <LabelList
            className="min-h-0 w-full flex-1"
            items={items}
            selected={editing}
            onSelect={choose}
            filter={filter}
            onFilter={setFilter}
            api={isCategory ? 'torrents/categories' : 'torrents/tags'}
            noun={kind}
            plural={isCategory ? 'categories' : 'tags'}
          />
        </div>

        {draft ? (
          <LabelEditor
            kind={kind}
            draft={draft}
            onChange={setDraft}
            editing={editing}
            members={members}
            freeSpace={freeSpace}
            dirty={dirty}
            onSave={() => void save()}
            onCancel={() => setDraft(original)}
            onDelete={() => setConfirmDelete(true)}
          />
        ) : (
          <div className="flex min-w-0 flex-1 items-center justify-center px-6">
            <p className="max-w-[380px] text-center text-[12.5px] leading-[1.6] text-text-dim">
              Pick {isCategory ? 'a category' : 'a tag'} to edit it, or make a new one. Nothing is
              written until you save.
            </p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${editing}?`}
        body={
          isCategory
            ? 'The torrents in it stay, and keep their files. They lose the category and go back to being uncategorised.'
            : 'The torrents carrying it stay, and keep their files. They lose the tag.'
        }
        confirmLabel={`Delete ${kind}`}
        onConfirm={() => void remove()}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
