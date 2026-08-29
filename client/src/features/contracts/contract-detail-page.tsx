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
import { AssignDialog, ContactDialog, ContractFormDialog, DeclineDialog, FollowUpDialog, RenewDialog, type ContractFormValues, type DeclineValues, type RenewValues } from './contract-dialogs'
import { clientName, entityId, personName } from './types'
import { formatDate, formatMoney, StatusBadge, UrgencyBadge } from './contract-ui'

type DialogName = 'edit' | 'contact' | 'follow-up' | 'renew' | 'decline' | 'assign' | null
const activityLabels = { created: 'Contract created', updated: 'Contract updated', contacted: 'Client contacted', follow_up_scheduled: 'Follow-up scheduled', renewed: 'Contract renewed', declined: 'Renewal declined' } as const

export function ContractDetailPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const queryClient = useQueryClient()
  const [dialog, setDialog] = useState<DialogName>(null)
  const contract = useQuery({ queryKey: ['contract', id], queryFn: () => contractsApi.get(id), enabled: Boolean(id) })
  const activity = useQuery({ queryKey: ['contract-activity', id], queryFn: () => contractsApi.activity(id), enabled: Boolean(id) })
  const clients = useQuery({ queryKey: ['contract-clients'], queryFn: contractsApi.clients })
  const consultants = useQuery({ queryKey: ['consultants'], queryFn: contractsApi.consultants, enabled: isAdmin })
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

  if (contract.isLoading) return <PageLoader label="Loading contract" />
  if (contract.isError || !contract.data) return <ErrorState title="Unable to load contract" message={getApiErrorMessage(contract.error, 'This contract does not exist or is outside your assignment.')} retry={() => contract.refetch()} />
  const item = contract.data
  const ownerId = typeof item.owner === 'string' ? item.owner : entityId(item.owner)
  const mutationError = mutation.isError ? getApiErrorMessage(mutation.error) : undefined

  return <div className="space-y-6">
    <Button asChild variant="ghost" className="-ml-3"><Link to="/contracts"><ArrowLeft />Back to contracts</Link></Button>
    <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
      <div><div className="flex flex-wrap gap-2"><UrgencyBadge urgency={item.urgency} days={item.daysUntilExpiry} /><StatusBadge status={item.renewalStatus} /></div><h1 className="mt-4 text-3xl font-bold tracking-tight">{item.title}</h1><p className="mt-2 text-muted-foreground">{clientName(item.client)}</p></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setDialog('edit')}><Pencil />Edit</Button>{isAdmin && <Button variant="outline" onClick={() => setDialog('assign')}><UserRoundCog />Reassign</Button>}</div>
    </header>

    <section aria-label="Renewal actions" className="flex flex-wrap gap-2 rounded-lg border bg-card p-4"><Button onClick={() => setDialog('contact')}><PhoneCall />Mark contacted</Button><Button variant="outline" onClick={() => setDialog('follow-up')}><CalendarClock />Schedule follow-up</Button><Button variant="outline" onClick={() => setDialog('renew')}><RefreshCw />Renew</Button><Button variant="outline" className="text-red-700 hover:text-red-800" onClick={() => setDialog('decline')}><XCircle />Decline</Button></section>

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
      <div className="space-y-6">
        <Card><CardHeader><CardTitle>Contract details</CardTitle></CardHeader><CardContent><dl className="grid gap-5 sm:grid-cols-2"><Detail label="Client" value={clientName(item.client)} /><Detail label="Responsible consultant" value={personName(item.owner)} /><Detail label="Start date" value={formatDate(item.startDate)} /><Detail label="Expiry date" value={formatDate(item.expiryDate)} /><Detail label="Contract value" value={formatMoney(item.value)} /><Detail label="Next follow-up" value={formatDate(item.nextFollowUpAt)} /></dl>{item.description && <div className="mt-6 border-t pt-5"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{item.description}</p></div>}{item.declineReason && <div className="mt-6 rounded-md bg-red-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-red-700">Decline reason</p><p className="mt-1 text-sm text-red-900">{item.declineReason}</p></div>}</CardContent></Card>
        <Card><CardHeader><CardTitle>Renewal history</CardTitle></CardHeader><CardContent>{item.renewalHistory.length === 0 ? <EmptyState title="No renewals recorded" message="Completed renewals will preserve the previous and new expiry dates here." /> : <div className="divide-y">{item.renewalHistory.map((entry, index) => <div key={`${entry.renewedAt}-${index}`} className="flex flex-col justify-between gap-2 py-4 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><span className="rounded-full bg-emerald-100 p-2 text-emerald-700"><CheckCircle2 className="size-4" /></span><div><p className="font-medium">{formatDate(entry.previousExpiryDate)} → {formatDate(entry.newExpiryDate)}</p><p className="text-sm text-muted-foreground">Renewed by {personName(entry.renewedBy)}</p></div></div><div className="text-sm sm:text-right"><p className="font-medium">{formatMoney(entry.value)}</p><p className="text-muted-foreground">{formatDate(entry.renewedAt)}</p></div></div>)}</div>}</CardContent></Card>
      </div>
      <Card className="h-fit"><CardHeader><CardTitle>Activity</CardTitle></CardHeader><CardContent>{activity.isLoading ? <PageLoader label="Loading activity" /> : activity.isError ? <ErrorState message={getApiErrorMessage(activity.error)} retry={() => activity.refetch()} /> : !activity.data?.length ? <EmptyState title="No activity yet" /> : <ol className="relative space-y-6 border-l pl-5">{activity.data.map((entry) => <li key={entityId(entry)}><span className="absolute -left-1.5 mt-1.5 size-3 rounded-full border-2 border-card bg-primary" /><p className="text-sm font-semibold">{activityLabels[entry.action]}</p><p className="mt-1 text-xs text-muted-foreground">{personName(entry.performedBy)} · {formatDate(entry.createdAt)}</p>{entry.note && <p className="mt-2 rounded-md bg-muted p-3 text-sm">{entry.note}</p>}</li>)}</ol>}</CardContent></Card>
    </div>

    <ContractFormDialog open={dialog === 'edit'} onOpenChange={(open) => !open && setDialog(null)} contract={item} clients={clients.data || []} consultants={consultants.data || []} isAdmin={isAdmin} busy={mutation.isPending} error={mutationError} onSubmit={(values) => submit('edit', { title: values.title, description: values.description, value: values.value })} />
    <ContactDialog open={dialog === 'contact'} onOpenChange={(open) => !open && setDialog(null)} busy={mutation.isPending} error={mutationError} onSubmit={(note) => submit('contact', note)} />
    <FollowUpDialog open={dialog === 'follow-up'} onOpenChange={(open) => !open && setDialog(null)} busy={mutation.isPending} error={mutationError} onSubmit={(values) => submit('follow-up', values)} />
    <RenewDialog open={dialog === 'renew'} onOpenChange={(open) => !open && setDialog(null)} busy={mutation.isPending} error={mutationError} currentExpiryDate={item.expiryDate} onSubmit={(values) => submit('renew', values)} />
    <DeclineDialog open={dialog === 'decline'} onOpenChange={(open) => !open && setDialog(null)} busy={mutation.isPending} error={mutationError} onSubmit={(values) => submit('decline', values)} />
    {isAdmin && <AssignDialog open={dialog === 'assign'} onOpenChange={(open) => !open && setDialog(null)} busy={mutation.isPending} error={mutationError} consultants={consultants.data || []} currentOwner={ownerId} onSubmit={(value) => submit('assign', value)} />}
  </div>
}

function Detail({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-1 text-sm font-medium">{value}</dd></div> }
