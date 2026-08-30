import { useDeferredValue, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Filter, Search, X } from 'lucide-react'
import { EmptyState, ErrorState, PageLoader } from '@/components/feedback'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/auth-context'
import { getApiErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'
import { ActionTable } from '@/features/dashboard/action-table'
import { getActions } from '@/features/dashboard/api'
import type { ActionFilters, RenewalStatus, Urgency } from '@/features/dashboard/types'

const urgencyOptions: { value: Urgency | ''; label: string }[] = [
  { value: '', label: 'Toutes les priorités' }, { value: 'expired', label: 'Expiré' }, { value: 'critical', label: 'Critique' },
  { value: 'urgent', label: 'Urgent' }, { value: 'upcoming', label: 'À venir' }, { value: 'safe', label: 'Sans risque' },
]
const statusOptions: { value: RenewalStatus | ''; label: string }[] = [
  { value: '', label: 'Tous les statuts' }, { value: 'not_contacted', label: 'Non contacté' }, { value: 'contacted', label: 'Contacté' },
  { value: 'waiting', label: 'En attente' }, { value: 'renewed', label: 'Renouvelé' }, { value: 'declined', label: 'Refusé' },
]

export function MyActionsPage() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [urgency, setUrgency] = useState<Urgency | ''>('')
  const [renewalStatus, setRenewalStatus] = useState<RenewalStatus | ''>('')
  const [overdueOnly, setOverdueOnly] = useState(false)
  const deferredSearch = useDeferredValue(search.trim())
  const filters: ActionFilters = {
    search: deferredSearch || undefined,
    urgency: urgency || undefined,
    renewalStatus: renewalStatus || undefined,
    overdue: overdueOnly ? true : undefined,
  }
  const actions = useQuery({ queryKey: ['actions', filters], queryFn: () => getActions(filters) })
  const activeFilters = Boolean(search || urgency || renewalStatus || overdueOnly)
  const clear = () => { setSearch(''); setUrgency(''); setRenewalStatus(''); setOverdueOnly(false) }

  return <div className="space-y-6">
    <div><h2 className="text-xl font-semibold">Mes actions</h2><p className="mt-1 text-sm text-muted-foreground">{user?.role === 'agent' ? 'Licences' : 'Contrats'} qui vous sont attribués, classés par priorité.</p></div>
    <section aria-label="Filtres des actions" className="rounded-lg border bg-card p-3">
      <div className="flex flex-col gap-3 xl:flex-row">
        <label className="relative min-w-0 flex-1"><span className="sr-only">Rechercher</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Renouvellement ou client" className="pl-9" /></label>
        <div className="grid gap-3 sm:grid-cols-2 xl:flex">
          <label><span className="sr-only">Filtrer par priorité</span><select value={urgency} onChange={(event) => setUrgency(event.target.value as Urgency | '')} className="h-8 w-full rounded-md border bg-background px-3 text-sm xl:w-40">{urgencyOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label><span className="sr-only">Filtrer par statut</span><select value={renewalStatus} onChange={(event) => setRenewalStatus(event.target.value as RenewalStatus | '')} className="h-8 w-full rounded-md border bg-background px-3 text-sm xl:w-44">{statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        </div>
        <button type="button" aria-pressed={overdueOnly} onClick={() => setOverdueOnly((value) => !value)} className={cn('inline-flex h-8 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium', overdueOnly ? 'border-red-200 bg-red-50 text-red-700' : 'bg-background hover:bg-muted')}><Filter className="size-4" />En retard uniquement</button>
        {activeFilters && <Button type="button" variant="ghost" onClick={clear}><X />Effacer</Button>}
      </div>
    </section>
    {actions.isPending ? <PageLoader label="Chargement des actions" /> : actions.isError ? <ErrorState message={getApiErrorMessage(actions.error, 'Impossible de charger vos actions.')} retry={() => actions.refetch()} /> : actions.data.length ? <><p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">{actions.data.length}</span> renouvellement{actions.data.length > 1 ? 's' : ''}</p><ActionTable items={actions.data} /></> : <EmptyState title={activeFilters ? 'Aucun renouvellement correspondant' : 'Aucune action en attente'} message={activeFilters ? 'Modifiez ou effacez les filtres.' : 'Aucun renouvellement actif ne nécessite de relance.'} action={activeFilters ? <Button variant="outline" onClick={clear}>Effacer les filtres</Button> : undefined} />}
  </div>
}
