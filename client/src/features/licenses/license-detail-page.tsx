import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarClock, CheckCircle2, History, Mail, RotateCw, UserRound, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, ErrorState, PageLoader } from '@/components/feedback'
import { getApiErrorMessage } from '@/lib/api'
import { LicenseActionDialog, type LicenseAction } from './license-dialogs'
import { licenseApi } from './license-api'
import { formatDate, personName, StatusBadge, UrgencyBadge } from './license-ui'

type ActionValues = { note?: string; nextFollowUpAt?: string; expiryDate?: string; value?: number; reason?: string }
const actionLabels: Record<string, string> = { created: 'Licence créée', updated: 'Licence modifiée', contacted: 'Client contacté', follow_up_scheduled: 'Relance planifiée', renewed: 'Licence renouvelée', declined: 'Renouvellement refusé' }

export function LicenseDetailPage() {
  const { id = '' } = useParams(); const queryClient = useQueryClient(); const [action, setAction] = useState<LicenseAction | null>(null)
  const license = useQuery({ queryKey: ['license', id], queryFn: () => licenseApi.get(id), enabled: Boolean(id) })
  const activity = useQuery({ queryKey: ['license-activity', id], queryFn: () => licenseApi.activity(id), enabled: Boolean(id) })
  const mutate = useMutation({ mutationFn: async ({ kind, values }: { kind: LicenseAction; values: ActionValues }) => {
    if (kind === 'contact') return licenseApi.contact(id, values.note)
    if (kind === 'followUp') return licenseApi.followUp(id, new Date(values.nextFollowUpAt!).toISOString(), values.note)
    if (kind === 'renew') return licenseApi.renew(id, values.expiryDate!, values.value, values.note)
    return licenseApi.decline(id, values.reason!, values.note)
  }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['license', id] }); queryClient.invalidateQueries({ queryKey: ['license-activity', id] }); queryClient.invalidateQueries({ queryKey: ['licenses'] }); setAction(null) } })
  if (license.isLoading || activity.isLoading) return <PageLoader label="Chargement de la licence" />
  if (license.isError || activity.isError || !license.data) return <ErrorState title="Impossible de charger cette licence" message={getApiErrorMessage(license.error || activity.error)} retry={() => { license.refetch(); activity.refetch() }} />
  const item = license.data
  return <div className="space-y-6"><Link to="/licenses" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Retour aux licences</Link>
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start"><div><div className="mb-2 flex flex-wrap gap-2"><UrgencyBadge urgency={item.urgency} days={item.daysUntilExpiry} /><StatusBadge status={item.renewalStatus} /></div><h1 className="text-xl font-semibold">{item.name}</h1><p className="mt-1 text-sm text-muted-foreground">{item.client.name} · {item.quantity ?? '—'} licences</p></div><div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"><Button variant="outline" onClick={() => setAction('contact')}><Mail />Contacté</Button><Button variant="outline" onClick={() => setAction('followUp')}><CalendarClock />Relance</Button><Button onClick={() => setAction('renew')}><RotateCw />Renouveler</Button><Button variant="destructive" onClick={() => setAction('decline')}><XCircle />Refuser</Button></div></div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,.6fr)]"><div className="space-y-6"><Card><CardHeader><CardTitle>Informations de la licence</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><Info label="Client" value={item.client.name} /><Info label="Responsable" value={personName(item.owner)} icon={<UserRound />} /><Info label="Date de début" value={formatDate(item.startDate)} /><Info label="Date d’échéance" value={formatDate(item.expiryDate)} /><Info label="Quantité" value={String(item.quantity ?? '—')} /><Info label="Valeur" value={item.value == null ? '—' : new Intl.NumberFormat('fr-TN').format(item.value)} />{item.nextFollowUpAt && <Info label="Prochaine relance" value={formatDate(item.nextFollowUpAt)} icon={<CalendarClock />} />}{item.declineReason && <Info label="Motif du refus" value={item.declineReason} />}{item.description && <div className="sm:col-span-2"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</p><p className="mt-2 text-sm leading-6">{item.description}</p></div>}</CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><History className="size-5" />Activité</CardTitle></CardHeader><CardContent>{activity.data?.length ? <ol className="space-y-5">{activity.data.map((entry) => <li key={entry._id} className="relative border-l pl-5"><span className="absolute -left-1.5 top-1 size-3 rounded-full border-2 border-white bg-primary" /><p className="text-sm font-semibold">{actionLabels[entry.action] || entry.action.replaceAll('_', ' ')}</p><p className="mt-1 text-xs text-muted-foreground">{personName(entry.performedBy)} · {formatDate(entry.createdAt)}</p>{entry.note && <p className="mt-2 rounded-md bg-slate-50 p-3 text-sm">{entry.note}</p>}</li>)}</ol> : <EmptyState title="Aucune activité" message="Les actions de renouvellement apparaîtront ici." />}</CardContent></Card></div>
      <Card className="h-fit"><CardHeader><CardTitle>Historique des renouvellements</CardTitle></CardHeader><CardContent>{item.renewalHistory.length ? <ol className="space-y-4">{item.renewalHistory.slice().reverse().map((entry, index) => <li key={`${entry.renewedAt}-${index}`} className="rounded-md border p-3"><div className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="size-4 text-emerald-600" />Renouvelé le {formatDate(entry.renewedAt)}</div><p className="mt-2 text-sm text-muted-foreground">{formatDate(entry.previousExpiryDate)} → {formatDate(entry.newExpiryDate)}</p><p className="mt-1 text-xs text-muted-foreground">Par {typeof entry.renewedBy === 'string' ? 'un membre de l’équipe' : personName(entry.renewedBy)}</p></li>)}</ol> : <p className="text-sm text-muted-foreground">Aucun renouvellement terminé.</p>}</CardContent></Card></div>
    <LicenseActionDialog action={action} busy={mutate.isPending} error={mutate.isError ? getApiErrorMessage(mutate.error, 'Impossible d’appliquer cette action.') : undefined} onClose={() => { setAction(null); mutate.reset() }} onSubmit={(values) => action && mutate.mutate({ kind: action, values })} />
  </div>
}

function Info({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) { return <div><p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{icon}{label}</p><p className="mt-1.5 text-sm font-medium">{value}</p></div> }
