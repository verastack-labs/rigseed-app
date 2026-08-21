import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SectionHeader } from '@/components/ui/section-header'
import { Switch } from '@/components/ui/switch'
import { icons } from '@/lib/icons'
import { cn } from '@/lib/utils'
import type { RssArticle, RssRule } from '@/types/qbittorrent'

export interface RuleEditorProps {
  name: string
  rule: RssRule
  onChange: (next: RssRule) => void
  /** Recent articles from the feeds this rule covers, for the preview. */
  candidates: readonly RssArticle[]
  categories: readonly string[]
  className?: string
}

export interface Verdict {
  caught: boolean
  /** Why, in the rule's own terms. */
  reason: string
}

/**
 * Would this rule catch that article, and why.
 *
 * Reimplemented here rather than asked of the daemon on every keystroke.
 * `rss/matchingArticles` answers for the *saved* rule, so it can say nothing
 * about the one being edited, and a preview that lags a save is not a preview.
 *
 * qBittorrent's own semantics, which are not obvious: in plain mode both
 * fields are comma-separated lists of terms, a term matches if the title
 * contains it, case is ignored, and *must contain* is satisfied by any one
 * term rather than all of them. Getting that backwards makes every multi-term
 * rule look broken.
 */
export function verdictFor(rule: RssRule, title: string): Verdict {
  const haystack = title.toLowerCase()

  const terms = (raw: string): string[] =>
    rule.useRegex
      ? raw.trim()
        ? [raw.trim()]
        : []
      : raw
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean)

  const hits = (term: string): boolean => {
    if (!rule.useRegex) return haystack.includes(term)
    try {
      return new RegExp(term, 'i').test(title)
    } catch {
      // An unfinished pattern is a normal state while typing, not an error
      // worth colouring the whole preview red for.
      return false
    }
  }

  const banned = terms(rule.mustNotContain).find(hits)
  if (banned) return { caught: false, reason: `excluded: ${banned}` }

  const required = terms(rule.mustContain)
  if (required.length > 0 && !required.some(hits)) {
    return { caught: false, reason: `no ${required.join(' or ')}` }
  }

  return { caught: true, reason: 'matches' }
}

/**
 * The three cards of a rule.
 *
 * The third is the one worth having. A rule is a pair of text fields whose
 * effect is invisible until something either downloads or does not, hours
 * later, so the preview says what it would do to items already on screen.
 */
export function RuleEditor({
  name,
  rule,
  onChange,
  candidates,
  categories,
  className,
}: RuleEditorProps) {
  const set = <K extends keyof RssRule>(key: K, value: RssRule[K]) =>
    onChange({ ...rule, [key]: value })

  const verdicts = candidates.map((article) => ({
    article,
    verdict: verdictFor(rule, article.title),
  }))
  const caught = verdicts.filter((v) => v.verdict.caught).length

  return (
    <div className={cn('flex flex-col gap-4 px-6 py-5', className)}>
      <Card
        title="Match"
        api="rss/setRule"
        padding="section"
        action={
          <span className="flex items-center gap-2">
            <span className="text-[11.5px] font-semibold text-text-dim">
              {rule.enabled ? 'Running' : 'Paused'}
            </span>
            <Switch
              checked={rule.enabled}
              onChange={(next) => set('enabled', next)}
              label={`${name} is running`}
            />
          </span>
        }
      >
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <SectionHeader>Must contain</SectionHeader>
            <Input
              mono
              value={rule.mustContain}
              onChange={(e) => set('mustContain', e.target.value)}
              aria-label="Must contain"
              placeholder="1080p, WEB-DL"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <SectionHeader>Must not contain</SectionHeader>
            <Input
              mono
              value={rule.mustNotContain}
              onChange={(e) => set('mustNotContain', e.target.value)}
              aria-label="Must not contain"
              placeholder="x265, batch"
            />
          </label>

          <div className="flex items-start gap-3">
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[12.5px] font-semibold text-text">
                Treat as a regular expression
              </span>
              <span className="text-[11.5px] text-text-dim">
                {rule.useRegex
                  ? 'Both fields are read as patterns.'
                  : 'Plain text, comma separated. Any one term is enough, and case is ignored.'}
              </span>
            </span>
            <Switch
              checked={rule.useRegex}
              onChange={(next) => set('useRegex', next)}
              label="Treat as a regular expression"
            />
          </div>
        </div>
      </Card>

      <Card title="Where matches go" api="rss/setRule" padding="section">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex min-w-0 flex-col gap-1.5">
            <SectionHeader>Category</SectionHeader>
            <Input
              list="rule-categories"
              value={rule.assignedCategory}
              onChange={(e) => set('assignedCategory', e.target.value)}
              aria-label="Category"
              placeholder="none"
            />
            <datalist id="rule-categories">
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </label>

          <label className="flex min-w-0 flex-col gap-1.5">
            <SectionHeader>Save to</SectionHeader>
            <Input
              mono
              value={rule.savePath}
              onChange={(e) => set('savePath', e.target.value)}
              aria-label="Save to"
              placeholder="Default from preferences"
            />
          </label>
        </div>
      </Card>

      <Card
        title="What this rule would catch"
        api="rss/matchingArticles"
        padding="none"
        action={
          <span className="font-mono text-[10.5px] text-text-dimmer tabular-nums">
            {caught} of last {verdicts.length}
          </span>
        }
      >
        {verdicts.length === 0 ? (
          <p className="px-[18px] py-5 text-[12.5px] text-text-dim">
            Nothing recent from the feeds this rule covers, so there is nothing to try it on.
          </p>
        ) : (
          verdicts.map(({ article, verdict }) => (
            <div
              key={article.id}
              className="flex items-center gap-3 border-t border-line px-[18px] py-2.5 first:border-t-0"
            >
              {verdict.caught ? (
                <icons.complete className="size-[15px] shrink-0 text-ok" strokeWidth={2} />
              ) : (
                <icons.clear className="size-[15px] shrink-0 text-text-dimmer" strokeWidth={2} />
              )}
              <span
                className={cn(
                  'min-w-0 flex-1 truncate text-[12.5px]',
                  verdict.caught ? 'text-text' : 'text-text-dim',
                )}
                title={article.title}
              >
                {article.title}
              </span>
              <span className="shrink-0 font-mono text-[10.5px] text-text-dimmer">
                {verdict.reason}
              </span>
            </div>
          ))
        )}
      </Card>
    </div>
  )
}
