import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
}

export function Dialog({ open, onOpenChange, title, description, children }: DialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false)
      if (event.key !== 'Tab' || !panelRef.current) return
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>('button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])')).filter((item) => !item.hasAttribute('disabled'))
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus())
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
      previous?.focus()
    }
  }, [open, onOpenChange])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onOpenChange(false) }}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-xl border bg-card shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b bg-card px-6 py-5">
          <div><h2 id={titleId} className="text-lg font-semibold">{title}</h2>{description && <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>
          <Button type="button" variant="ghost" size="icon" aria-label="Close dialog" onClick={() => onOpenChange(false)}><X /></Button>
        </div>
        {children}
      </div>
    </div>
  )
}
