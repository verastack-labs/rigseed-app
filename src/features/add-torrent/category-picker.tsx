import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { IconButton } from '@/components/ui/icon-button'
import { Input } from '@/components/ui/input'
import { SectionHeader } from '@/components/ui/section-header'
import { SwatchRow } from '@/components/ui/swatch-row'
import { categoryIcons } from '@/lib/icons'
import {
  CATEGORY_ICON_KEYS,
  DEFAULT_CATEGORY_ICON,
  swatchColor,
  type CategoryIconKey,
  type SwatchKey,
} from '@/lib/labels'
import { categoryStyle, useLabelStore, type CategoryStyle } from '@/state/label-store'

export interface NewCategory {
  name: string
  savePath: string
  style: CategoryStyle
}

export interface CategoryPickerProps {
  categories: readonly string[]
  value: string
  onChange: (next: string) => void
  /** Creates it, selects it and closes the panel, in that order. */
  onCreate: (category: NewCategory) => void
  /** Prefix the new-category save path starts from. */
  defaultSavePath?: string
}

/**
 * Category chips plus the inline creator.
 *
 * Creating happens here rather than sending the user to the Categories screen
 * and back. The reason someone opens this panel is to file the torrent they
 * are adding; a trip elsewhere loses the half-filled form they were in the
 * middle of.
 */
export function CategoryPicker({
  categories,
  value,
  onChange,
  onCreate,
  defaultSavePath = '',
}: CategoryPickerProps) {
  const styles = useLabelStore()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [savePath, setSavePath] = useState(defaultSavePath)
  const [icon, setIcon] = useState<CategoryIconKey>(DEFAULT_CATEGORY_ICON)
  const [color, setColor] = useState<SwatchKey>('blue')

  const taken = categories.some((c) => c.toLowerCase() === name.trim().toLowerCase())
  const canCreate = name.trim().length > 0 && !taken

  const open = () => {
    setName('')
    setSavePath(defaultSavePath)
    setIcon(DEFAULT_CATEGORY_ICON)
    setColor('blue')
    setCreating(true)
  }

  const submit = () => {
    if (!canCreate) return
    onCreate({ name: name.trim(), savePath: savePath.trim(), style: { icon, color } })
    setCreating(false)
  }

  const Preview = categoryIcons[icon]

  return (
    <section className="flex min-w-0 flex-col gap-2">
      <SectionHeader>Category</SectionHeader>

      <div className="flex flex-wrap gap-2">
        {categories.map((category) => {
          const style = categoryStyle(styles, category)
          const Icon = categoryIcons[style.icon]
          return (
            <Chip
              key={category}
              label={category}
              selected={category === value}
              color={swatchColor(style.color)}
              icon={<Icon className="size-[13px]" strokeWidth={2} />}
              // Clicking the chosen one clears it. Otherwise the only way back
              // to no category is to reopen the panel.
              onClick={() => onChange(category === value ? '' : category)}
            />
          )
        })}
        <Chip dashed label="New" onClick={open} />
      </div>

      {creating ? (
        <div className="flex flex-col gap-3 rounded-[11px] border border-accent bg-surface2 p-4">
          <div className="flex items-center gap-2.5">
            <span
              className="flex size-[30px] shrink-0 items-center justify-center rounded-lg"
              style={{
                background: `color-mix(in srgb, ${swatchColor(color)} 18%, transparent)`,
                color: swatchColor(color),
              }}
            >
              <Preview className="size-[15px]" strokeWidth={2} />
            </span>
            <span className="text-[12.5px] font-semibold text-text">New category</span>
            <span className="flex-1" />
            <span className="font-mono text-[10.5px] text-text-dimmer">
              torrents/createCategory
            </span>
          </div>

          {/* Stacks below 520px so the two fields never squeeze to the point
              where a save path shows four characters. */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_1.2fr]">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Documentaries"
              aria-label="Category name"
              invalid={taken}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  submit()
                }
              }}
            />
            <Input
              mono
              value={savePath}
              onChange={(e) => setSavePath(e.target.value)}
              placeholder="Save path"
              aria-label="Category save path"
            />
          </div>

          {taken ? (
            <span role="alert" className="font-mono text-[10.5px] text-danger">
              {name.trim()} already exists
            </span>
          ) : null}

          <div className="flex items-center gap-2.5">
            <SectionHeader>Icon</SectionHeader>
            <div role="radiogroup" aria-label="Category icon" className="flex flex-wrap gap-1.5">
              {CATEGORY_ICON_KEYS.map((key) => {
                const Option = categoryIcons[key]
                return (
                  <IconButton
                    key={key}
                    title={key}
                    role="radio"
                    aria-checked={key === icon}
                    active={key === icon}
                    onClick={() => setIcon(key)}
                  >
                    <Option className="size-[15px]" strokeWidth={2} />
                  </IconButton>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <SectionHeader>Colour</SectionHeader>
            <SwatchRow label="Category colour" value={color} onChange={setColor} />
          </div>

          <div className="flex items-center gap-2">
            <span className="flex-1" />
            <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" disabled={!canCreate} onClick={submit}>
              Create category
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
