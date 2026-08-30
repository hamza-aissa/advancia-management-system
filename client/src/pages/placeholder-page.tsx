import { CalendarCheck2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface PlaceholderPageProps { title: string; description: string; metric?: string }

export function PlaceholderPage({ title, description, metric = 'Prêt pour les données opérationnelles' }: PlaceholderPageProps) {
  return <div className="space-y-5"><div><h2 className="text-xl font-semibold">{title}</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p></div><div className="grid gap-3 sm:grid-cols-3">{['Expiré', 'Échéance sous 6 jours', 'Relances en retard'].map((label) => <Card key={label}><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-2 text-xl font-semibold">—</p></CardContent></Card>)}</div><div className="flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed bg-card px-6 text-center"><div className="mb-3 rounded-md bg-blue-50 p-2"><CalendarCheck2 className="size-5 text-primary" /></div><h3 className="font-semibold">{metric}</h3><p className="mt-1 max-w-md text-sm text-muted-foreground">Cette section est prête pour le flux métier associé au rôle.</p></div></div>
}
