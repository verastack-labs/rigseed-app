import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SettingRow } from '@/features/settings/setting-row'

describe('SettingRow', () => {
  it('puts the label and its control together', () => {
    render(
      <SettingRow label="Pre-allocate disk space" hint="Reserves the full size up front.">
        <button type="button">toggle</button>
      </SettingRow>,
    )
    expect(screen.getByText('Pre-allocate disk space')).toBeInTheDocument()
    expect(screen.getByText('Reserves the full size up front.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'toggle' })).toBeInTheDocument()
  })

  it('leaves the hint out when the label already says everything', () => {
    render(
      <SettingRow label="Listening port">
        <span>x</span>
      </SettingRow>,
    )
    expect(screen.getByText('Listening port').parentElement?.parentElement).not.toHaveTextContent(
      'undefined',
    )
  })

  it('marks an unapplied edit, and says so to a screen reader', () => {
    render(
      <SettingRow label="DHT" dirty>
        <span>x</span>
      </SettingRow>,
    )
    expect(screen.getByLabelText('changed, not yet applied')).toBeInTheDocument()
  })

  it('marks nothing when the row matches what is saved', () => {
    render(
      <SettingRow label="DHT">
        <span>x</span>
      </SettingRow>,
    )
    expect(screen.queryByLabelText('changed, not yet applied')).not.toBeInTheDocument()
  })
})

describe('a row waiting on a switch elsewhere', () => {
  it('dims the label and the hint, not just the control', () => {
    // Disabling the control alone was not enough. A greyed input under a
    // label and hint at full strength reads as a field that ought to work and
    // does not, rather than as one waiting on the switch above it.
    render(
      <SettingRow label="Incomplete path" hint="Only used while the switch above is on." inactive>
        <input aria-label="Incomplete path" disabled />
      </SettingRow>,
    )
    expect(screen.getByText('Incomplete path').className).toContain('text-text-dimmer')
    expect(screen.getByText(/Only used while/).className).toContain('text-text-dimmer')
  })

  it('leaves an active row at full strength', () => {
    render(
      <SettingRow label="Incomplete path" hint="Only used while the switch above is on.">
        <input aria-label="Incomplete path" />
      </SettingRow>,
    )
    expect(screen.getByText('Incomplete path').className).not.toContain('text-text-dimmer')
  })

  it('dims presentation only, leaving the control to say it is disabled', () => {
    // Assistive technology reads the control's own disabled state. Dimming is
    // for the eye and must not be the only signal.
    render(
      <SettingRow label="Incomplete path" inactive>
        <input aria-label="Incomplete path" disabled />
      </SettingRow>,
    )
    expect(screen.getByLabelText('Incomplete path')).toBeDisabled()
  })
})
