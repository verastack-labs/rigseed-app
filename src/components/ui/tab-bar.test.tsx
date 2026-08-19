import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { TabBar } from '@/components/ui/tab-bar'

const tabs = [
  { value: 'general', label: 'General' },
  { value: 'files', label: 'Files', count: 7 },
  { value: 'peers', label: 'Peers' },
]

describe('TabBar', () => {
  it('exposes a tablist with one tab per entry', () => {
    render(<TabBar label="Torrent detail" tabs={tabs} value="general" />)
    expect(screen.getByRole('tablist', { name: 'Torrent detail' })).toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(3)
  })

  it('keeps only the selected tab in the page tab order', () => {
    render(<TabBar label="Torrent detail" tabs={tabs} value="files" />)
    expect(screen.getByRole('tab', { name: /Files/ })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: 'General' })).toHaveAttribute('tabindex', '-1')
  })

  it('moves right and wraps with the arrow keys', async () => {
    const onChange = vi.fn()
    render(<TabBar label="Detail" tabs={tabs} value="peers" onChange={onChange} />)
    screen.getByRole('tab', { name: 'Peers' }).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenCalledWith('general')
  })

  it('moves left and wraps with the arrow keys', async () => {
    const onChange = vi.fn()
    render(<TabBar label="Detail" tabs={tabs} value="general" onChange={onChange} />)
    screen.getByRole('tab', { name: 'General' }).focus()
    await userEvent.keyboard('{ArrowLeft}')
    expect(onChange).toHaveBeenCalledWith('peers')
  })

  it('jumps to the ends with Home and End', async () => {
    const onChange = vi.fn()
    render(<TabBar label="Detail" tabs={tabs} value="files" onChange={onChange} />)
    screen.getByRole('tab', { name: /Files/ }).focus()
    await userEvent.keyboard('{End}')
    expect(onChange).toHaveBeenCalledWith('peers')
    await userEvent.keyboard('{Home}')
    expect(onChange).toHaveBeenCalledWith('general')
  })

  it('renders a count badge when given one', () => {
    render(<TabBar label="Detail" tabs={tabs} value="general" />)
    expect(screen.getByText('7').className).toContain('font-mono')
  })
})
