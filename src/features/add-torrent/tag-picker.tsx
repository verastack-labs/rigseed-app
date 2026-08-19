import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { Input } from '@/components/ui/input'
import { SectionHeader } from '@/components/ui/section-header'
import { SwatchRow } from '@/components/ui/swatch-row'
import { swatchColor, type SwatchKey } from '@/lib/labels'
import { tagColor, useLabelStore } from '@/state/label-store'

export interface NewTag {
  name: string
  color: SwatchKey
}

export interface TagPickerProps {
  tags: readonly string[]
  /** Tags chosen for this torrent. Unlike a category, more than one. */
  value: readonly string[]
  onChange: (next: string[]) => void
  onCreate: (tag: NewTag) => void
}

/**
 * Tag chips plus a slimmer inline creator.
 *
 * Tags differ from categories in exactly one way that matters to the UI: a
 * torrent has many. So the chips toggle rather than replace, and the creator
 * has no save path to ask about, which is why it is a single row rather than
 * the grid the category creator needs.
 */
export function TagPicker({ tags, value, onChange, onCreate }: TagPickerProps) {
  const styles = useLabelStore()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState<SwatchKey>('blue')

  const trimmed = name.trim()
  const taken = tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())
  const canCreate = trimmed.length > 0 && !taken

  const toggle = (tag: string) =>
    onChange(value.includes(tag) ? value.filter((t) => t !== tag) : [...value, tag])

  const submit = () => {
    if (!canCreate) return
    onCreate({ name: trimmed, color })
    setCreating(false)
  }

  return (
    <section className="flex min-w-0 flex-col gap-2">
      <SectionHeader>Tags</SectionHeader>

      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Chip
            key={tag}
            dot
            label={tag}
            selected={value.includes(tag)}
            color={swatchColor(tagColor(styles, tag))}
            onClick={() => toggle(tag)}
          />
        ))}
        <Chip
          dashed
          label="New tag"
          onClick={() => {
            setName('')
            setColor('blue')
            setCreating(true)
          }}
        />
      </div>

      {creating ? (
        <div className="flex flex-col gap-3 rounded-[11px] border border-accent bg-surface2 p-4">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="size-[9px] shrink-0 rounded-full"
              style={{ background: swatchColor(color) }}
            />
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. long-seed"
              aria-label="Tag name"
              invalid={taken}
              className="w-[260px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  submit()
                }
              }}
            />
            <span className="flex-1" />
            <span className="font-mono text-[10.5px] text-text-dimmer">torrents/createTags</span>
          </div>

          {taken ? (
            <span role="alert" className="font-mono text-[10.5px] text-danger">
              {trimmed} already exists
            </span>
          ) : null}

          <div className="flex items-center gap-2.5">
            <SectionHeader>Colour</SectionHeader>
            <SwatchRow label="Tag colour" value={color} onChange={setColor} />
          </div>

          <div className="flex items-center gap-2">
            <span className="flex-1" />
            <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" disabled={!canCreate} onClick={submit}>
              Create tag
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
