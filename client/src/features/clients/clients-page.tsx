import { useQuery } from '@tanstack/react-query'
import { Plus, Search, UsersRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { EmptyState, ErrorState, PageLoader } from '@/components/feedback'
import { useAuth } from '@/contexts/auth-context'
import { getApiErrorMessage } from '@/lib/api'
import { ClientForm } from './client-form'
import { ClientCard, Person, StatusBadge } from './client-ui'
import { clientKeys, createClient, getAssignableUsers, getClients, getFieldErrors } from './api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ClientInput, ClientStatus } from './types'
import { Link } from 'react-router-dom'

const selectClass = 'h-10 rounded-md border border-input bg-card px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/20'

export function ClientsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ClientStatus | 'all'>('all')
  const [assignment, setAssignment] = useState('all')
  const [archived, setArchived] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({})

  const clientsQuery = useQuery({ queryKey: clientKeys.list({ search, status, archived }), queryFn: () => getClients({ search, status, archived }) })
  const agentsQuery = useQuery({ queryKey: clientKeys.users('agent'), queryFn: () => getAssignableUsers('agent'), enabled: isAdmin })
  const consultantsQuery = useQuery({ queryKey: clientKeys.users('consultant'), queryFn: () => getAssignableUsers('consultant'), enabled: isAdmin })
  const createMutation = useMutation({ mutationFn: (input: ClientInput) => createClient(input), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: clientKeys.all }); setCreateOpen(false); setServerErrors({}) }, onError: (error) => setServerErrors(getFieldErrors(error)) })

  const clients = useMemo(() => (clientsQuery.data ?? []).filter((client) => assignment === 'all' || client.assignedAgent?.id === assignment || client.assignedConsultant?.id === assignment), [assignment, clientsQuery.data])
  const people = [...(agentsQuery.data ?? []), ...(consultantsQuery.data ?? [])]

  return <div className="space-y-5">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h1 className="text-xl font-semibold">Clients</h1><p className="mt-1 text-sm text-muted-foreground">Annuaire partagé entre les départements licences et contrats.</p></div><Button size="sm" onClick={() => { setServerErrors({}); setCreateOpen(true) }}><Plus />Nouveau client</Button></div>
    <div className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[minmax(16rem,1fr)_auto_auto_auto]">
      <label className="relative"><span className="sr-only">Rechercher un client</span><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input className="h-10 pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom ou e-mail" /></label>
      <label><span className="sr-only">Filtrer par statut</span><select className={selectClass} value={status} onChange={(event) => setStatus(event.target.value as ClientStatus | 'all')}><option value="all">Tous les statuts</option><option value="at_risk">À risque</option><option value="active">Actif</option><option value="inactive">Inactif</option></select></label>
      {isAdmin && <label><span className="sr-only">Filtrer par responsable</span><select className={selectClass} value={assignment} onChange={(event) => setAssignment(event.target.value)}><option value="all">Tous les responsables</option>{people.map((person) => <option key={person.id} value={person.id}>{person.firstName} {person.lastName} · {person.role}</option>)}</select></label>}
      {isAdmin && <label className="flex h-10 items-center gap-2 rounded-md border px-3 text-sm"><input type="checkbox" checked={archived} onChange={(event) => setArchived(event.target.checked)} />Archivés uniquement</label>}
    </div>
    {clientsQuery.isPending ? <PageLoader label="Chargement des clients" /> : clientsQuery.isError ? <ErrorState message={getApiErrorMessage(clientsQuery.error, 'Impossible de charger les clients.')} retry={() => clientsQuery.refetch()} /> : clients.length === 0 ? <EmptyState title={search || status !== 'all' || assignment !== 'all' ? 'Aucun client ne correspond aux filtres' : 'Aucun client'} message="Modifiez les filtres ou créez le premier client." action={!search && status === 'all' ? <Button size="sm" onClick={() => setCreateOpen(true)}><Plus />Nouveau client</Button> : undefined} /> : <>
      <div className="grid gap-4 md:hidden">{clients.map((client) => <ClientCard key={client.id} client={client} role={user?.role} />)}</div>
      <div className="hidden overflow-hidden rounded-lg border bg-card md:block"><table className="w-full text-left text-sm"><thead className="border-b bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-3 py-2 font-semibold">Client</th><th className="px-3 py-2 font-semibold">Statut</th>{(user?.role === 'agent' || isAdmin) && <th className="px-3 py-2 font-semibold">Agent</th>}{(user?.role === 'consultant' || isAdmin) && <th className="px-3 py-2 font-semibold">Consultant</th>}<th className="px-3 py-2"><span className="sr-only">Ouvrir</span></th></tr></thead><tbody className="divide-y">{clients.map((client) => <tr key={client.id} className="hover:bg-muted/35"><td className="px-3 py-2"><p className="font-semibold">{client.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{client.email}</p></td><td className="px-3 py-2"><StatusBadge status={client.status} /></td>{(user?.role === 'agent' || isAdmin) && <td className="px-3 py-2"><Person user={client.assignedAgent} /></td>}{(user?.role === 'consultant' || isAdmin) && <td className="px-3 py-2"><Person user={client.assignedConsultant} /></td>}<td className="px-3 py-2 text-right">{client.archivedAt ? <span className="text-xs text-muted-foreground">Archivé</span> : <Button asChild variant="ghost" size="sm"><Link to={`/clients/${client.id}`}>Voir</Link></Button>}</td></tr>)}</tbody></table></div>
      <p className="flex items-center gap-2 text-xs text-muted-foreground"><UsersRound className="size-4" />{clients.length} client{clients.length > 1 ? 's' : ''} affiché{clients.length > 1 ? 's' : ''}</p>
    </>}
    <Dialog open={createOpen} onOpenChange={setCreateOpen} title="Créer un client" description={isAdmin ? 'Créez le client et affectez ses responsables si nécessaire.' : 'Le client sera automatiquement rattaché à votre département.'}>
      {isAdmin && (agentsQuery.isPending || consultantsQuery.isPending) ? <PageLoader label="Chargement de l’équipe" /> : isAdmin && (agentsQuery.isError || consultantsQuery.isError) ? <div className="p-6"><ErrorState message="Impossible de charger les collaborateurs disponibles." /></div> : <ClientForm mode="create" agents={agentsQuery.data} consultants={consultantsQuery.data} isSubmitting={createMutation.isPending} serverErrors={serverErrors} onCancel={() => setCreateOpen(false)} onSubmit={(input) => createMutation.mutate(input as ClientInput)} />}
      {createMutation.isError && Object.keys(serverErrors).length === 0 && <p className="px-6 pb-6 text-sm text-destructive" role="alert">{getApiErrorMessage(createMutation.error, 'Impossible de créer ce client.')}</p>}
    </Dialog>
  </div>
}
