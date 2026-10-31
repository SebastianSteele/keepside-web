import { useEffect, type RefObject } from 'react'

const focusable = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'

export function useDialogFocus(dialogRef: RefObject<HTMLElement | null>, onClose?: () => void) {
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const elements = () => [...dialog.querySelectorAll<HTMLElement>(focusable)].filter((element) => !element.hidden)
    const focusFrame = requestAnimationFrame(() => {
      const items = elements()
      if (!dialog.contains(document.activeElement) || document.activeElement !== dialog && !items.includes(document.activeElement as HTMLElement)) (items[0] ?? dialog).focus()
    })
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onClose) { event.preventDefault(); onClose(); return }
      if (event.key !== 'Tab') return
      const items = elements()
      if (!items.length) { event.preventDefault(); dialog.focus(); return }
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    dialog.addEventListener('keydown', handleKey)
    return () => {
      cancelAnimationFrame(focusFrame)
      dialog.removeEventListener('keydown', handleKey)
      previous?.focus()
    }
  }, [dialogRef, onClose])
}
