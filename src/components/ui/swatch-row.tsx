import { SWATCHES, swatchColor, type SwatchKey } from '@/lib/labels'
import { cn } from '@/lib/utils'

export interface SwatchRowProps {
  value: SwatchKey
  onChange: (next: SwatchKey) => void
  /** Accessible name for the group, for example "Category colour". */
  label: string
  size?: number
  className?: string
}

/**
 * The colour picker for a category or a tag.
 *
 * A radiogroup rather than a row of buttons: exactly one is chosen, arrow keys
 * should move between them, and the swatches carry no text, so the name has to
 * come from somewhere. Each one is named for its colour rather than "Colour 3",
 * which is the difference between a usable list and an inventory.
 */
export function SwatchRow({ value, onChange, label, size = 22, className }: SwatchRowProps) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex flex-wrap gap-2', className)}>
      {SWATCHES.map((swatch) => {
        const selected = swatch.key === value
        return (
          <button
            key={swatch.key}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={swatch.label}
            title={swatch.label}
            // Only the chosen one is in the tab order. Tab reaches the group,
            // arrows move inside it, which is how a radiogroup is meant to
            // behave and stops eight swatches becoming eight tab stops.
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(swatch.key)}
            onKeyDown={(event) => {
              const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0
              if (step === 0) return
              event.preventDefault()
              const at = SWATCHES.findIndex((s) => s.key === value)
              const next = SWATCHES[(at + step + SWATCHES.length) % SWATCHES.length]!
              onChange(next.key)
              const group = event.currentTarget.parentElement
              group?.querySelector<HTMLElement>(`[aria-label="${next.label}"]`)?.focus()
            }}
            className={cn(
              'shrink-0 rounded-full border-2 transition-transform duration-quick',
              selected ? 'scale-110' : 'border-transparent hover:scale-105',
            )}
            style={{
              width: size,
              height: size,
              background: swatchColor(swatch.key),
              borderColor: selected ? 'var(--text)' : undefined,
            }}
          />
        )
      })}
    </div>
  )
}
