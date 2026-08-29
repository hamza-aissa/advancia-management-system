import { AlertCircle, Inbox, LoaderCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

export function PageLoader({ label = 'Loading workspace' }: { label?: string }) {
  return <div className="flex min-h-64 items-center justify-center" role="status"><div className="flex items-center gap-3 text-sm text-muted-foreground"><LoaderCircle className="size-5 animate-spin text-primary" />{label}</div></div>
}

export function ErrorState({ title = 'Unable to load this view', message, retry }: { title?: string; message?: string; retry?: () => void }) {
  return <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-950"><AlertCircle className="mb-4 size-5 text-red-600" /><h2 className="font-semibold">{title}</h2><p className="mt-1 max-w-lg text-sm text-red-800">{message || 'An unexpected error occurred. Please try again.'}</p>{retry && <Button variant="outline" size="sm" className="mt-4 border-red-300 bg-white" onClick={retry}>Try again</Button>}</div>
}

export function EmptyState({ title = 'Nothing here yet', message, action }: { title?: string; message?: string; action?: ReactNode }) {
  return <div className="flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed bg-card px-6 text-center"><div className="mb-4 rounded-full bg-muted p-3"><Inbox className="size-5 text-muted-foreground" /></div><h2 className="font-semibold">{title}</h2>{message && <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p>}{action && <div className="mt-4">{action}</div>}</div>
}
