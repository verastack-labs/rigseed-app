import { useState } from 'react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog } from '@/components/ui/dialog'

export interface ConfirmDialogProps {
  open: boolean
  onCancel: () => void
  /** Receives the optional checkbox state, for "also delete files on disk". */
  onConfirm: (optionChecked: boolean) => void
  title: string
  /** Name the consequence. "Torrents are not deleted, they lose the label." */
  body: ReactNode
  /** The thing being acted on, shown in mono under the body. */
  target?: string
  confirmLabel?: string
  /** Adds a checkbox above the footer. Always defaults to off. */
  optionLabel?: string
  icon?: ReactNode
  /** Neutral for a non-destructive ask. Destructive is the default. */
  tone?: 'danger' | 'neutral'
}

/**
 * Every destructive confirmation.
 *
 * The option checkbox defaults to off and stays off between openings. It is
 * the "also delete the files on disk" case, and a remembered yes there is a
 * data-loss bug rather than a convenience.
 */
export function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title,
  body,
  target,
  confirmLabel = 'Confirm',
  optionLabel,
  icon,
  tone = 'danger',
}: ConfirmDialogProps) {
  const [optionChecked, setOptionChecked] = useState(false)

  const close = () => {
    setOptionChecked(false)
    onCancel()
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title={title}
      description={body}
      icon={icon}
      tone={tone === 'danger' ? 'danger' : 'accent'}
      width={440}
      footer={
        <>
          {optionLabel ? (
            <label className="text-text-dim flex cursor-pointer items-center gap-2.5 text-[12px]">
              <Checkbox checked={optionChecked} onChange={setOptionChecked} label={optionLabel} />
              {optionLabel}
            </label>
          ) : null}
          <span className="flex-1" />
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onClick={() => {
              onConfirm(optionChecked)
              setOptionChecked(false)
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {target ? (
        <div className="bg-surface2 border-line text-text truncate rounded-lg border px-3 py-2.5 font-mono text-[11.5px]">
          {target}
        </div>
      ) : null}
    </Dialog>
  )
}
