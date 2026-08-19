import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CategoryPicker, type CategoryPickerProps } from '@/features/add-torrent/category-picker'
import { useLabelStore } from '@/state/label-store'

const base: CategoryPickerProps = {
  categories: ['Linux', 'Film', 'Archives'],
  value: '',
  onChange: vi.fn(),
  onCreate: vi.fn(),
}

const setup = (props: Partial<CategoryPickerProps> = {}) =>
  render(<CategoryPicker {...base} {...props} />)

const openCreator = () => fireEvent.click(screen.getByRole('button', { name: /New/ }))

describe('CategoryPicker', () => {
  beforeEach(() => {
    useLabelStore.getState().reset()
    localStorage.clear()
  })

  it('offers one chip per category plus a way to add', () => {
    setup()
    for (const name of base.categories) {
      expect(screen.getByRole('button', { name: new RegExp(name) })).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: /New/ })).toBeInTheDocument()
  })

  it('selects a category', () => {
    const onChange = vi.fn()
    setup({ onChange })
    fireEvent.click(screen.getByRole('button', { name: /Film/ }))
    expect(onChange).toHaveBeenCalledWith('Film')
  })

  it('clears the selection when the chosen chip is clicked again', () => {
    // Otherwise there is no way back to no category short of reopening the
    // whole panel.
    const onChange = vi.fn()
    setup({ value: 'Film', onChange })
    fireEvent.click(screen.getByRole('button', { name: /Film/ }))
    expect(onChange).toHaveBeenCalledWith('')
  })

  it('keeps the creator closed until asked', () => {
    setup()
    expect(screen.queryByLabelText('Category name')).not.toBeInTheDocument()
    openCreator()
    expect(screen.getByLabelText('Category name')).toBeInTheDocument()
    expect(screen.getByText('torrents/createCategory')).toBeInTheDocument()
  })

  it('creates with the name, path, icon and colour chosen', () => {
    const onCreate = vi.fn()
    setup({ onCreate })
    openCreator()

    fireEvent.change(screen.getByLabelText('Category name'), {
      target: { value: '  Documentaries  ' },
    })
    fireEvent.change(screen.getByLabelText('Category save path'), {
      target: { value: '/downloads/docs' },
    })
    fireEvent.click(screen.getByRole('radio', { name: 'Sage' }))
    fireEvent.click(screen.getByRole('radio', { name: 'disc' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create category' }))

    expect(onCreate).toHaveBeenCalledWith({
      // Trimmed: a trailing space produces a second category the daemon treats
      // as distinct and the user cannot tell apart.
      name: 'Documentaries',
      savePath: '/downloads/docs',
      style: { icon: 'disc', color: 'sage' },
    })
  })

  it('closes the creator once it has created', () => {
    setup()
    openCreator()
    fireEvent.change(screen.getByLabelText('Category name'), { target: { value: 'Docs' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create category' }))
    expect(screen.queryByLabelText('Category name')).not.toBeInTheDocument()
  })

  it('refuses an empty name', () => {
    setup()
    openCreator()
    expect(screen.getByRole('button', { name: 'Create category' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Category name'), { target: { value: '   ' } })
    expect(screen.getByRole('button', { name: 'Create category' })).toBeDisabled()
  })

  it('refuses a name that already exists, whatever its case', () => {
    const onCreate = vi.fn()
    setup({ onCreate })
    openCreator()

    fireEvent.change(screen.getByLabelText('Category name'), { target: { value: 'linux' } })
    expect(screen.getByRole('alert')).toHaveTextContent('linux already exists')
    expect(screen.getByRole('button', { name: 'Create category' })).toBeDisabled()

    fireEvent.keyDown(screen.getByLabelText('Category name'), { key: 'Enter' })
    expect(onCreate).not.toHaveBeenCalled()
  })

  it('submits on Enter from the name field', () => {
    const onCreate = vi.fn()
    setup({ onCreate })
    openCreator()

    fireEvent.change(screen.getByLabelText('Category name'), { target: { value: 'Docs' } })
    fireEvent.keyDown(screen.getByLabelText('Category name'), { key: 'Enter' })
    expect(onCreate).toHaveBeenCalledOnce()
  })

  it('discards a half-filled form when reopened', () => {
    setup()
    openCreator()
    fireEvent.change(screen.getByLabelText('Category name'), { target: { value: 'Abandoned' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    openCreator()
    expect(screen.getByLabelText('Category name')).toHaveValue('')
  })

  it('starts the save path from the default when there is one', () => {
    setup({ defaultSavePath: '/downloads/' })
    openCreator()
    expect(screen.getByLabelText('Category save path')).toHaveValue('/downloads/')
  })
})
