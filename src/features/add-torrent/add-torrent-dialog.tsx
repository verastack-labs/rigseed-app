import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { CategoryPicker, type NewCategory } from '@/features/add-torrent/category-picker'
import { ContentsTable } from '@/features/add-torrent/contents-table'
import { PRIORITY, selectedSize, type Priority } from '@/features/add-torrent/priority'
import { OptionsCard, type AddOptions } from '@/features/add-torrent/options-card'
import { SavePathField } from '@/features/add-torrent/save-path-field'
import { SourcePicker, type Source } from '@/features/add-torrent/source-picker'
import { TagPicker, type NewTag } from '@/features/add-torrent/tag-picker'
import { useApi } from '@/services/context'
import { useLabelStore } from '@/state/label-store'
import { formatBytes } from '@/utils/format'
import {
  TorrentParseError,
  infoHash,
  readTorrentFile,
  type TorrentMeta,
} from '@/utils/torrent-file'

const DEFAULT_OPTIONS: AddOptions = {
  start: true,
  skipChecking: false,
  sequential: false,
  autoTMM: false,
}

export interface AddTorrentDialogProps {
  onClose: () => void
  /** Which control opened it, so the right source starts selected. */
  initialSource?: Source
  categories: readonly string[]
  tags: readonly string[]
  freeSpace: number
  defaultSavePath?: string
}

/** One link per line, blank lines dropped. */
function magnetLinks(raw: string): string[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

/**
 * The Add Torrent modal.
 *
 * Everything the sections collect is assembled here and sent as one
 * `torrents/add`, with one exception the API forces: file priorities have no
 * add-time parameter, so a torrent with files deselected is added whole and
 * then narrowed by `torrents/filePrio`. That second call needs a hash, which
 * is why the parser computes one rather than waiting for the torrent to
 * surface in a later sync.
 *
 * There is no `open` prop. The caller mounts this when the modal should be
 * open and unmounts it when it should not, which is what makes every field
 * start from its initial value again. Keeping it mounted and clearing the
 * fields in an effect was the first attempt, and it means a modal that has to
 * remember to forget: miss one field and the second torrent someone adds
 * quietly inherits the first one's category.
 */
export function AddTorrentDialog({
  onClose,
  initialSource = 'file',
  categories,
  tags,
  freeSpace,
  defaultSavePath = '',
}: AddTorrentDialogProps) {
  const api = useApi()
  const setCategoryStyle = useLabelStore((s) => s.setCategoryStyle)
  const setTagColor = useLabelStore((s) => s.setTagColor)

  const [source, setSource] = useState<Source>(initialSource)
  const [file, setFile] = useState<File | null>(null)
  const [meta, setMeta] = useState<TorrentMeta | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [magnet, setMagnet] = useState('')
  const [savePath, setSavePath] = useState(defaultSavePath)
  const [category, setCategory] = useState('')
  const [chosenTags, setChosenTags] = useState<string[]>([])
  const [options, setOptions] = useState<AddOptions>(DEFAULT_OPTIONS)
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [busy, setBusy] = useState(false)

  const takeFiles = async (files: File[]) => {
    const picked = files[0]
    if (!picked) return
    setFile(picked)
    setMeta(null)
    setFileError(null)
    setSource('file')
    try {
      const parsed = await readTorrentFile(picked)
      setMeta(parsed)
      setPriorities(parsed.entries.map(() => PRIORITY.normal))
    } catch (error) {
      setMeta(null)
      setPriorities([])
      setFileError(error instanceof TorrentParseError ? error.message : 'could not read this file')
    }
  }

  const createCategory = async ({ name, savePath: path, style }: NewCategory) => {
    await api.torrents.createCategory(name, path)
    setCategoryStyle(name, style)
    setCategory(name)
  }

  const createTag = async ({ name, color }: NewTag) => {
    await api.torrents.createTags([name])
    setTagColor(name, color)
    setChosenTags((prev) => [...prev, name])
  }

  const links = useMemo(() => magnetLinks(magnet), [magnet])
  const needed = meta ? selectedSize(meta.entries, priorities) : 0
  const ready = source === 'file' ? meta !== null : links.length > 0

  const submit = async () => {
    if (!ready || busy) return
    setBusy(true)
    try {
      await api.torrents.add({
        // Spread rather than an undefined value: exactOptionalPropertyTypes
        // means an absent key and a key set to undefined are different things,
        // and absent is what "no magnet links" should be.
        ...(source === 'magnet' ? { urls: links } : {}),
        ...(source === 'file' && file ? { files: [file] } : {}),
        savepath: savePath,
        category,
        tags: chosenTags,
        paused: !options.start,
        skip_checking: options.skipChecking,
        sequentialDownload: options.sequential,
        autoTMM: options.autoTMM,
      })

      // Only when the selection actually differs from the default. The extra
      // round trips are pointless otherwise, and every one of them is a chance
      // to fail after a successful add.
      if (meta && priorities.some((p) => p !== PRIORITY.normal)) {
        const hash = await infoHash(meta)
        const indices = (want: Priority) => priorities.flatMap((p, i) => (p === want ? [i] : []))

        const skipped = indices(PRIORITY.skip)
        const maxed = indices(PRIORITY.max)
        if (skipped.length) await api.torrents.filePrio(hash, skipped, PRIORITY.skip)
        if (maxed.length) await api.torrents.filePrio(hash, maxed, PRIORITY.max)
      }

      onClose()
    } finally {
      setBusy(false)
    }
  }

  const total =
    source === 'file'
      ? meta
        ? `${formatBytes(needed)} selected`
        : 'no file chosen'
      : links.length === 1
        ? '1 link'
        : `${links.length} links`

  return (
    <Dialog
      open
      onClose={onClose}
      showClose
      width={900}
      title="Add torrent"
      description={<span className="font-mono text-[10.5px]">torrents/add</span>}
      icon={<Plus className="size-[17px]" strokeWidth={2.4} />}
      footer={
        <>
          <span className="font-mono text-[10.5px] text-text-dimmer">{total}</span>
          <span className="flex-1" />
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!ready || busy} onClick={() => void submit()}>
            {options.start ? 'Add and start' : 'Add paused'}
          </Button>
        </>
      }
    >
      {/* A drop anywhere on the panel, not only on the dashed zone. Someone
          dragging a file at a 900px modal is not aiming at a 60px target. */}
      <div
        className="flex flex-col gap-[18px] pb-4"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          const dropped = Array.from(e.dataTransfer.files)
          if (!dropped.length) return
          e.preventDefault()
          void takeFiles(dropped)
        }}
      >
        <SourcePicker
          source={source}
          onSource={setSource}
          file={file}
          meta={meta}
          fileError={fileError}
          onFiles={(files) => void takeFiles(files)}
          magnet={magnet}
          onMagnet={setMagnet}
        />

        <div className="grid grid-cols-[1.4fr_1fr] gap-3.5">
          <SavePathField
            value={savePath}
            onChange={setSavePath}
            freeSpace={freeSpace}
            needed={needed}
            // Automatic Torrent Management picks the path from the category,
            // so leaving the field live would offer a choice the daemon then
            // ignores.
            disabled={options.autoTMM}
          />
          <CategoryPicker
            categories={categories}
            value={category}
            onChange={setCategory}
            onCreate={(next) => void createCategory(next)}
            defaultSavePath={defaultSavePath}
          />
        </div>

        <TagPicker
          tags={tags}
          value={chosenTags}
          onChange={setChosenTags}
          onCreate={(next) => void createTag(next)}
        />

        <OptionsCard value={options} onChange={setOptions} />

        {meta ? (
          <ContentsTable entries={meta.entries} priorities={priorities} onChange={setPriorities} />
        ) : null}
      </div>
    </Dialog>
  )
}
