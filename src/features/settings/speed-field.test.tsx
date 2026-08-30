import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SpeedField } from '@/features/settings/speed-field'

const setup = (bytesPerSecond: number) => {
  const onChange = vi.fn<(bytesPerSecond: number) => void>()
  render(<SpeedField bytesPerSecond={bytesPerSecond} onChange={onChange} label="Upload limit" />)
  return { onChange, field: screen.getByLabelText('Upload limit') }
}

describe('SpeedField', () => {
  it('shows KiB for the bytes the daemon sends', () => {
    // The bug this replaces: the raw byte value went straight into a box
    // labelled KiB/s, so qBittorrent's own 10 KiB/s default for the
    // alternative limits read as 10240 KiB/s.
    const { field } = setup(10_240)
    expect(field).toHaveValue(10)
  })

  it('saves bytes for the KiB that were typed', async () => {
    // The worse direction. Typing 500 meaning 500 KiB/s used to save 500 bytes
    // per second, which is half a KiB, and a connection throttled to nothing
    // reads as the app being broken rather than as a unit mistake.
    const { onChange, field } = setup(0)
    await userEvent.clear(field)
    await userEvent.type(field, '500')
    await userEvent.tab()
    expect(onChange).toHaveBeenLastCalledWith(500 * 1024)
  })

  it('keeps zero as zero in both directions', async () => {
    // Zero is how this screen says unlimited, so a conversion that rounded it
    // to anything else would silently cap a connection that had no cap.
    const { onChange, field } = setup(0)
    expect(field).toHaveValue(0)

    await userEvent.clear(field)
    await userEvent.type(field, '0')
    await userEvent.tab()
    expect(onChange).toHaveBeenLastCalledWith(0)
  })

  it('round-trips a value without drifting', async () => {
    const { onChange, field } = setup(7_168)
    expect(field).toHaveValue(7)

    await userEvent.clear(field)
    await userEvent.type(field, '7')
    await userEvent.tab()
    expect(onChange).toHaveBeenLastCalledWith(7_168)
  })

  it('does not put a fraction in the box for a value that is not whole KiB', () => {
    // qBittorrent stores whole KiB so every value it sends divides evenly, but
    // a number box is the wrong place to discover otherwise.
    const { field } = setup(1_500)
    expect(field).toHaveValue(1)
  })
})
