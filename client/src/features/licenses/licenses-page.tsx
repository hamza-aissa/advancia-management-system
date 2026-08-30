import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit3, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, PageLoader } from '@/components/feedback'
import { useAuth } from '@/contexts/auth-context'
import { getApiErrorMessage } from '@/lib/api'
import { LicenseFormDialog } from './license-dialogs'
import { licenseApi } from './license-api'
import { catalogApi } from '@/features/catalogs'
import { formatDate, itemId, personName, StatusBadge, UrgencyBadge, fieldClass } from './license-ui'
import type { License, LicenseFilters, LicenseInput, RenewalStatus, Urgency } from './types'

const urgencies: Array<Urgency | ''> = ['', 'expired', 'critical', 'urgent', 'upcoming', 'safe']
const statuses: Array<RenewalStatus | ''> = ['', 'not_contacted', 'contacted', 'waiting', 'renewed', 'declined']
const urgencyLabels: Record<Urgency, string> = { expired: 'Expiré', critical: 'Critique', urgent: 'Urgent', upcoming: 'À venir', safe: 'Sans risque' }
const statusLabels: Record<RenewalStatus, string> = { not_contacted: 'Non contacté', contacted: 'Contacté', waiting: 'En attente', renewed: 'Renouvelé', declined: 'Refusé' }

export function LicensesPage() {
  const { user } = useAuth(); const isAdmin = user?.role === 'admin'; const isAgent = user?.role === 'agent'; const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const [filters, setFilters] = useState<LicenseFilters>({}); const [draftSearch, setDraftSearch] = useState(''); const [editing, setEditing] = useState<License | undefined>(); const [dialogOpen, setDialogOpen] = useState(isAgent && searchParams.get('nouvelle') === '1')
  const licenses = useQuery({ queryKey: ['licenses', filters], queryFn: () => licenseApi.list(filters) })
  const clients = useQuery({ queryKey: ['license-clients'], queryFn: licenseApi.clients })
  const agents = useQuery({ queryKey: ['license-agents'], queryFn: licenseApi.agents, enabled: isAdmin })
  const offers = useQuery({ queryKey: ['license-offers'], queryFn: () => catalogApi.licenseOffers(), enabled: isAgent })
  const save = useMutation({ mutationFn: (input: LicenseInput | Partial<LicenseInput>) => editing ? licenseApi.update(editing.id, input) : licenseApi.create(input as LicenseInput), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['licenses'] }); setDialogOpen(false); setEditing(undefined) } })
  const assign = useMutation({ mutationFn: ({ id, owner }: { id: string; owner: string }) => licenseApi.assign(id, owner), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['licenses'] }) })
  const openCreate = () => { setEditing(undefined); setDialogOpen(true); save.reset() }; const openEdit = (license: License) => { setEditing(license); setDialogOpen(true); save.reset() }
  const updateFilter = <K extends keyof LicenseFilters>(key: K, value: LicenseFilters[K]) => setFilters((current) => ({ ...current, [key]: value }))
  if (licenses.isLoading || clients.isLoading || (isAdmin && agents.isLoading) || (isAgent && offers.isLoading)) return <PageLoader label="Chargement des licences" />
  if (licenses.isError || clients.isError || (isAdmin && agents.isError) || (isAgent && offers.isError)) return <ErrorState message={getApiErrorMessage(licenses.error || clients.error || agents.error || offers.error)} retry={() => { licenses.refetch(); clients.refetch(); agents.refetch(); offers.refetch() }} />
  const rows = licenses.data || []
  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="text-xl font-semibold">Licences</h2><p className="mt-1 text-sm text-muted-foreground">{isAdmin ? 'Suivez les licences, leurs responsables et leurs échéances.' : 'Gérez les licences qui vous sont attribuées.'}</p></div>{isAgent && <Button size="sm" onClick={openCreate}><Plus />Nouvelle licence</Button>}</div>
    <section className="rounded-lg border bg-card p-3" aria-label="Filtres des licences"><form className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_180px_180px_auto]" onSubmit={(event) => { event.preventDefault(); updateFilter('search', draftSearch.trim()) }}><label className="relative"><span className="sr-only">Rechercher une licence</span><Search className="absolute left-3 top-2 size-4 text-muted-foreground" /><input className={`${fieldClass} pl-9`} placeholder="Nom de la licence" value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} /></label><select aria-label="Filtrer par priorité" className={fieldClass} value={filters.urgency || ''} onChange={(event) => updateFilter('urgency', event.target.value as Urgency | '')}>{urgencies.map((value) => <option key={value || 'all'} value={value}>{value ? urgencyLabels[value] : 'Toutes les priorités'}</option>)}</select><select aria-label="Filtrer par statut" className={fieldClass} value={filters.renewalStatus || ''} onChange={(event) => updateFilter('renewalStatus', event.target.value as RenewalStatus | '')}>{statuses.map((value) => <option key={value || 'all'} value={value}>{value ? statusLabels[value] : 'Tous les statuts'}</option>)}</select><Button type="submit" variant="outline">Rechercher</Button></form></section>
    {rows.length === 0 ? <EmptyState title="Aucune licence" message="Aucune licence ne correspond aux filtres." action={isAgent ? <Button onClick={openCreate}><Plus />Nouvelle licence</Button> : undefined} /> : <div className="overflow-hidden rounded-lg border bg-card"><div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-sm"><thead className="border-b bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2">Licence</th><th className="px-3 py-2">Client</th><th className="px-3 py-2">Priorité</th><th className="px-3 py-2">Statut</th><th className="px-3 py-2">Quantité</th><th className="px-3 py-2">Responsable</th><th className="px-3 py-2"><span className="sr-only">Actions</span></th></tr></thead><tbody className="divide-y">{rows.map((license) => <tr key={license.id} className="hover:bg-muted/30"><td className="px-3 py-2"><Link className="font-medium text-primary hover:underline" to={`/licenses/${license.id}`}>{license.name}</Link><p className="mt-0.5 text-xs text-muted-foreground">Échéance : {formatDate(license.expiryDate)}</p></td><td className="px-3 py-2">{license.client.name}</td><td className="px-3 py-2"><UrgencyBadge urgency={license.urgency} days={license.daysUntilExpiry} /></td><td className="px-3 py-2"><StatusBadge status={license.renewalStatus} /></td><td className="px-3 py-2">{license.quantity ?? '—'}</td><td className="px-3 py-2">{isAdmin ? <select aria-label={`Attribuer ${license.name}`} className="h-8 max-w-44 rounded-md border bg-white px-2 text-sm" value={itemId(license.owner)} disabled={assign.isPending} onChange={(event) => assign.mutate({ id: license.id, owner: event.target.value })}>{(agents.data || []).map((agent) => <option key={itemId(agent)} value={itemId(agent)}>{personName(agent)}</option>)}</select> : personName(license.owner)}</td><td className="px-3 py-2 text-right">{isAgent && <Button size="sm" variant="ghost" onClick={() => openEdit(license)} aria-label={`Modifier ${license.name}`}><Edit3 />Modifier</Button>}</td></tr>)}</tbody></table></div></div>}
    {assign.isError && <p role="alert" className="text-sm text-red-700">{getApiErrorMessage(assign.error, 'Impossible de réattribuer la licence.')}</p>}
    {isAgent && <LicenseFormDialog open={dialogOpen} license={editing} initialClient={searchParams.get('client') || ''} clients={clients.data || []} offers={offers.data || []} busy={save.isPending} error={save.isError ? getApiErrorMessage(save.error, 'Impossible d’enregistrer la licence.') : undefined} onClose={() => setDialogOpen(false)} onSubmit={(input) => save.mutate(input)} />}
  </div>
}
