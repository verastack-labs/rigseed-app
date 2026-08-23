import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { AltSpeedToggle } from '@/features/transfers/alt-speed-toggle'

const setup = (props: Partial<React.ComponentProps<typeof AltSpeedToggle>> = {}) => {
  const onToggle = vi.fn()
  render(<AltSpeedToggle active={false} onToggle={onToggle} {...props} />)
  return { onToggle }
}

describe('AltSpeedToggle', () => {
  it('is a switch, not a button that looks like one', () => {
    // It has an on and an off, and a screen reader has to be told which.
    setup({ active: false })
    expect(screen.getByRole('switch')).not.toBeChecked()
    setup({ active: true })
    expect(screen.getAllByRole('switch')[1]).toBeChecked()
  })

  it('says which mode it is in, not only in colour', () => {
    // A turtle at 15px is not self-evident to anybody who has not met the
    // convention, and colour alone is never allowed to carry a state here.
    setup({ active: true })
    expect(screen.getByText('Limited')).toBeInTheDocument()
  })

  it('says full speed when the normal limits are in force', () => {
    setup({ active: false })
    expect(screen.getByText('Full speed')).toBeInTheDocument()
  })

  it('explains what pressing it will do', () => {
    setup({ active: false })
    expect(screen.getByRole('switch')).toHaveAttribute(
      'title',
      'Switch to the alternative speed limits.',
    )
  })

  it('asks the caller to flip it rather than holding its own state', () => {
    // The daemon's own scheduler flips this on a timetable and another client
    // can flip it too, so the switch must follow the daemon rather than lead.
    const { onToggle } = setup({ active: false })
    return userEvent.click(screen.getByRole('switch')).then(() => {
      expect(onToggle).toHaveBeenCalledOnce()
    })
  })

  it('goes quiet while the daemon is not answering', async () => {
    const { onToggle } = setup({ offline: true })
    expect(screen.getByRole('switch')).toBeDisabled()
    await userEvent.click(screen.getByRole('switch'))
    expect(onToggle).not.toHaveBeenCalled()
  })
})

describe('narrow windows', () => {
  it('drops the word and keeps the icon, the title and the name', () => {
    // At the minimum supported window the toolbar cannot carry every label.
    // The icon is the only thing that survives, so everything that names the
    // control has to stay attached to it.
    setup({ active: true })
    const sw = screen.getByRole('switch')
    expect(sw.querySelector('svg')).toBeInTheDocument()
    expect(sw).toHaveAttribute('aria-label', 'Alternative speed limits')
    expect(screen.getByText('Limited').className).toContain('hidden')
    expect(screen.getByText('Limited').className).toContain('xl:inline')
  })
})
