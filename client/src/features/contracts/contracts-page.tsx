import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Plus, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, PageLoader } from '@/components/feedback'
import { useAuth } from '@/contexts/auth-context'
import { getApiErrorMessage } from '@/lib/api'
import { ContractFormDialog, type ContractFormValues } from './contract-dialogs'
import { contractsApi } from './contracts-api'
import { clientName, entityId, personName, type RenewalStatus, type Urgency } from './types'
import { fieldClass, formatDate, formatMoney, StatusBadge, UrgencyBadge } from './contract-ui'

const urgencyOptions: Array<Urgency | 'all'> = ['all', 'expired', 'critical', 'urgent', 'upcoming', 'safe']
const statusOptions: Array<RenewalStatus | 'all'> = ['all', 'not_contacted', 'contacted', 'waiting', 'renewed', 'declined']
const urgencyLabels: Record<Urgency, string> = { expired: 'Expiré', critical: 'Critique', urgent: 'Urgent', upcoming: 'À venir', safe: 'Sans risque' }
const statusLabels: Record<RenewalStatus, string> = { not_contacted: 'Non contacté', contacted: 'Contacté', waiting: 'En attente', renewed: 'Renouvelé', declined: 'Refusé' }

export function ContractsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [urgency, setUrgency] = useState<Urgency | 'all'>('all')
  const [status, setStatus] = useState<RenewalStatus | 'all'>('all')
  const [owner, setOwner] = useState('all')

  const contracts = useQuery({ queryKey: ['contracts'], queryFn: contractsApi.list })
  const clients = useQuery({ queryKey: ['contract-clients'], queryFn: contractsApi.clients })
  const consultants = useQuery({ queryKey: ['consultants'], queryFn: contractsApi.consultants, enabled: isAdmin })
  const createContract = useMutation({
    mutationFn: (values: ContractFormValues) => contractsApi.create(values),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['contracts'] }); setCreateOpen(false) },
  })

  const rows = useMemo(() => (contracts.data || []).filter((contract) => {
    const needle = search.trim().toLowerCase()
    const matchesSearch = !needle || contract.title.toLowerCase().includes(needle) || clientName(contract.client).toLowerCase().includes(needle)
    const matchesUrgency = urgency === 'all' || contract.urgency === urgency
    const matchesStatus = status === 'all' || contract.renewalStatus === status
    const ownerId = typeof contract.owner === 'string' ? contract.owner : entityId(contract.owner)
    return matchesSearch && matchesUrgency && matchesStatus && (owner === 'all' || ownerId === owner)
  }), [contracts.data, owner, search, status, urgency])

  if (contracts.isLoading) return <PageLoader label="Chargement des contrats" />
  if (contracts.isError) return <ErrorState message={getApiErrorMessage(contracts.error)} retry={() => contracts.refetch()} />

  return <div className="space-y-6">
    <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div><h1 className="text-xl font-semibold">Contrats</h1><p className="mt-1 text-sm text-muted-foreground">{isAdmin ? 'Suivez les contrats, leurs responsables et leurs échéances.' : 'Gérez les contrats qui vous sont attribués.'}</p></div>
      <Button size="sm" onClick={() => setCreateOpen(true)}><Plus />Nouveau contrat</Button>
    </header>

    <section aria-label="Filtres des contrats" className="grid gap-3 rounded-lg border bg-card p-3 md:grid-cols-2 xl:grid-cols-4">
      <label className="relative"><span className="sr-only">Rechercher un contrat</span><Search className="absolute left-3 top-2 size-4 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} className={`${fieldClass} pl-9`} placeholder="Contrat ou client" /></label>
      <label><span className="sr-only">Filtrer par priorité</span><select value={urgency} onChange={(event) => setUrgency(event.target.value as Urgency | 'all')} className={fieldClass}>{urgencyOptions.map((value) => <option key={value} value={value}>{value === 'all' ? 'Toutes les priorités' : urgencyLabels[value]}</option>)}</select></label>
      <label><span className="sr-only">Filtrer par statut</span><select value={status} onChange={(event) => setStatus(event.target.value as RenewalStatus | 'all')} className={fieldClass}>{statusOptions.map((value) => <option key={value} value={value}>{value === 'all' ? 'Tous les statuts' : statusLabels[value]}</option>)}</select></label>
      {isAdmin && <label><span className="sr-only">Filtrer par consultant</span><select value={owner} onChange={(event) => setOwner(event.target.value)} className={fieldClass}><option value="all">Tous les consultants</option>{(consultants.data || []).map((person) => <option key={entityId(person)} value={entityId(person)}>{personName(person)}</option>)}</select></label>}
    </section>

    {rows.length === 0 ? <EmptyState title="Aucun contrat" message={contracts.data?.length ? 'Modifiez les filtres pour afficher d’autres contrats.' : 'Créez le premier contrat pour suivre son renouvellement.'} action={!contracts.data?.length && <Button onClick={() => setCreateOpen(true)}>Nouveau contrat</Button>} /> : <>
      <div className="hidden overflow-hidden rounded-lg border bg-card lg:block">
        <table className="w-full text-left text-sm"><thead className="border-b bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2">Contrat</th><th className="px-3 py-2">Valeur</th><th className="px-3 py-2">Échéance</th><th className="px-3 py-2">Priorité</th><th className="px-3 py-2">Renouvellement</th>{isAdmin && <th className="px-3 py-2">Consultant</th>}<th className="px-3 py-2"><span className="sr-only">Ouvrir</span></th></tr></thead>
          <tbody className="divide-y">{rows.map((contract) => <tr key={entityId(contract)} className="hover:bg-muted/30"><td className="px-3 py-2"><p className="font-medium text-primary">{contract.title}</p><p className="mt-0.5 text-xs text-muted-foreground">{clientName(contract.client)}</p></td><td className="px-3 py-2 font-medium">{formatMoney(contract.value)}</td><td className="px-3 py-2">{formatDate(contract.expiryDate)}</td><td className="px-3 py-2"><UrgencyBadge urgency={contract.urgency} days={contract.daysUntilExpiry} /></td><td className="px-3 py-2"><StatusBadge status={contract.renewalStatus} /></td>{isAdmin && <td className="px-3 py-2">{personName(contract.owner)}</td>}<td className="px-3 py-2 text-right"><Button asChild size="icon" variant="ghost"><Link to={`/contracts/${entityId(contract)}`} aria-label={`Ouvrir ${contract.title}`}><ArrowRight /></Link></Button></td></tr>)}</tbody>
        </table>
      </div>
      <div className="grid gap-3 lg:hidden">{rows.map((contract) => <Link key={entityId(contract)} to={`/contracts/${entityId(contract)}`} className="rounded-lg border bg-card p-3"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{contract.title}</h2><p className="mt-1 text-sm text-muted-foreground">{clientName(contract.client)}</p></div><ArrowRight className="size-4 text-muted-foreground" /></div><div className="mt-3 flex flex-wrap gap-2"><UrgencyBadge urgency={contract.urgency} days={contract.daysUntilExpiry} /><StatusBadge status={contract.renewalStatus} /></div><dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-muted-foreground">Échéance</dt><dd className="mt-1 font-medium">{formatDate(contract.expiryDate)}</dd></div><div><dt className="text-muted-foreground">Valeur</dt><dd className="mt-1 font-medium">{formatMoney(contract.value)}</dd></div></dl></Link>)}</div>
    </>}

    <ContractFormDialog open={createOpen} onOpenChange={setCreateOpen} clients={clients.data || []} consultants={consultants.data || []} isAdmin={isAdmin} busy={createContract.isPending} error={createContract.isError ? getApiErrorMessage(createContract.error) : undefined} onSubmit={async (values) => { await createContract.mutateAsync(values) }} />
  </div>
}
