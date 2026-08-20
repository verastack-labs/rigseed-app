import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { LabelList, type LabelSummary } from '@/features/labels/label-list'

const items: LabelSummary[] = [
  { name: 'Movies', sub: '/media/movies', color: 'amber', icon: 'disc', count: 12, size: 5_000 },
  { name: 'Music', sub: '/media/music', color: 'violet', icon: 'disc', count: 3, size: 0 },
]

const setup = (props: Partial<React.ComponentProps<typeof LabelList>> = {}) =>
  render(
    <LabelList
      items={items}
      selected={null}
      onSelect={vi.fn()}
      filter=""
      onFilter={vi.fn()}
      api="torrents/categories"
      noun="category"
      plural="categories"
      {...props}
    />,
  )

describe('LabelList', () => {
  it('shows a row per label with its count', () => {
    setup()
    expect(screen.getByText('Movies')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('marks the selected row rather than styling it silently', () => {
    setup({ selected: 'Music' })
    expect(screen.getByRole('button', { name: /Music/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Movies/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('reports which row was chosen', () => {
    const onSelect = vi.fn()
    setup({ onSelect })
    fireEvent.click(screen.getByRole('button', { name: /Movies/ }))
    expect(onSelect).toHaveBeenCalledWith('Movies')
  })

  it('narrows on a substring, since the list is already in front of you', () => {
    setup({ filter: 'mus' })
    expect(screen.queryByText('Movies')).not.toBeInTheDocument()
    expect(screen.getByText('Music')).toBeInTheDocument()
  })

  it('says nothing matched rather than showing an empty list', () => {
    setup({ filter: 'zzz' })
    expect(screen.getByText('No category matches "zzz".')).toBeInTheDocument()
  })

  it('distinguishes an empty list from a filtered-out one', () => {
    setup({ items: [] })
    expect(screen.getByText('No categories yet.')).toBeInTheDocument()
  })

  it('shows a dash rather than 0 B for a label with nothing in it', () => {
    // Zero bytes across three torrents is a number that reads as a bug. It
    // means the daemon has not reported sizes yet, not that the files are
    // empty.
    setup()
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('counts what is showing against the total when filtered', () => {
    setup({ filter: 'mus' })
    expect(screen.getByText('1 of 2')).toBeInTheDocument()
  })

  it('names the endpoint the rows came from', () => {
    setup()
    expect(screen.getByText('torrents/categories')).toBeInTheDocument()
  })
})
