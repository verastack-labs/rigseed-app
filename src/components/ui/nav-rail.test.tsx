import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { NavRail } from '@/components/ui/nav-rail'
import { RailItem } from '@/components/ui/rail-item'

const items = <RailItem icon={<i />} label="Transfers" />

describe('NavRail', () => {
  it('is a labelled navigation landmark', () => {
    render(
      <NavRail expanded={false} onToggle={vi.fn()}>
        {items}
      </NavRail>,
    )
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
  })

  it('changes width rather than layout, so the page never reflows', () => {
    const { rerender } = render(
      <NavRail expanded={false} onToggle={vi.fn()}>
        {items}
      </NavRail>,
    )
    const rail = screen.getByRole('navigation')
    expect(rail.className).toContain('w-[60px]')
    expect(rail.className).toContain('fixed')
    rerender(
      <NavRail expanded onToggle={vi.fn()}>
        {items}
      </NavRail>,
    )
    expect(screen.getByRole('navigation').className).toContain('w-[212px]')
  })

  it('drops a scrim only while expanded', () => {
    const { container, rerender } = render(
      <NavRail expanded={false} onToggle={vi.fn()}>
        {items}
      </NavRail>,
    )
    expect(container.querySelector('[role="presentation"]')).toBeNull()
    rerender(
      <NavRail expanded onToggle={vi.fn()}>
        {items}
      </NavRail>,
    )
    expect(container.querySelector('[role="presentation"]')).toBeTruthy()
  })

  it('collapses when the scrim is clicked', async () => {
    const onToggle = vi.fn()
    const { container } = render(
      <NavRail expanded onToggle={onToggle}>
        {items}
      </NavRail>,
    )
    await userEvent.click(container.querySelector('[role="presentation"]')!)
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it('collapses on Escape, per the keyboard map', async () => {
    const onToggle = vi.fn()
    render(
      <NavRail expanded onToggle={onToggle}>
        {items}
      </NavRail>,
    )
    screen.getByRole('button', { name: 'Transfers' }).focus()
    await userEvent.keyboard('{Escape}')
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it('ignores Escape when already collapsed', async () => {
    const onToggle = vi.fn()
    render(
      <NavRail expanded={false} onToggle={onToggle}>
        {items}
      </NavRail>,
    )
    screen.getByRole('button', { name: 'Transfers' }).focus()
    await userEvent.keyboard('{Escape}')
    expect(onToggle).not.toHaveBeenCalled()
  })
})
