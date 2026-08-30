import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarClock, CheckCircle2, Pencil, PhoneCall, RefreshCw, UserRoundCog, XCircle } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, ErrorState, PageLoader } from '@/components/feedback'
import { useAuth } from '@/contexts/auth-context'
import { getApiErrorMessage } from '@/lib/api'
import { contractsApi } from './contracts-api'
import { catalogApi } from '@/features/catalogs'
import { AssignDialog, ContactDialog, ContractFormDialog, DeclineDialog, FollowUpDialog, RenewDialog, type ContractFormValues, type DeclineValues, type RenewValues } from './contract-dialogs'
import { clientName, entityId, personName } from './types'
import { formatDate, formatMoney, StatusBadge, UrgencyBadge } from './contract-ui'

type DialogName = 'edit' | 'contact' | 'follow-up' | 'renew' | 'decline' | 'assign' | null
const activityLabels = { created: 'Contrat créé', updated: 'Contrat modifié', contacted: 'Client contacté', follow_up_scheduled: 'Relance planifiée', renewed: 'Contrat renouvelé', declined: 'Renouvellement refusé' } as const

export function ContractDetailPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const isConsultant = user?.role === 'consultant'
  const queryClient = useQueryClient()
  const [dialog, setDialog] = useState<DialogName>(null)
  const contract = useQuery({ queryKey: ['contract', id], queryFn: () => contractsApi.get(id), enabled: Boolean(id) })
  const activity = useQuery({ queryKey: ['contract-activity', id], queryFn: () => contractsApi.activity(id), enabled: Boolean(id) })
  const clients = useQuery({ queryKey: ['contract-clients'], queryFn: contractsApi.clients })
  const consultants = useQuery({ queryKey: ['consultants'], queryFn: contractsApi.consultants, enabled: isAdmin })
  const contractTypes = useQuery({ queryKey: ['contract-types'], queryFn: () => catalogApi.contractTypes(), enabled: isConsultant })
  const mutation = useMutation({
    mutationFn: async ({ action, payload }: { action: Exclude<DialogName, null>; payload: unknown }) => {
      if (action === 'edit') return contractsApi.update(id, payload as Partial<ContractFormValues>)
      if (action === 'contact') return contractsApi.contact(id, payload as string | undefined)
      if (action === 'follow-up') { const values = payload as { nextFollowUpAt: string; note?: string }; return contractsApi.followUp(id, values.nextFollowUpAt, values.note) }
      if (action === 'renew') { const values = payload as RenewValues; return contractsApi.renew(id, values.expiryDate, values.value, values.note) }
      if (action === 'decline') { const values = payload as DeclineValues; return contractsApi.decline(id, values.reason, values.note) }
      return contractsApi.reassign(id, payload as string)
    },
    onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ['contract', id] }), queryClient.invalidateQueries({ queryKey: ['contract-activity', id] }), queryClient.invalidateQueries({ queryKey: ['contracts'] })]); setDialog(null) },
  })
  const submit = async (action: Exclude<DialogName, null>, payload?: unknown) => { await mutation.mutateAsync({ action, payload }) }

  if (contract.isLoading) return <PageLoader label="Chargement du contrat" />
  if (contract.isError || !contract.data) return <ErrorState title="Impossible de charger le contrat" message={getApiErrorMessage(contract.error, 'Ce contrat n’existe pas ou ne vous est pas attribué.')} retry={() => contract.refetch()} />
  const item = contract.data
  const ownerId = typeof item.owner === 'string' ? item.owner : entityId(item.owner)
  const mutationError = mutation.isError ? getApiErrorMessage(mutation.error) : undefined

  return <div className="space-y-6">
    <Button asChild variant="ghost" className="-ml-3"><Link to="/contracts"><ArrowLeft />Retour aux contrats</Link></Button>
    <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
      <div><div className="flex flex-wrap gap-2"><UrgencyBadge urgency={item.urgency} days={item.daysUntilExpiry} /><StatusBadge status={item.renewalStatus} /></div><h1 className="mt-3 text-xl font-semibold">{item.title}</h1><p className="mt-1 text-sm text-muted-foreground">{clientName(item.client)}</p></div>
      <div className="flex flex-wrap gap-2">{isConsultant && <Button variant="outline" onClick={() => setDialog('edit')}><Pencil />Modifier</Button>}{isAdmin && <Button variant="outline" onClick={() => setDialog('assign')}><UserRoundCog />Réattribuer</Button>}</div>
    </header>

    {isConsultant && <section aria-label="Actions de renouvellement" className="flex flex-wrap gap-2 rounded-lg border bg-card p-3"><Button onClick={() => setDialog('contact')}><PhoneCall />Marquer contacté</Button><Button variant="outline" onClick={() => setDialog('follow-up')}><CalendarClock />Planifier une relance</Button><Button variant="outline" onClick={() => setDialog('renew')}><RefreshCw />Renouveler</Button><Button variant="outline" className="text-red-700 hover:text-red-800" onClick={() => setDialog('decline')}><XCircle />Refuser</Button></section>}

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
      <div className="space-y-6">
        <Card><CardHeader><CardTitle>Détails du contrat</CardTitle></CardHeader><CardContent><dl className="grid gap-4 sm:grid-cols-2"><Detail label="Client" value={clientName(item.client)} /><Detail label="Consultant responsable" value={personName(item.owner)} /><Detail label="Type de contrat" value={typeof item.contractType === 'object' ? item.contractType.name : item.title} /><Detail label="Date de début" value={formatDate(item.startDate)} /><Detail label="Date d’échéance" value={formatDate(item.expiryDate)} /><Detail label="Valeur du contrat" value={formatMoney(item.value)} /><Detail label="Prochaine relance" value={formatDate(item.nextFollowUpAt)} /></dl>{item.description && <div className="mt-5 border-t pt-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{item.description}</p></div>}{item.services?.length > 0 && <div className="mt-5 border-t pt-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Services</p><div className="mt-2 divide-y rounded-md border">{item.services.map((service, index) => <div key={`${service.name}-${index}`} className="flex items-start justify-between gap-4 p-3 text-sm"><div><p className="font-medium">{service.name}</p>{service.description && <p className="mt-1 text-muted-foreground">{service.description}</p>}</div><p className="whitespace-nowrap font-medium">{service.quantity} × {formatMoney(service.unitPrice)}</p></div>)}</div></div>}{item.declineReason && <div className="mt-5 rounded-md bg-red-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-red-700">Motif du refus</p><p className="mt-1 text-sm text-red-900">{item.declineReason}</p></div>}</CardContent></Card>
        <Card><CardHeader><CardTitle>Historique des renouvellements</CardTitle></CardHeader><CardContent>{item.renewalHistory.length === 0 ? <EmptyState title="Aucun renouvellement" message="Les anciennes et nouvelles échéances apparaîtront ici." /> : <div className="divide-y">{item.renewalHistory.map((entry, index) => <div key={`${entry.renewedAt}-${index}`} className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><span className="rounded-md bg-emerald-100 p-2 text-emerald-700"><CheckCircle2 className="size-4" /></span><div><p className="font-medium">{formatDate(entry.previousExpiryDate)} → {formatDate(entry.newExpiryDate)}</p><p className="text-sm text-muted-foreground">Renouvelé par {personName(entry.renewedBy)}</p></div></div><div className="text-sm sm:text-right"><p className="font-medium">{formatMoney(entry.value)}</p><p className="text-muted-foreground">{formatDate(entry.renewedAt)}</p></div></div>)}</div>}</CardContent></Card>
      </div>
      <Card className="h-fit"><CardHeader><CardTitle>Activité</CardTitle></CardHeader><CardContent>{activity.isLoading ? <PageLoader label="Chargement de l’activité" /> : activity.isError ? <ErrorState message={getApiErrorMessage(activity.error)} retry={() => activity.refetch()} /> : !activity.data?.length ? <EmptyState title="Aucune activité" /> : <ol className="relative space-y-5 border-l pl-5">{activity.data.map((entry) => <li key={entityId(entry)}><span className="absolute -left-1.5 mt-1.5 size-3 rounded-full border-2 border-card bg-primary" /><p className="text-sm font-semibold">{activityLabels[entry.action]}</p><p className="mt-1 text-xs text-muted-foreground">{personName(entry.performedBy)} · {formatDate(entry.createdAt)}</p>{entry.note && <p className="mt-2 rounded-md bg-muted p-3 text-sm">{entry.note}</p>}</li>)}</ol>}</CardContent></Card>
    </div>

    {isConsultant && <ContractFormDialog open={dialog === 'edit'} onOpenChange={(open) => !open && setDialog(null)} contract={item} clients={clients.data || []} contractTypes={contractTypes.data || []} busy={mutation.isPending} error={mutationError} onSubmit={(values) => submit('edit', { description: values.description, services: values.services })} />}
    {isConsultant && <ContactDialog open={dialog === 'contact'} onOpenChange={(open) => !open && setDialog(null)} busy={mutation.isPending} error={mutationError} onSubmit={(note) => submit('contact', note)} />}
    {isConsultant && <FollowUpDialog open={dialog === 'follow-up'} onOpenChange={(open) => !open && setDialog(null)} busy={mutation.isPending} error={mutationError} onSubmit={(values) => submit('follow-up', values)} />}
    {isConsultant && <RenewDialog open={dialog === 'renew'} onOpenChange={(open) => !open && setDialog(null)} busy={mutation.isPending} error={mutationError} currentExpiryDate={item.expiryDate} onSubmit={(values) => submit('renew', values)} />}
    {isConsultant && <DeclineDialog open={dialog === 'decline'} onOpenChange={(open) => !open && setDialog(null)} busy={mutation.isPending} error={mutationError} onSubmit={(values) => submit('decline', values)} />}
    {isAdmin && <AssignDialog open={dialog === 'assign'} onOpenChange={(open) => !open && setDialog(null)} busy={mutation.isPending} error={mutationError} consultants={consultants.data || []} currentOwner={ownerId} onSubmit={(value) => submit('assign', value)} />}
  </div>
}

function Detail({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-1 text-sm font-medium">{value}</dd></div> }
