import { useEffect, useState } from 'react'

import { Input } from '@/components/ui/input'

export interface NumberFieldProps {
  value: number
  onChange: (next: number) => void
  label: string
  /** Fixed unit to the right, for example "KiB/s" or "ports". */
  unit?: string
  min?: number
  width?: number
  disabled?: boolean
}

/**
 * A number you can clear while typing.
 *
 * Bound straight to a number, clearing 500 to type 800 goes through the empty
 * string, `Number('')` is 0, and the field either snaps to 0 under the cursor
 * or writes 0 into the draft. Both are wrong, and the second one is a real
 * change to a running daemon if anything applies before the second keystroke.
 *
 * So the field holds text and reports numbers. Empty and half-typed states
 * live here and are never sent up; the parent's value only moves when what is
 * in the box parses. The effect resyncs the text when the value changes from
 * outside, which is what Revert does.
 */
export function NumberField({
  value,
  onChange,
  label,
  unit,
  min = 0,
  width = 92,
  disabled,
}: NumberFieldProps) {
  const [text, setText] = useState(String(value))

  useEffect(() => {
    setText((current) => (Number(current) === value ? current : String(value)))
  }, [value])

  return (
    <Input
      mono
      type="number"
      inputMode="numeric"
      min={min}
      value={text}
      disabled={disabled}
      aria-label={label}
      style={{ width }}
      {...(unit ? { unit } : {})}
      onChange={(e) => {
        const next = e.target.value
        setText(next)
        if (next.trim() === '') return
        const parsed = Number(next)
        if (Number.isFinite(parsed)) onChange(parsed)
      }}
      onBlur={() => {
        // Leaving the field empty means the last good value, not zero.
        if (text.trim() === '' || !Number.isFinite(Number(text))) setText(String(value))
      }}
    />
  )
}
