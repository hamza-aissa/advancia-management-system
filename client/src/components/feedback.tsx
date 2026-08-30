import { AlertCircle, Inbox } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

export function PageLoader({ label = 'Chargement de l’espace de travail' }: { label?: string }) {
  return <div className="space-y-2 rounded-lg border bg-card p-3" role="status" aria-label={label}>{[0, 1, 2, 3, 4].map((row) => <div key={row} className="h-8 animate-pulse rounded-md bg-muted" />)}<span className="sr-only">{label}</span></div>
}

export function ErrorState({ title = 'Impossible de charger cette vue', message, retry }: { title?: string; message?: string; retry?: () => void }) {
  return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-950"><AlertCircle className="mb-3 size-5 text-red-600" /><h2 className="font-semibold">{title}</h2><p className="mt-1 max-w-lg text-sm text-red-800">{message || 'Une erreur inattendue est survenue. Veuillez réessayer.'}</p>{retry && <Button variant="outline" size="sm" className="mt-3 border-red-300 bg-white" onClick={retry}>Réessayer</Button>}</div>
}

export function EmptyState({ title = 'Aucune donnée', message, action }: { title?: string; message?: string; action?: ReactNode }) {
  return <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 px-6 text-center"><div className="mb-3 rounded-md bg-muted p-2"><Inbox className="size-5 text-muted-foreground" /></div><h2 className="text-sm font-medium">{title}</h2>{message && <p className="mt-1 max-w-md text-xs text-muted-foreground">{message}</p>}{action && <div className="mt-4">{action}</div>}</div>
}
