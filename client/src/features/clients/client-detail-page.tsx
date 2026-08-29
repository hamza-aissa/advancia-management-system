import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, ArrowLeft, CalendarClock, Pencil, ShieldCheck } from 'lucide-react'
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

function formatDate(value?: string | null) { return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Not recorded' }

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

  if (clientQuery.isPending) return <PageLoader label="Loading client" />
  if (clientQuery.isError || !clientQuery.data) return <div className="space-y-4"><Button asChild variant="ghost"><Link to="/clients"><ArrowLeft />Clients</Link></Button><ErrorState title="Client unavailable" message={getApiErrorMessage(clientQuery.error, 'This client does not exist or is not assigned to you.')} retry={() => clientQuery.refetch()} /></div>
  const client = clientQuery.data

  return <div className="space-y-6">
    <Button asChild variant="ghost" className="-ml-3"><Link to="/clients"><ArrowLeft />Back to clients</Link></Button>
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{client.name}</h1><StatusBadge status={client.status} /></div><p className="mt-2 text-sm text-muted-foreground">Client account and operational ownership</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => { setServerErrors({}); setEditOpen(true) }}><Pencil />{isAdmin ? 'Edit client' : 'Update notes'}</Button>{isAdmin && <Button variant="destructive" onClick={() => setArchiveOpen(true)}><Archive />Archive</Button>}</div></div>
    <div className="grid gap-5 lg:grid-cols-3">
      <Card><CardHeader><CardTitle className="text-base">Contact</CardTitle></CardHeader><CardContent><ClientContact client={client} /></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Ownership</CardTitle></CardHeader><CardContent className="space-y-4"><div><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Agent · licences</p><Person user={client.assignedAgent} /></div><div><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Consultant · contracts</p><Person user={client.assignedConsultant} /></div></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Operational pulse</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex items-start gap-3"><CalendarClock className="mt-0.5 size-4 text-muted-foreground" /><div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Latest contact</p><p className="mt-1 text-sm">{formatDate(client.lastContactAt)}</p></div></div><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-4 text-muted-foreground" /><div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Account status</p><p className="mt-1 text-sm">{client.status === 'at_risk' ? 'A contract or licence expires within 15 days.' : 'No immediate renewal risk detected.'}</p></div></div></CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle className="text-base">Operational notes</CardTitle></CardHeader><CardContent><p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{client.notes || 'No operational notes have been recorded.'}</p></CardContent></Card>
    <Dialog open={editOpen} onOpenChange={setEditOpen} title={isAdmin ? 'Edit client' : 'Update client context'} description={isAdmin ? 'Update account details, ownership, and operational context.' : 'Record only the latest contact and notes for this assigned account.'}>
      {isAdmin && (agentsQuery.isPending || consultantsQuery.isPending) ? <PageLoader label="Loading team" /> : isAdmin && (agentsQuery.isError || consultantsQuery.isError) ? <div className="p-6"><ErrorState message="Unable to load assignable team members." /></div> : <ClientForm mode={isAdmin ? 'admin-edit' : 'operational-edit'} client={client} agents={agentsQuery.data} consultants={consultantsQuery.data} isSubmitting={updateMutation.isPending} serverErrors={serverErrors} onCancel={() => setEditOpen(false)} onSubmit={(input) => updateMutation.mutate(input)} />}
      {updateMutation.isError && Object.keys(serverErrors).length === 0 && <p className="px-6 pb-6 text-sm text-destructive" role="alert">{getApiErrorMessage(updateMutation.error, 'Unable to update this client.')}</p>}
    </Dialog>
    <Dialog open={archiveOpen} onOpenChange={setArchiveOpen} title="Archive client" description="This removes the client from active work queues without deleting its history."><div className="space-y-5 p-6"><p className="text-sm">Archive <strong>{client.name}</strong>? The account will become inactive and cannot be opened by assigned staff.</p>{archiveMutation.isError && <p className="text-sm text-destructive" role="alert">{getApiErrorMessage(archiveMutation.error, 'Unable to archive this client.')}</p>}<div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setArchiveOpen(false)}>Cancel</Button><Button variant="destructive" disabled={archiveMutation.isPending} onClick={() => archiveMutation.mutate()}>{archiveMutation.isPending ? 'Archiving…' : 'Archive client'}</Button></div></div></Dialog>
  </div>
}
