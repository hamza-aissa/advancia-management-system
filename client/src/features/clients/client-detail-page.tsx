import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, ArrowLeft, CalendarClock, FileKey2, FilePlus2, Pencil, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { ErrorState, PageLoader } from '@/components/feedback'
import { useAuth } from '@/contexts/auth-context'
import { getApiErrorMessage } from '@/lib/api'
import { archiveClient, clientKeys, getAssignableUsers, getClient, getFieldErrors, updateClient } from './api'
import { ClientForm } from './client-form'
import { ClientContact, Person, StatusBadge } from './client-ui'
import type { ClientUpdate } from './types'
import { ClientOperations } from './client-operations'

function formatDate(value?: string | null) { return value ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Non renseigné' }

export function ClientDetailPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [editOpen, setEditOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({})
  const clientQuery = useQuery({ queryKey: clientKeys.detail(id), queryFn: () => getClient(id), enabled: Boolean(id) })
  const agentsQuery = useQuery({ queryKey: clientKeys.users('agent'), queryFn: () => getAssignableUsers('agent'), enabled: isAdmin && editOpen })
  const consultantsQuery = useQuery({ queryKey: clientKeys.users('consultant'), queryFn: () => getAssignableUsers('consultant'), enabled: isAdmin && editOpen })
  const updateMutation = useMutation({ mutationFn: (input: ClientUpdate) => updateClient(id, input), onSuccess: async (client) => { queryClient.setQueryData(clientKeys.detail(id), client); await queryClient.invalidateQueries({ queryKey: clientKeys.all }); setEditOpen(false); setServerErrors({}) }, onError: (error) => setServerErrors(getFieldErrors(error)) })
  const archiveMutation = useMutation({ mutationFn: () => archiveClient(id), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: clientKeys.all }); navigate('/clients', { replace: true }) } })

  if (clientQuery.isPending) return <PageLoader label="Chargement du client" />
  if (clientQuery.isError || !clientQuery.data) return <div className="space-y-4"><Button asChild variant="ghost"><Link to="/clients"><ArrowLeft />Clients</Link></Button><ErrorState title="Client indisponible" message={getApiErrorMessage(clientQuery.error, 'Ce client n’existe pas ou a été archivé.')} retry={() => clientQuery.refetch()} /></div>
  const client = clientQuery.data

  return <div className="space-y-6">
    <Button asChild variant="ghost" className="-ml-3"><Link to="/clients"><ArrowLeft />Retour aux clients</Link></Button>
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-3"><h1 className="text-xl font-semibold">{client.name}</h1><StatusBadge status={client.status} /></div><p className="mt-1 text-sm text-muted-foreground">Compte client partagé et suivi opérationnel</p></div><div className="flex flex-wrap gap-2">{user?.role === 'agent' && <Button asChild size="sm"><Link to={`/licenses?client=${client.id}&nouvelle=1`}><FileKey2 />Ajouter une licence</Link></Button>}{user?.role === 'consultant' && <Button asChild size="sm"><Link to={`/contracts?client=${client.id}&nouveau=1`}><FilePlus2 />Créer le contrat</Link></Button>}<Button size="sm" variant="outline" onClick={() => { setServerErrors({}); setEditOpen(true) }}><Pencil />Modifier</Button>{isAdmin && <Button size="sm" variant="destructive" onClick={() => setArchiveOpen(true)}><Archive />Archiver</Button>}</div></div>
    <div className="grid gap-5 lg:grid-cols-3">
      <Card><CardHeader><CardTitle className="text-base">Coordonnées</CardTitle></CardHeader><CardContent><ClientContact client={client} /></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Responsable</CardTitle></CardHeader><CardContent className="space-y-4">{(user?.role === 'agent' || isAdmin) && <div><p className="mb-1 text-xs font-semibold text-muted-foreground">Agent · licences</p><Person user={client.assignedAgent} /></div>}{(user?.role === 'consultant' || isAdmin) && <div><p className="mb-1 text-xs font-semibold text-muted-foreground">Consultant · contrats</p><Person user={client.assignedConsultant} /></div>}</CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Suivi</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex items-start gap-3"><CalendarClock className="mt-0.5 size-4 text-muted-foreground" /><div><p className="text-xs font-semibold text-muted-foreground">Dernier contact</p><p className="mt-1 text-sm">{formatDate(client.lastContactAt)}</p></div></div><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-4 text-muted-foreground" /><div><p className="text-xs font-semibold text-muted-foreground">Statut du compte</p><p className="mt-1 text-sm">{client.status === 'at_risk' ? 'Une échéance arrive dans moins de 15 jours.' : 'Aucun risque de renouvellement immédiat.'}</p></div></div></CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle className="text-base">Notes opérationnelles</CardTitle></CardHeader><CardContent><p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{client.notes || 'Aucune note enregistrée.'}</p></CardContent></Card>
    <ClientOperations client={client} />
    <Dialog open={editOpen} onOpenChange={setEditOpen} title="Modifier le client" description={isAdmin ? 'Modifiez les coordonnées, les affectations et le contexte.' : 'Modifiez les coordonnées et le contexte sans changer les affectations.'}>
      {isAdmin && (agentsQuery.isPending || consultantsQuery.isPending) ? <PageLoader label="Chargement de l’équipe" /> : isAdmin && (agentsQuery.isError || consultantsQuery.isError) ? <div className="p-6"><ErrorState message="Impossible de charger les collaborateurs disponibles." /></div> : <ClientForm mode={isAdmin ? 'admin-edit' : 'operational-edit'} client={client} agents={agentsQuery.data} consultants={consultantsQuery.data} isSubmitting={updateMutation.isPending} serverErrors={serverErrors} onCancel={() => setEditOpen(false)} onSubmit={(input) => updateMutation.mutate(input)} />}
      {updateMutation.isError && Object.keys(serverErrors).length === 0 && <p className="px-6 pb-6 text-sm text-destructive" role="alert">{getApiErrorMessage(updateMutation.error, 'Impossible de modifier ce client.')}</p>}
    </Dialog>
    <Dialog open={archiveOpen} onOpenChange={setArchiveOpen} title="Archiver le client" description="Le client sort des files actives sans supprimer son historique."><div className="space-y-5 p-6"><p className="text-sm">Archiver <strong>{client.name}</strong> ? Le compte deviendra inactif.</p>{archiveMutation.isError && <p className="text-sm text-destructive" role="alert">{getApiErrorMessage(archiveMutation.error, 'Impossible d’archiver ce client.')}</p>}<div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setArchiveOpen(false)}>Annuler</Button><Button variant="destructive" disabled={archiveMutation.isPending} onClick={() => archiveMutation.mutate()}>{archiveMutation.isPending ? 'Archivage…' : 'Archiver'}</Button></div></div></Dialog>
  </div>
}
