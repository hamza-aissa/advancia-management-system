import { CalendarCheck2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface PlaceholderPageProps { title: string; description: string; metric?: string }

export function PlaceholderPage({ title, description, metric = 'Ready for operational data' }: PlaceholderPageProps) {
  return <div className="space-y-6"><div><h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p></div><div className="grid gap-4 sm:grid-cols-3">{['Expired', 'Due within 6 days', 'Follow-ups overdue'].map((label) => <Card key={label}><CardContent className="p-5"><p className="text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground">{label}</p><p className="mt-3 text-3xl font-semibold tracking-tight">—</p></CardContent></Card>)}</div><div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed bg-card px-6 text-center"><div className="mb-4 rounded-full bg-blue-50 p-3"><CalendarCheck2 className="size-5 text-primary" /></div><h3 className="font-semibold">{metric}</h3><p className="mt-1 max-w-md text-sm text-muted-foreground">This route is connected to the application shell and ready for its role-specific workflow.</p></div></div>
}
