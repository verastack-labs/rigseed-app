import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'

export interface FormDialogProps {
  open: boolean
  onCancel: () => void
  onSubmit: () => void
  title: string
  description?: ReactNode
  /** The API endpoint this dialog exercises, shown in mono in the footer. */
  api?: string
  submitLabel?: string
  submitDisabled?: boolean
  icon?: ReactNode
  width?: number
  /** The fields. Supplied by the calling screen. */
  children: ReactNode
}

/**
 * Every add or create dialog.
 *
 * The frame, the footer and the submit behaviour are shared; the fields belong
 * to the screen. Submitting is wired to a real form, so Enter works from any
 * field without each caller reimplementing it.
 */
export function FormDialog({
  open,
  onCancel,
  onSubmit,
  title,
  description,
  api,
  submitLabel = 'Create',
  submitDisabled,
  icon,
  width = 460,
  children,
}: FormDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      icon={icon}
      width={width}
      footer={
        <>
          {api ? <span className="text-text-dimmer font-mono text-[10.5px]">{api}</span> : null}
          <span className="flex-1" />
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" disabled={submitDisabled} form="rs-form-dialog" type="submit">
            {submitLabel}
          </Button>
        </>
      }
    >
      <form
        id="rs-form-dialog"
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit()
        }}
        className="flex flex-col gap-3.5 pb-2"
      >
        {children}
      </form>
    </Dialog>
  )
}
