import { EmptyState } from '@/components/ui/empty-state'
import { icons } from '@/lib/icons'

export interface PlaceholderProps {
  title: string
  tier: 'MVP' | 'V1' | 'V2'
  api: string
}

/**
 * Stands in for a screen that is designed but not built.
 *
 * It is deliberately an EmptyState rather than a blank div, so the shell is
 * exercising a real component and the milestone is visible while clicking
 * through.
 */
export function Placeholder({ title, tier, api }: PlaceholderProps) {
  return (
    <EmptyState
      icon={<icons.folder className="size-6" strokeWidth={1.7} />}
      title={title}
      body={`Designed and specified, not yet built. Scheduled for ${tier}. This screen will exercise ${api}.`}
    />
  )
}
