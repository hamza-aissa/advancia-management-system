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
const actionLabels: Record<string, string> = { created: 'License created', updated: 'License updated', contacted: 'Client contacted', follow_up_scheduled: 'Follow-up scheduled', renewed: 'License renewed', declined: 'Renewal declined' }

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
  if (license.isLoading || activity.isLoading) return <PageLoader label="Loading license" />
  if (license.isError || activity.isError || !license.data) return <ErrorState title="Unable to load this license" message={getApiErrorMessage(license.error || activity.error)} retry={() => { license.refetch(); activity.refetch() }} />
  const item = license.data
  return <div className="space-y-6"><Link to="/licenses" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Back to licenses</Link>
    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start"><div><div className="mb-3 flex flex-wrap gap-2"><UrgencyBadge urgency={item.urgency} days={item.daysUntilExpiry} /><StatusBadge status={item.renewalStatus} /></div><h1 className="text-3xl font-semibold tracking-tight">{item.name}</h1><p className="mt-2 text-muted-foreground">{item.client.name} · {item.quantity ?? '—'} license seats</p></div><div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"><Button variant="outline" onClick={() => setAction('contact')}><Mail />Contacted</Button><Button variant="outline" onClick={() => setAction('followUp')}><CalendarClock />Follow-up</Button><Button onClick={() => setAction('renew')}><RotateCw />Renew</Button><Button variant="destructive" onClick={() => setAction('decline')}><XCircle />Decline</Button></div></div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,.6fr)]"><div className="space-y-6"><Card><CardHeader><CardTitle>Commercial record</CardTitle></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2"><Info label="Client" value={item.client.name} /><Info label="Owner" value={personName(item.owner)} icon={<UserRound />} /><Info label="Start date" value={formatDate(item.startDate)} /><Info label="Expiry date" value={formatDate(item.expiryDate)} /><Info label="Quantity" value={String(item.quantity ?? '—')} /><Info label="Value" value={item.value == null ? '—' : new Intl.NumberFormat('en').format(item.value)} />{item.nextFollowUpAt && <Info label="Next follow-up" value={formatDate(item.nextFollowUpAt)} icon={<CalendarClock />} />}{item.declineReason && <Info label="Decline reason" value={item.declineReason} />}{item.description && <div className="sm:col-span-2"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</p><p className="mt-2 text-sm leading-6">{item.description}</p></div>}</CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><History className="size-5" />Activity</CardTitle></CardHeader><CardContent>{activity.data?.length ? <ol className="space-y-5">{activity.data.map((entry) => <li key={entry._id} className="relative border-l pl-5"><span className="absolute -left-1.5 top-1 size-3 rounded-full border-2 border-white bg-primary" /><p className="text-sm font-semibold">{actionLabels[entry.action] || entry.action.replaceAll('_', ' ')}</p><p className="mt-1 text-xs text-muted-foreground">{personName(entry.performedBy)} · {formatDate(entry.createdAt)}</p>{entry.note && <p className="mt-2 rounded-md bg-slate-50 p-3 text-sm">{entry.note}</p>}</li>)}</ol> : <EmptyState title="No activity yet" message="Renewal actions will appear here." />}</CardContent></Card></div>
      <Card className="h-fit"><CardHeader><CardTitle>Renewal history</CardTitle></CardHeader><CardContent>{item.renewalHistory.length ? <ol className="space-y-4">{item.renewalHistory.slice().reverse().map((entry, index) => <li key={`${entry.renewedAt}-${index}`} className="rounded-md border p-4"><div className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="size-4 text-emerald-600" />Renewed {formatDate(entry.renewedAt)}</div><p className="mt-2 text-sm text-muted-foreground">{formatDate(entry.previousExpiryDate)} → {formatDate(entry.newExpiryDate)}</p><p className="mt-1 text-xs text-muted-foreground">by {typeof entry.renewedBy === 'string' ? 'team member' : personName(entry.renewedBy)}</p></li>)}</ol> : <p className="text-sm text-muted-foreground">No completed renewals yet.</p>}</CardContent></Card></div>
    <LicenseActionDialog action={action} busy={mutate.isPending} error={mutate.isError ? getApiErrorMessage(mutate.error, 'Unable to apply this action.') : undefined} onClose={() => { setAction(null); mutate.reset() }} onSubmit={(values) => action && mutate.mutate({ kind: action, values })} />
  </div>
}

function Info({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) { return <div><p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{icon}{label}</p><p className="mt-1.5 text-sm font-medium">{value}</p></div> }
