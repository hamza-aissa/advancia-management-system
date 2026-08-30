import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CircleUserRound, FileKey2, FileText, Play, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState, ErrorState, PageLoader } from '@/components/feedback'
import { getApiErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'
import { ActionTable, moneyFormatter } from './action-table'
import { getActions, getNotificationHistory, getReminderStatus, runReminders } from './api'
import type { ActionKind, NotificationEntry } from './types'

type OwnerFilter = 'all' | 'unassigned' | string
const dateTime = (value?: string | null) => value ? new Intl.DateTimeFormat('fr-TN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Africa/Tunis' }).format(new Date(value)) : 'Jamais'
const deliveryLabels: Record<NotificationEntry['deliveryStatus'], string> = { pending: 'En attente', sent: 'Envoyé', simulated: 'Simulé', failed: 'Échec' }
const deliveryClasses: Record<NotificationEntry['deliveryStatus'], string> = { pending: 'border-slate-200 bg-slate-50 text-slate-700', sent: 'border-emerald-200 bg-emerald-50 text-emerald-700', simulated: 'border-blue-200 bg-blue-50 text-blue-700', failed: 'border-red-200 bg-red-50 text-red-700' }

export function AdminOverviewPage() {
  const [kind, setKind] = useState<ActionKind | 'all'>('all')
  const [owner, setOwner] = useState<OwnerFilter>('all')
  const queryClient = useQueryClient()
  const queryFilters = { kind: kind === 'all' ? undefined : kind, ownerId: owner !== 'all' && owner !== 'unassigned' ? owner : undefined }
  const actions = useQuery({ queryKey: ['admin-actions', queryFilters], queryFn: () => getActions(queryFilters) })
  const reminderStatus = useQuery({ queryKey: ['reminder-status'], queryFn: getReminderStatus, refetchInterval: (query) => query.state.data?.running ? 2000 : 30000 })
  const history = useQuery({ queryKey: ['notification-history'], queryFn: getNotificationHistory })
  const run = useMutation({ mutationFn: runReminders, onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ['reminder-status'] }), queryClient.invalidateQueries({ queryKey: ['notification-history'] })]) } })
  const owners = useMemo(() => {
    const map = new Map<string, string>()
    for (const item of actions.data || []) if (item.ownerId) map.set(item.ownerId, item.ownerName || 'Responsable sans nom')
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [actions.data])
  const visible = (actions.data || []).filter((item) => owner !== 'unassigned' || !item.ownerId)
  const unassigned = (actions.data || []).filter((item) => !item.ownerId).length
  const overdue = visible.filter((item) => item.overdue).length
  const totalValue = visible.reduce((sum, item) => sum + item.value, 0)

  return <div className="space-y-6">
    <div><h2 className="text-xl font-semibold">Supervision des opérations</h2><p className="mt-1 text-sm text-muted-foreground">Suivez les responsabilités, les échéances et les rappels des deux départements.</p></div>
    {actions.isPending ? <PageLoader label="Chargement de la supervision" /> : actions.isError ? <ErrorState message={getApiErrorMessage(actions.error, 'Impossible de charger la supervision.')} retry={() => actions.refetch()} /> : <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Renouvellements ouverts" value={visible.length} icon={Users} /><Metric label="Relances en retard" value={overdue} icon={AlertTriangle} attention /><Metric label="Non attribués" value={unassigned} icon={CircleUserRound} /><Metric label="Valeur exposée" value={moneyFormatter.format(totalValue)} icon={FileText} /></div>
      <section aria-label="Filtres des opérations" className="flex flex-col justify-between gap-3 rounded-lg border bg-card p-3 lg:flex-row lg:items-center">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Type de renouvellement"><button type="button" onClick={() => setKind('all')} className={filterClass(kind === 'all')}><Users className="size-4" />Tout</button><button type="button" onClick={() => setKind('contract')} className={filterClass(kind === 'contract')}><FileText className="size-4" />Contrats</button><button type="button" onClick={() => setKind('license')} className={filterClass(kind === 'license')}><FileKey2 className="size-4" />Licences</button></div>
        <label className="flex items-center gap-2 text-sm"><span>Responsable</span><select value={owner} onChange={(event) => setOwner(event.target.value)} className="h-8 min-w-48 rounded-md border bg-background px-2 text-sm"><option value="all">Tous</option><option value="unassigned">Non attribués</option>{owners.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
      </section>
      {visible.length ? <ActionTable items={visible} showOwner /> : <EmptyState title="Aucun renouvellement" message={owner === 'unassigned' ? 'Tous les renouvellements actifs ont un responsable.' : 'Aucun renouvellement ne correspond aux filtres.'} />}
    </>}

    <section className="rounded-lg border bg-card" aria-labelledby="reminders-heading">
      <div className="flex flex-col justify-between gap-3 border-b px-3 py-2 sm:flex-row sm:items-center"><div><h3 id="reminders-heading" className="text-sm font-semibold">Rappels automatiques</h3><p className="text-xs text-muted-foreground">Vérification planifiée des échéances à 15, 10 et 6 jours.</p></div><Button size="sm" onClick={() => run.mutate()} disabled={run.isPending || reminderStatus.data?.running}><Play />{run.isPending || reminderStatus.data?.running ? 'Vérification en cours…' : 'Lancer maintenant'}</Button></div>
      {reminderStatus.isPending ? <div className="p-3"><PageLoader label="Chargement de l’état des rappels" /></div> : reminderStatus.isError ? <div className="p-3"><ErrorState message={getApiErrorMessage(reminderStatus.error, 'Impossible de charger l’état des rappels.')} retry={() => reminderStatus.refetch()} /></div> : reminderStatus.data && <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
        <ReminderDatum label="Planification" value={reminderStatus.data.scheduled ? `${reminderStatus.data.schedule} · ${reminderStatus.data.timezone}` : 'Non planifiée'} status={reminderStatus.data.scheduled ? 'ok' : 'error'} />
        <ReminderDatum label="État" value={reminderStatus.data.running ? 'En cours' : 'Au repos'} status={reminderStatus.data.running ? 'info' : 'ok'} />
        <ReminderDatum label="Dernière exécution" value={dateTime(reminderStatus.data.lastRunAt)} />
        <ReminderDatum label="Prochaine exécution" value={dateTime(reminderStatus.data.nextRunAt)} />
        <ReminderDatum label="Envoyés" value={String(reminderStatus.data.lastReport?.sent ?? 0)} status="ok" />
        <ReminderDatum label="Simulés" value={String(reminderStatus.data.lastReport?.simulated ?? 0)} status="info" />
        <ReminderDatum label="Échecs" value={String(reminderStatus.data.lastReport?.failed ?? 0)} status={(reminderStatus.data.lastReport?.failed ?? 0) > 0 ? 'error' : 'ok'} />
        <ReminderDatum label="Éléments vérifiés" value={String(reminderStatus.data.lastReport?.itemsChecked ?? 0)} />
        {reminderStatus.data.lastError && <p className="sm:col-span-2 lg:col-span-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">Dernière erreur : {reminderStatus.data.lastError}</p>}
      </div>}
      {run.isError && <p className="mx-3 mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{getApiErrorMessage(run.error, 'La vérification manuelle a échoué.')}</p>}
      <div className="border-t"><div className="px-3 py-2"><h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Historique récent</h4></div>{history.isPending ? <div className="px-3 pb-3"><PageLoader label="Chargement de l’historique" /></div> : history.isError ? <div className="px-3 pb-3"><ErrorState message={getApiErrorMessage(history.error, 'Impossible de charger l’historique.')} retry={() => history.refetch()} /></div> : history.data?.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-y bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground"><th className="px-3 py-2 text-left font-medium">Date</th><th className="px-3 py-2 text-left font-medium">Type</th><th className="px-3 py-2 text-left font-medium">Palier</th><th className="px-3 py-2 text-left font-medium">Destinataire</th><th className="px-3 py-2 text-left font-medium">Livraison</th></tr></thead><tbody>{history.data.slice(0, 20).map((entry) => <tr key={entry._id} className="border-b last:border-0 hover:bg-muted/30"><td className="px-3 py-2 whitespace-nowrap">{dateTime(entry.attemptedAt)}</td><td className="px-3 py-2">{entry.itemKind === 'license' ? 'Licence' : 'Contrat'}</td><td className="px-3 py-2">J-{entry.threshold}</td><td className="px-3 py-2 font-mono text-xs">{entry.recipient}</td><td className="px-3 py-2"><span className={cn('inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium', deliveryClasses[entry.deliveryStatus])}>{deliveryLabels[entry.deliveryStatus]}</span>{entry.error && <p className="mt-1 text-[11px] text-red-700">{entry.error}</p>}</td></tr>)}</tbody></table></div> : <div className="px-3 pb-3"><EmptyState title="Aucun rappel enregistré" message="L’historique apparaîtra après la première vérification." /></div>}</div>
    </section>
  </div>
}

function Metric({ label, value, icon: Icon, attention = false }: { label: string; value: string | number; icon: typeof Users; attention?: boolean }) { return <Card><CardContent className="flex items-center justify-between p-3"><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold tabular-nums">{value}</p></div><Icon className={cn('size-4', attention ? 'text-red-600' : 'text-primary')} /></CardContent></Card> }
function ReminderDatum({ label, value, status }: { label: string; value: string; status?: 'ok' | 'error' | 'info' }) { return <div className="rounded-md border px-3 py-2"><p className="text-[11px] text-muted-foreground">{label}</p><p className={cn('mt-0.5 text-sm font-medium', status === 'ok' && 'text-emerald-700', status === 'error' && 'text-red-700', status === 'info' && 'text-blue-700')}>{value}</p></div> }
function filterClass(active: boolean) { return cn('inline-flex h-8 items-center gap-2 rounded-md border px-3 text-sm font-medium', active ? 'border-primary/30 bg-blue-50 text-primary' : 'bg-card text-muted-foreground hover:bg-muted') }
