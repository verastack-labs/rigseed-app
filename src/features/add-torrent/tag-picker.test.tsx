import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TagPicker, type TagPickerProps } from '@/features/add-torrent/tag-picker'
import { useLabelStore } from '@/state/label-store'

const base: TagPickerProps = {
  tags: ['iso', 'verified', 'seed-forever'],
  value: [],
  onChange: vi.fn(),
  onCreate: vi.fn(),
}

const setup = (props: Partial<TagPickerProps> = {}) => render(<TagPicker {...base} {...props} />)
const openCreator = () => fireEvent.click(screen.getByRole('button', { name: /New tag/ }))

describe('TagPicker', () => {
  beforeEach(() => {
    useLabelStore.getState().reset()
    localStorage.clear()
  })

  it('adds to the selection rather than replacing it', () => {
    // The one difference from categories that reaches the UI: a torrent has
    // many tags, so the chips toggle.
    const onChange = vi.fn()
    setup({ value: ['iso'], onChange })

    fireEvent.click(screen.getByRole('button', { name: /verified/ }))
    expect(onChange).toHaveBeenCalledWith(['iso', 'verified'])
  })

  it('removes a tag that was already chosen', () => {
    const onChange = vi.fn()
    setup({ value: ['iso', 'verified'], onChange })

    fireEvent.click(screen.getByRole('button', { name: /iso/ }))
    expect(onChange).toHaveBeenCalledWith(['verified'])
  })

  it('marks the chosen chips as pressed', () => {
    setup({ value: ['verified'] })
    expect(screen.getByRole('button', { name: /verified/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /^iso/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('creates a tag with the colour chosen', () => {
    const onCreate = vi.fn()
    setup({ onCreate })
    openCreator()

    fireEvent.change(screen.getByLabelText('Tag name'), { target: { value: ' long-seed ' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Mustard' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create tag' }))

    expect(onCreate).toHaveBeenCalledWith({ name: 'long-seed', color: 'mustard' })
    expect(screen.queryByLabelText('Tag name')).not.toBeInTheDocument()
  })

  it('refuses an empty or duplicate name', () => {
    setup()
    openCreator()
    expect(screen.getByRole('button', { name: 'Create tag' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Tag name'), { target: { value: 'ISO' } })
    expect(screen.getByRole('alert')).toHaveTextContent('ISO already exists')
    expect(screen.getByRole('button', { name: 'Create tag' })).toBeDisabled()
  })

  it('submits on Enter', () => {
    const onCreate = vi.fn()
    setup({ onCreate })
    openCreator()

    fireEvent.change(screen.getByLabelText('Tag name'), { target: { value: 'rare' } })
    fireEvent.keyDown(screen.getByLabelText('Tag name'), { key: 'Enter' })
    expect(onCreate).toHaveBeenCalledWith({ name: 'rare', color: 'blue' })
  })

  it('discards a half-filled form when reopened', () => {
    setup()
    openCreator()
    fireEvent.change(screen.getByLabelText('Tag name'), { target: { value: 'abandoned' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    openCreator()
    expect(screen.getByLabelText('Tag name')).toHaveValue('')
  })
})
