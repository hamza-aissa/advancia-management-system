import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, CalendarClock, Edit3, Mail, Plus, RotateCw, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { EmptyState } from '@/components/feedback'
import { useAuth } from '@/contexts/auth-context'
import { getApiErrorMessage } from '@/lib/api'
import { catalogApi } from '@/features/catalogs'
import { contractsApi } from '@/features/contracts/contracts-api'
import { AssignDialog, ContactDialog, ContractFormDialog, DeclineDialog, FollowUpDialog, RenewDialog, type ContractFormValues, type DeclineValues, type RenewValues } from '@/features/contracts/contract-dialogs'
import { formatDate as formatContractDate, formatMoney, StatusBadge as ContractStatus, UrgencyBadge as ContractUrgency } from '@/features/contracts/contract-ui'
import { entityId, personName as contractPersonName } from '@/features/contracts/types'
import { licenseApi } from '@/features/licenses/license-api'
import { LicenseActionDialog, LicenseFormDialog, type LicenseAction } from '@/features/licenses/license-dialogs'
import { formatDate, itemId, personName, StatusBadge, UrgencyBadge } from '@/features/licenses/license-ui'
import type { License, LicenseInput } from '@/features/licenses/types'
import { clientKeys } from './api'
import type { Client } from './types'

type LicenseActionValues = { note?: string; nextFollowUpAt?: string; expiryDate?: string; value?: number; reason?: string }
type ContractAction = 'contact' | 'follow-up' | 'renew' | 'decline' | 'assign' | null

export function ClientOperations({ client }: { client: Client }) {
  const { user } = useAuth()
  const isAgent = user?.role === 'agent'
  const isConsultant = user?.role === 'consultant'
  const isAdmin = user?.role === 'admin'
  return <div className="space-y-6">
    {(isAgent || isAdmin) && <LicensesSection client={client} editable={isAgent} admin={isAdmin} />}
    {(isConsultant || isAdmin) && <ContractSection client={client} editable={isConsultant} admin={isAdmin} />}
  </div>
}

function LicensesSection({ client, editable, admin }: { client: Client; editable: boolean; admin: boolean }) {
  const queryClient = useQueryClient()
  const rows = client.licenses || []
  const [form, setForm] = useState<{ open: boolean; license?: License }>({ open: false })
  const [action, setAction] = useState<{ license: License; kind: LicenseAction } | null>(null)
  const [archiving, setArchiving] = useState<License | null>(null)
  const offers = useQuery({ queryKey: ['license-offers'], queryFn: () => catalogApi.licenseOffers(), enabled: editable })
  const agents = useQuery({ queryKey: ['license-agents'], queryFn: licenseApi.agents, enabled: admin })
  const refresh = async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: clientKeys.detail(client.id) }), queryClient.invalidateQueries({ queryKey: ['licenses'] })]) }
  const save = useMutation({ mutationFn: (input: LicenseInput | Partial<LicenseInput>) => form.license ? licenseApi.update(form.license.id, input) : licenseApi.create(input as LicenseInput), onSuccess: async () => { await refresh(); setForm({ open: false }) } })
  const act = useMutation({ mutationFn: async ({ license, kind, values }: { license: License; kind: LicenseAction; values: LicenseActionValues }) => {
    if (kind === 'contact') return licenseApi.contact(license.id, values.note)
    if (kind === 'followUp') return licenseApi.followUp(license.id, new Date(values.nextFollowUpAt!).toISOString(), values.note)
    if (kind === 'renew') return licenseApi.renew(license.id, values.expiryDate!, values.value, values.note)
    return licenseApi.decline(license.id, values.reason!, values.note)
  }, onSuccess: async () => { await refresh(); setAction(null) } })
  const archive = useMutation({ mutationFn: (id: string) => licenseApi.archive(id), onSuccess: async () => { await refresh(); setArchiving(null) } })
  const assign = useMutation({ mutationFn: ({ id, owner }: { id: string; owner: string }) => licenseApi.assign(id, owner), onSuccess: refresh })
  return <section className="rounded-lg border bg-card"><div className="flex items-center justify-between gap-3 border-b px-3 py-2"><div><h3 className="text-sm font-semibold">Licences</h3><p className="text-[11px] text-muted-foreground">{rows.length} licence{rows.length > 1 ? 's' : ''} active{rows.length > 1 ? 's' : ''} pour ce client</p></div>{editable && <Button size="sm" onClick={() => setForm({ open: true })}><Plus />Ajouter</Button>}</div>
    {rows.length === 0 ? <div className="p-3"><EmptyState title="Aucune licence" message={editable ? 'Ajoutez la première licence de ce client.' : 'Aucune licence active pour ce client.'} /></div> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead><tr className="border-b bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground"><th className="px-3 py-2 text-left font-medium">Licence</th><th className="px-3 py-2 text-left font-medium">Échéance</th><th className="px-3 py-2 text-left font-medium">Priorité</th><th className="px-3 py-2 text-left font-medium">Statut</th><th className="px-3 py-2 text-left font-medium">Responsable</th><th className="px-3 py-2 text-right font-medium">Actions</th></tr></thead><tbody>{rows.map((license) => <tr key={license.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30"><td className="px-3 py-2"><Link to={`/licenses/${license.id}`} className="font-medium text-primary hover:underline">{license.name}</Link><p className="text-[11px] text-muted-foreground">{license.quantity || 0} unité(s)</p></td><td className="px-3 py-2 font-mono text-[12px]">{formatDate(license.expiryDate)}</td><td className="px-3 py-2"><UrgencyBadge urgency={license.urgency} days={license.daysUntilExpiry} /></td><td className="px-3 py-2"><StatusBadge status={license.renewalStatus} /></td><td className="px-3 py-2">{admin ? <select aria-label={`Responsable de ${license.name}`} className="h-8 rounded-md border bg-background px-2 text-sm" value={itemId(license.owner)} disabled={assign.isPending} onChange={(event) => assign.mutate({ id: license.id, owner: event.target.value })}>{(agents.data || []).map((agent) => <option key={itemId(agent)} value={itemId(agent)}>{personName(agent)}</option>)}</select> : personName(license.owner)}</td><td className="px-3 py-2"><div className="flex justify-end gap-1">{editable && <><Button size="sm" variant="ghost" onClick={() => setForm({ open: true, license })}><Edit3 />Modifier</Button><Button size="icon" variant="ghost" aria-label="Marquer contacté" onClick={() => setAction({ license, kind: 'contact' })}><Mail /></Button><Button size="icon" variant="ghost" aria-label="Planifier une relance" onClick={() => setAction({ license, kind: 'followUp' })}><CalendarClock /></Button><Button size="icon" variant="ghost" aria-label="Renouveler" onClick={() => setAction({ license, kind: 'renew' })}><RotateCw /></Button><Button size="icon" variant="ghost" aria-label="Refuser" onClick={() => setAction({ license, kind: 'decline' })}><XCircle /></Button></>}<Button size="icon" variant="ghost" className="text-destructive" aria-label="Archiver la licence" onClick={() => setArchiving(license)}><Archive /></Button></div></td></tr>)}</tbody></table></div>}
    {(save.isError || act.isError || assign.isError) && <p className="border-t px-3 py-2 text-sm text-destructive" role="alert">{getApiErrorMessage(save.error || act.error || assign.error)}</p>}
    {editable && <LicenseFormDialog open={form.open} license={form.license} initialClient={client.id} clients={[client]} offers={offers.data || []} busy={save.isPending} error={save.isError ? getApiErrorMessage(save.error) : undefined} onClose={() => setForm({ open: false })} onSubmit={(input) => save.mutate(input)} />}
    {editable && <LicenseActionDialog action={action?.kind || null} busy={act.isPending} error={act.isError ? getApiErrorMessage(act.error) : undefined} onClose={() => setAction(null)} onSubmit={(values) => action && act.mutate({ ...action, values })} />}
    <ConfirmArchive open={Boolean(archiving)} title="Archiver la licence" name={archiving?.name || ''} busy={archive.isPending} error={archive.isError ? getApiErrorMessage(archive.error) : undefined} close={() => setArchiving(null)} confirm={() => archiving && archive.mutate(archiving.id)} />
  </section>
}

function ContractSection({ client, editable, admin }: { client: Client; editable: boolean; admin: boolean }) {
  const queryClient = useQueryClient(); const contract = client.contracts?.[0]
  const [editing, setEditing] = useState(false); const [action, setAction] = useState<ContractAction>(null); const [archiveOpen, setArchiveOpen] = useState(false)
  const types = useQuery({ queryKey: ['contract-types'], queryFn: () => catalogApi.contractTypes(), enabled: editable })
  const consultants = useQuery({ queryKey: ['consultants'], queryFn: contractsApi.consultants, enabled: admin })
  const refresh = async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: clientKeys.detail(client.id) }), queryClient.invalidateQueries({ queryKey: ['contracts'] })]) }
  const save = useMutation({ mutationFn: (values: ContractFormValues) => contract ? contractsApi.update(entityId(contract), { description: values.description, services: values.services }) : contractsApi.create({ ...values, startDate: new Date(values.startDate).toISOString(), expiryDate: new Date(values.expiryDate).toISOString() }), onSuccess: async () => { await refresh(); setEditing(false) } })
  const act = useMutation({ mutationFn: async ({ kind, payload }: { kind: Exclude<ContractAction, null>; payload?: unknown }) => {
    const id = entityId(contract!); if (kind === 'contact') return contractsApi.contact(id, payload as string | undefined)
    if (kind === 'follow-up') { const value = payload as { nextFollowUpAt: string; note?: string }; return contractsApi.followUp(id, new Date(value.nextFollowUpAt).toISOString(), value.note) }
    if (kind === 'renew') { const value = payload as RenewValues; return contractsApi.renew(id, value.expiryDate, value.value, value.note) }
    if (kind === 'decline') { const value = payload as DeclineValues; return contractsApi.decline(id, value.reason, value.note) }
    return contractsApi.reassign(id, payload as string)
  }, onSuccess: async () => { await refresh(); setAction(null) } })
  const archive = useMutation({ mutationFn: () => contractsApi.archive(entityId(contract!)), onSuccess: async () => { await refresh(); setArchiveOpen(false) } })
  const error = getApiErrorMessage(save.error || act.error)
  return <section className="rounded-lg border bg-card"><div className="flex items-center justify-between gap-3 border-b px-3 py-2"><div><h3 className="text-sm font-semibold">Contrat</h3><p className="text-[11px] text-muted-foreground">Un seul contrat actif par client</p></div>{editable && !contract && <Button size="sm" onClick={() => setEditing(true)}><Plus />Créer le contrat</Button>}</div>
    {!contract ? <div className="p-3"><EmptyState title="Aucun contrat" message={editable ? 'Créez le contrat et ajoutez ses services.' : 'Aucun contrat actif pour ce client.'} /></div> : <div className="p-3"><div className="flex flex-col justify-between gap-4 lg:flex-row"><div><div className="flex flex-wrap gap-2"><ContractUrgency urgency={contract.urgency} days={contract.daysUntilExpiry} /><ContractStatus status={contract.renewalStatus} /></div><Link to={`/contracts/${entityId(contract)}`} className="mt-2 inline-block font-medium text-primary hover:underline">{contract.title}</Link><p className="mt-1 text-sm text-muted-foreground">Échéance {formatContractDate(contract.expiryDate)} · {formatMoney(contract.value)}</p><p className="mt-1 text-sm">Responsable : {contractPersonName(contract.owner)}</p></div><div className="flex flex-wrap items-start gap-1">{editable && <><Button size="sm" variant="outline" onClick={() => setEditing(true)}><Edit3 />Services et contrat</Button><Button size="sm" variant="ghost" onClick={() => setAction('contact')}>Contacté</Button><Button size="sm" variant="ghost" onClick={() => setAction('follow-up')}>Relance</Button><Button size="sm" variant="ghost" onClick={() => setAction('renew')}>Renouveler</Button><Button size="sm" variant="ghost" onClick={() => setAction('decline')}>Refuser</Button></>}{admin && <><Button size="sm" variant="outline" onClick={() => setAction('assign')}>Réattribuer</Button><Button size="sm" variant="ghost" className="text-destructive" onClick={() => setArchiveOpen(true)}><Archive />Archiver</Button></>}</div></div>{contract.services?.length > 0 && <div className="mt-4 overflow-x-auto rounded-lg border"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground"><th className="px-3 py-2 text-left font-medium">Service</th><th className="px-3 py-2 text-right font-medium">Quantité</th><th className="px-3 py-2 text-right font-medium">Prix unitaire</th></tr></thead><tbody>{contract.services.map((service, index) => <tr key={`${service.name}-${index}`} className="border-b border-border/60 last:border-0"><td className="px-3 py-2"><p className="font-medium">{service.name}</p>{service.description && <p className="text-[11px] text-muted-foreground">{service.description}</p>}</td><td className="px-3 py-2 text-right font-mono">{service.quantity}</td><td className="px-3 py-2 text-right font-mono">{formatMoney(service.unitPrice)}</td></tr>)}</tbody></table></div>}</div>}
    {(save.isError || act.isError) && <p className="border-t px-3 py-2 text-sm text-destructive" role="alert">{error}</p>}
    {editable && <ContractFormDialog open={editing} onOpenChange={setEditing} contract={contract} initialClient={client.id} clients={[client]} contractTypes={types.data || []} busy={save.isPending} error={save.isError ? error : undefined} onSubmit={(values) => save.mutateAsync(values).then(() => undefined)} />}
    {editable && contract && <><ContactDialog open={action === 'contact'} onOpenChange={(open) => !open && setAction(null)} busy={act.isPending} error={act.isError ? error : undefined} onSubmit={(value) => act.mutateAsync({ kind: 'contact', payload: value }).then(() => undefined)} /><FollowUpDialog open={action === 'follow-up'} onOpenChange={(open) => !open && setAction(null)} busy={act.isPending} error={act.isError ? error : undefined} onSubmit={(value) => act.mutateAsync({ kind: 'follow-up', payload: value }).then(() => undefined)} /><RenewDialog open={action === 'renew'} onOpenChange={(open) => !open && setAction(null)} busy={act.isPending} error={act.isError ? error : undefined} currentExpiryDate={contract.expiryDate} onSubmit={(value) => act.mutateAsync({ kind: 'renew', payload: value }).then(() => undefined)} /><DeclineDialog open={action === 'decline'} onOpenChange={(open) => !open && setAction(null)} busy={act.isPending} error={act.isError ? error : undefined} onSubmit={(value) => act.mutateAsync({ kind: 'decline', payload: value }).then(() => undefined)} /></>}
    {admin && contract && <AssignDialog open={action === 'assign'} onOpenChange={(open) => !open && setAction(null)} busy={act.isPending} error={act.isError ? error : undefined} consultants={consultants.data || []} currentOwner={typeof contract.owner === 'string' ? contract.owner : entityId(contract.owner)} onSubmit={(owner) => act.mutateAsync({ kind: 'assign', payload: owner }).then(() => undefined)} />}
    <ConfirmArchive open={archiveOpen} title="Archiver le contrat" name={contract?.title || ''} busy={archive.isPending} error={archive.isError ? getApiErrorMessage(archive.error) : undefined} close={() => setArchiveOpen(false)} confirm={() => archive.mutate()} />
  </section>
}

function ConfirmArchive({ open, title, name, busy, error, close, confirm }: { open: boolean; title: string; name: string; busy: boolean; error?: string; close: () => void; confirm: () => void }) { return <Dialog open={open} onOpenChange={(value) => !value && close()} title={title} description="L’historique est conservé et l’élément disparaît des files actives."><div className="space-y-4 p-4"><p className="text-sm">Confirmer l’archivage de <strong>{name}</strong> ?</p>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex justify-end gap-2"><Button variant="outline" onClick={close}>Annuler</Button><Button variant="destructive" disabled={busy} onClick={confirm}>{busy ? 'Archivage…' : 'Archiver'}</Button></div></div></Dialog> }
