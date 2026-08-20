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
