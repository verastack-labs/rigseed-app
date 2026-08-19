import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { FormDialog } from '@/components/ui/form-dialog'
import { Input } from '@/components/ui/input'

const base = { open: true, title: 'New category' }

describe('FormDialog', () => {
  it('shows the api endpoint in mono', () => {
    render(
      <FormDialog {...base} onCancel={vi.fn()} onSubmit={vi.fn()} api="torrents/createCategory">
        <Input aria-label="Name" />
      </FormDialog>,
    )
    expect(screen.getByText('torrents/createCategory').className).toContain('font-mono')
  })

  it('submits on Enter from a field, without each caller wiring it', async () => {
    const onSubmit = vi.fn()
    render(
      <FormDialog {...base} onCancel={vi.fn()} onSubmit={onSubmit}>
        <Input aria-label="Name" />
      </FormDialog>,
    )
    await userEvent.type(screen.getByLabelText('Name'), 'Documentaries{Enter}')
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('submits from the footer button', async () => {
    const onSubmit = vi.fn()
    render(
      <FormDialog {...base} onCancel={vi.fn()} onSubmit={onSubmit} submitLabel="Create category">
        <Input aria-label="Name" />
      </FormDialog>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Create category' }))
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('does not submit while the submit button is disabled', async () => {
    const onSubmit = vi.fn()
    render(
      <FormDialog {...base} onCancel={vi.fn()} onSubmit={onSubmit} submitDisabled>
        <Input aria-label="Name" />
      </FormDialog>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Create' }), {
      pointerEventsCheck: 0,
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('cancels without submitting', async () => {
    const onCancel = vi.fn()
    const onSubmit = vi.fn()
    render(
      <FormDialog {...base} onCancel={onCancel} onSubmit={onSubmit}>
        <Input aria-label="Name" />
      </FormDialog>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
