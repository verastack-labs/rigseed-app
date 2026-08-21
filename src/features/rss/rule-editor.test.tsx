import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { RuleEditor, verdictFor } from '@/features/rss/rule-editor'
import type { RssArticle, RssRule } from '@/types/qbittorrent'

const rule = (over: Partial<RssRule> = {}): RssRule => ({
  enabled: true,
  mustContain: '',
  mustNotContain: '',
  useRegex: false,
  episodeFilter: '',
  smartFilter: false,
  previouslyMatchedEpisodes: [],
  affectedFeeds: [],
  ignoreDays: 0,
  lastMatch: '',
  addPaused: null,
  assignedCategory: '',
  savePath: '',
  ...over,
})

const article = (title: string, id = title): RssArticle => ({
  id,
  title,
  torrentURL: 'magnet:?xt=urn:btih:1',
  link: 'https://example.org/x',
  date: 'Wed, 20 Aug 2026 17:40:00 +0000',
})

describe('verdictFor', () => {
  it('catches everything when nothing is required or banned', () => {
    expect(verdictFor(rule(), 'anything at all').caught).toBe(true)
  })

  it('ignores case, as qBittorrent does', () => {
    expect(verdictFor(rule({ mustContain: 'AMD64' }), 'ubuntu-amd64.iso').caught).toBe(true)
  })

  it('needs any one term, not all of them', () => {
    // qBittorrent's own semantics, and the one that makes every multi-term
    // rule look broken if you get it backwards.
    const r = rule({ mustContain: '1080p, 2160p' })
    expect(verdictFor(r, 'Some Show 1080p WEB-DL').caught).toBe(true)
    expect(verdictFor(r, 'Some Show 2160p WEB-DL').caught).toBe(true)
    expect(verdictFor(r, 'Some Show 720p WEB-DL').caught).toBe(false)
  })

  it('names the terms it wanted when nothing matched', () => {
    const v = verdictFor(rule({ mustContain: '1080p, 2160p' }), 'Some Show 720p')
    expect(v.reason).toBe('no 1080p or 2160p')
  })

  it('lets must-not-contain win over must-contain', () => {
    const r = rule({ mustContain: '1080p', mustNotContain: 'x265' })
    const v = verdictFor(r, 'Some Show 1080p x265')
    expect(v.caught).toBe(false)
    expect(v.reason).toBe('excluded: x265')
  })

  it('reads both fields as patterns in regex mode', () => {
    const r = rule({ mustContain: 'S\\d\\dE\\d\\d', useRegex: true })
    expect(verdictFor(r, 'Some Show S02E11 1080p').caught).toBe(true)
    expect(verdictFor(r, 'Some Show 1080p').caught).toBe(false)
  })

  it('does not treat commas as separators in regex mode', () => {
    // A comma is a legal thing to match on in a pattern, so splitting on it
    // would quietly break every regex containing one.
    const r = rule({ mustContain: 'a{1,2}b', useRegex: true })
    expect(verdictFor(r, 'xxaabyy').caught).toBe(true)
  })

  it('treats an unfinished pattern as matching nothing, not as an error', () => {
    // Half-typed regex is a normal state, not a reason to colour the preview
    // red or throw.
    const r = rule({ mustContain: '([', useRegex: true })
    expect(() => verdictFor(r, 'anything')).not.toThrow()
    expect(verdictFor(r, 'anything').caught).toBe(false)
  })
})

const setup = (props: Partial<React.ComponentProps<typeof RuleEditor>> = {}) =>
  render(
    <RuleEditor
      name="Linux releases"
      rule={rule({ mustContain: 'amd64' })}
      onChange={vi.fn()}
      candidates={[article('ubuntu-amd64.iso'), article('ubuntu-arm64.iso')]}
      categories={['Software']}
      {...props}
    />,
  )

describe('RuleEditor', () => {
  it('says whether the rule is running, in words as well as a switch', () => {
    setup()
    expect(screen.getByText('Running')).toBeInTheDocument()
    setup({ rule: rule({ enabled: false }) })
    expect(screen.getByText('Paused')).toBeInTheDocument()
  })

  it('reports an edit rather than holding its own copy', () => {
    const onChange = vi.fn()
    setup({ onChange })
    fireEvent.change(screen.getByLabelText('Must not contain'), { target: { value: 'x265' } })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ mustNotContain: 'x265' }))
  })

  it('changes the hint with the mode, since the syntax changes with it', () => {
    setup()
    expect(screen.getByText(/comma separated/)).toBeInTheDocument()
    setup({ rule: rule({ useRegex: true }) })
    expect(screen.getByText('Both fields are read as patterns.')).toBeInTheDocument()
  })

  it('previews the rule against real items, with a reason each', () => {
    // A rule is two text fields whose effect is otherwise invisible until
    // something downloads or does not, hours later.
    setup()
    expect(screen.getByText('matches')).toBeInTheDocument()
    expect(screen.getByText('no amd64')).toBeInTheDocument()
  })

  it('counts the hits in the header', () => {
    setup()
    expect(screen.getByText('1 of last 2')).toBeInTheDocument()
  })

  it('says so when there is nothing to preview against', () => {
    setup({ candidates: [] })
    expect(screen.getByText(/nothing to try it on/)).toBeInTheDocument()
  })
})
