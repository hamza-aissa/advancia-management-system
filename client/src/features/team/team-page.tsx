import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, UserCheck, UserX } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { EmptyState, ErrorState, PageLoader } from '@/components/feedback'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getApiErrorMessage } from '@/lib/api'
import { teamApi, type TeamMemberInput } from './api'

const roleLabel = { agent: 'Agent · licences', consultant: 'Consultant · contrats', admin: 'Administrateur' }

export function TeamPage() {
  const [creating, setCreating] = useState(false)
  const queryClient = useQueryClient()
  const team = useQuery({ queryKey: ['team'], queryFn: teamApi.list })
  const status = useMutation({ mutationFn: ({ id, active }: { id: string; active: boolean }) => teamApi.setActive(id, active), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team'] }) })
  if (team.isPending) return <PageLoader label="Chargement de l’équipe" />
  if (team.isError) return <ErrorState message={getApiErrorMessage(team.error)} retry={() => team.refetch()} />
  return <div className="space-y-4">
    <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold tracking-tight">Comptes collaborateurs</h2><p className="mt-1 text-sm text-muted-foreground">Créez et désactivez les accès des Agents et Consultants.</p></div><Button size="sm" onClick={() => setCreating(true)}><Plus />Nouveau compte</Button></div>
    {team.data.length === 0 ? <EmptyState title="Aucun collaborateur" message="Créez le premier compte opérationnel." /> : <div className="overflow-x-auto rounded-lg border bg-card"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground"><th className="px-3 py-2 text-left font-medium">Collaborateur</th><th className="px-3 py-2 text-left font-medium">Département</th><th className="px-3 py-2 text-left font-medium">État</th><th className="px-3 py-2 text-right font-medium">Action</th></tr></thead><tbody>{team.data.map((member) => <tr key={member.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30"><td className="px-3 py-2"><p className="font-medium">{member.firstName} {member.lastName}</p><p className="text-[11px] text-muted-foreground">{member.email}</p></td><td className="px-3 py-2">{roleLabel[member.role]}</td><td className="px-3 py-2"><span className="rounded-md border px-2 py-0.5 text-[11px] font-medium">{member.active === false ? 'Désactivé' : 'Actif'}</span></td><td className="px-3 py-2 text-right"><Button size="sm" variant="ghost" disabled={status.isPending} onClick={() => status.mutate({ id: member.id, active: member.active === false })}>{member.active === false ? <UserCheck /> : <UserX />}{member.active === false ? 'Réactiver' : 'Désactiver'}</Button></td></tr>)}</tbody></table></div>}
    {status.isError && <p role="alert" className="text-sm text-destructive">{getApiErrorMessage(status.error)}</p>}
    <CreateMemberDialog open={creating} close={() => setCreating(false)} />
  </div>
}

function CreateMemberDialog({ open, close }: { open: boolean; close: () => void }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<TeamMemberInput>({ defaultValues: { role: 'agent' } })
  useEffect(() => { if (open) reset({ firstName: '', lastName: '', email: '', password: '', role: 'agent' }) }, [open, reset])
  const create = useMutation({ mutationFn: teamApi.create, onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['team'] }); close() } })
  return <Dialog open={open} onOpenChange={(value) => !value && close()} title="Nouveau compte" description="Le collaborateur pourra se connecter dès la création."><form className="space-y-4 p-4" onSubmit={handleSubmit((input) => create.mutate(input))}>{create.isError && <p role="alert" className="text-sm text-destructive">{getApiErrorMessage(create.error)}</p>}<div className="grid grid-cols-2 gap-3"><Field label="Prénom" error={errors.firstName?.message}><Input className="h-8" {...register('firstName', { required: 'Prénom requis', minLength: 2 })} /></Field><Field label="Nom" error={errors.lastName?.message}><Input className="h-8" {...register('lastName', { required: 'Nom requis', minLength: 2 })} /></Field></div><Field label="Adresse e-mail" error={errors.email?.message}><Input className="h-8" type="email" {...register('email', { required: 'Adresse e-mail requise' })} /></Field><Field label="Mot de passe initial" error={errors.password?.message}><Input className="h-8" type="password" {...register('password', { required: 'Mot de passe requis', minLength: { value: 8, message: '8 caractères minimum' } })} /></Field><Field label="Département"><select className="h-8 w-full rounded-md border bg-background px-3 text-sm" {...register('role')}><option value="agent">Agent · licences</option><option value="consultant">Consultant · contrats</option></select></Field><div className="flex justify-end gap-2 border-t pt-3"><Button type="button" variant="outline" onClick={close}>Annuler</Button><Button disabled={create.isPending}>{create.isPending ? 'Création…' : 'Créer le compte'}</Button></div></form></Dialog>
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <div className="space-y-1"><Label className="text-[11px] text-muted-foreground">{label}</Label>{children}{error && <p className="text-[11px] text-destructive">{error}</p>}</div> }
