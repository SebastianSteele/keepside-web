import { useRef, type ReactNode } from 'react'
import { Icon } from './Icon'
import { useDialogFocus } from './useDialogFocus'

interface ModalProps {
  title: string
  subtitle?: string
  children: ReactNode
  onClose: () => void
  wide?: boolean
  dismissible?: boolean
}

export function Modal({ title, subtitle, children, onClose, wide, dismissible = true }: ModalProps) {
  const dialogRef = useRef<HTMLElement>(null)
  useDialogFocus(dialogRef, dismissible ? onClose : undefined)

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => dismissible && event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} className={`modal${wide ? ' modal--wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1}>
        <header className="modal__header">
          <div><h2 id="modal-title">{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
          <button type="button" className="icon-button" disabled={!dismissible} onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </header>
        {children}
      </section>
    </div>
  )
}

export function Field({ label, children, span }: { label: string; children: ReactNode; span?: boolean }) {
  return <label className={span ? 'field field--span' : 'field'}><span>{label}</span>{children}</label>
}
