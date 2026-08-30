import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { Plus, Trash2 } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { FieldError, fieldClass, textareaClass } from './contract-ui'
import type { ContractType } from '@/features/catalogs'
import type { ClientRef, Contract, PersonRef } from './types'
import { entityId, personName } from './types'

const optionalMoney = z.number().min(0).optional()
const moneyRegistration = { setValueAs: (value: string) => value === '' ? undefined : Number(value) }
const serviceSchema = z.object({
  name: z.string().trim().min(2, 'Saisissez le nom du service'),
  description: z.string().trim().optional(),
  quantity: z.number().positive('La quantité doit être supérieure à zéro'),
  unitPrice: z.number().min(0, 'Le prix doit être positif'),
})
const contractSchema = z.object({
  client: z.string().min(1, 'Sélectionnez un client'),
  contractType: z.string().min(1, 'Sélectionnez un type de contrat'),
  description: z.string().trim().optional(),
  startDate: z.string().min(1, 'Sélectionnez une date de début'),
  expiryDate: z.string().min(1, 'Sélectionnez une date d’échéance'),
  services: z.array(serviceSchema).min(1, 'Ajoutez au moins un service'),
}).refine((data) => !data.startDate || !data.expiryDate || data.expiryDate > data.startDate, { message: 'L’échéance doit être postérieure à la date de début', path: ['expiryDate'] })
export type ContractFormValues = z.infer<typeof contractSchema>

interface BaseDialogProps { open: boolean; onOpenChange: (open: boolean) => void; busy?: boolean; error?: string }

export function ContractFormDialog({ open, onOpenChange, busy, error, contract, initialClient = '', clients, contractTypes, onSubmit }: BaseDialogProps & {
  contract?: Contract; initialClient?: string; clients: ClientRef[]; contractTypes: ContractType[]; onSubmit: (values: ContractFormValues) => Promise<void>
}) {
  const clientId = !contract ? initialClient : typeof contract.client === 'string' ? contract.client : entityId(contract.client)
  const contractTypeId = !contract?.contractType ? '' : typeof contract.contractType === 'string' ? contract.contractType : entityId(contract.contractType)
  const defaults = useMemo<ContractFormValues>(() => ({ client: clientId, contractType: contractTypeId, description: contract?.description || '', startDate: contract?.startDate?.slice(0, 10) || '', expiryDate: contract?.expiryDate?.slice(0, 10) || '', services: contract?.services?.length ? contract.services : [{ name: '', description: '', quantity: 1, unitPrice: 0 }] }), [clientId, contract, contractTypeId])
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<ContractFormValues>({ resolver: zodResolver(contractSchema), defaultValues: defaults })
  const { fields, append, remove } = useFieldArray({ control, name: 'services' })
  useEffect(() => { if (open) reset(defaults) }, [defaults, open, reset])
  const total = (useWatch({ control, name: 'services' }) || []).reduce((sum, service) => sum + (Number(service.quantity) || 0) * (Number(service.unitPrice) || 0), 0)
  return <Dialog open={open} onOpenChange={onOpenChange} title={contract ? 'Modifier le contrat' : 'Nouveau contrat'} description="Renseignez l’accord commercial et son responsable.">
    <form className="space-y-4 p-6" onSubmit={handleSubmit(onSubmit)}>
      {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div><Label htmlFor="contract-client">Client</Label><select id="contract-client" className={fieldClass} disabled={Boolean(contract)} {...register('client')}><option value="">Sélectionner un client</option>{clients.map((client) => <option key={entityId(client)} value={entityId(client)}>{client.name}</option>)}</select><FieldError>{errors.client?.message}</FieldError></div>
      <div><Label htmlFor="contract-type">Type de contrat</Label><select id="contract-type" className={fieldClass} disabled={Boolean(contract)} {...register('contractType')}><option value="">Sélectionner un type</option>{contractTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select><FieldError>{errors.contractType?.message}</FieldError></div>
      <div><Label htmlFor="contract-description">Description</Label><textarea id="contract-description" className={textareaClass} {...register('description')} /></div>
      <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="contract-start">Date de début</Label><input id="contract-start" type="date" className={fieldClass} disabled={Boolean(contract)} {...register('startDate')} /><FieldError>{errors.startDate?.message}</FieldError></div><div><Label htmlFor="contract-expiry">Date d’échéance</Label><input id="contract-expiry" type="date" className={fieldClass} disabled={Boolean(contract)} {...register('expiryDate')} /><FieldError>{errors.expiryDate?.message}</FieldError></div></div>
      <section className="space-y-3 rounded-md border p-3"><div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold">Services inclus</h3><p className="text-xs text-muted-foreground">Le montant du contrat est calculé automatiquement.</p></div><Button type="button" size="sm" variant="outline" onClick={() => append({ name: '', description: '', quantity: 1, unitPrice: 0 })}><Plus />Ajouter</Button></div>
        {fields.map((field, index) => <div key={field.id} className="grid gap-3 border-t pt-3 sm:grid-cols-[minmax(0,1fr)_100px_140px_auto]"><div><Label htmlFor={`service-${index}-name`}>Service</Label><input id={`service-${index}-name`} className={fieldClass} {...register(`services.${index}.name`)} /><FieldError>{errors.services?.[index]?.name?.message}</FieldError></div><div><Label htmlFor={`service-${index}-quantity`}>Quantité</Label><input id={`service-${index}-quantity`} type="number" min="1" className={fieldClass} {...register(`services.${index}.quantity`, { valueAsNumber: true })} /><FieldError>{errors.services?.[index]?.quantity?.message}</FieldError></div><div><Label htmlFor={`service-${index}-price`}>Prix unitaire (TND)</Label><input id={`service-${index}-price`} type="number" min="0" step="0.01" className={fieldClass} {...register(`services.${index}.unitPrice`, { valueAsNumber: true })} /><FieldError>{errors.services?.[index]?.unitPrice?.message}</FieldError></div><Button type="button" size="icon" variant="ghost" className="self-end" disabled={fields.length === 1} onClick={() => remove(index)} aria-label="Supprimer le service"><Trash2 /></Button><div className="sm:col-span-4"><Label htmlFor={`service-${index}-description`}>Description <span className="font-normal text-muted-foreground">(facultatif)</span></Label><input id={`service-${index}-description`} className={fieldClass} {...register(`services.${index}.description`)} /></div></div>)}
        {typeof errors.services?.message === 'string' && <FieldError>{errors.services.message}</FieldError>}<div className="flex justify-end border-t pt-3 text-sm"><span className="text-muted-foreground">Total&nbsp;:</span><strong className="ml-2 font-mono">{total.toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND</strong></div>
      </section>
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button><Button disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</Button></div>
    </form>
  </Dialog>
}

const noteSchema = z.object({ note: z.string().trim().max(500).optional() })
type NoteValues = z.infer<typeof noteSchema>
export function ContactDialog({ open, onOpenChange, busy, error, onSubmit }: BaseDialogProps & { onSubmit: (note?: string) => Promise<void> }) {
  const { register, handleSubmit, reset } = useForm<NoteValues>({ resolver: zodResolver(noteSchema) })
  useEffect(() => { if (open) reset({ note: '' }) }, [open, reset])
  return <Dialog open={open} onOpenChange={onOpenChange} title="Marquer comme contacté" description="Enregistrez le contact avec le client."><form className="space-y-4 p-6" onSubmit={handleSubmit((v) => onSubmit(v.note))}>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div><Label htmlFor="contact-note">Note interne</Label><textarea id="contact-note" className={textareaClass} {...register('note')} /></div><DialogActions busy={busy} close={() => onOpenChange(false)} label="Confirmer le contact" /></form></Dialog>
}

const followUpSchema = z.object({ nextFollowUpAt: z.string().min(1, 'Sélectionnez une date de relance'), note: z.string().trim().max(500).optional() })
type FollowUpValues = z.infer<typeof followUpSchema>
export function FollowUpDialog({ open, onOpenChange, busy, error, onSubmit }: BaseDialogProps & { onSubmit: (values: FollowUpValues) => Promise<void> }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FollowUpValues>({ resolver: zodResolver(followUpSchema) })
  useEffect(() => { if (open) reset({ nextFollowUpAt: '', note: '' }) }, [open, reset])
  return <Dialog open={open} onOpenChange={onOpenChange} title="Planifier une relance" description="Définissez la prochaine action."><form className="space-y-4 p-6" onSubmit={handleSubmit(onSubmit)}>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div><Label htmlFor="follow-up-date">Prochaine relance</Label><input id="follow-up-date" type="date" className={fieldClass} {...register('nextFollowUpAt')} /><FieldError>{errors.nextFollowUpAt?.message}</FieldError></div><div><Label htmlFor="follow-up-note">Note</Label><textarea id="follow-up-note" className={textareaClass} {...register('note')} /></div><DialogActions busy={busy} close={() => onOpenChange(false)} label="Planifier" /></form></Dialog>
}

const renewSchema = z.object({ expiryDate: z.string().min(1, 'Sélectionnez la nouvelle échéance'), value: optionalMoney, note: z.string().trim().max(500).optional() })
export type RenewValues = z.infer<typeof renewSchema>
export function RenewDialog({ open, onOpenChange, busy, error, currentExpiryDate, onSubmit }: BaseDialogProps & { currentExpiryDate: string; onSubmit: (values: RenewValues) => Promise<void> }) {
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<RenewValues>({ resolver: zodResolver(renewSchema) })
  useEffect(() => { if (open) reset({ expiryDate: '', value: undefined, note: '' }) }, [open, reset])
  const submit = handleSubmit(async (values) => { if (values.expiryDate <= currentExpiryDate.slice(0, 10)) { setError('expiryDate', { message: 'La nouvelle échéance doit être postérieure à l’échéance actuelle' }); return } await onSubmit(values) })
  return <Dialog open={open} onOpenChange={onOpenChange} title="Enregistrer le renouvellement" description="Conservez l’ancienne échéance dans l’historique."><form className="space-y-4 p-6" onSubmit={submit}>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div><Label htmlFor="renew-expiry">Nouvelle échéance</Label><input id="renew-expiry" type="date" min={new Date(new Date(currentExpiryDate).getTime() + 86400000).toISOString().slice(0, 10)} className={fieldClass} {...register('expiryDate')} /><FieldError>{errors.expiryDate?.message}</FieldError></div><div><Label htmlFor="renew-value">Valeur du renouvellement</Label><input id="renew-value" type="number" min="0" step="0.01" className={fieldClass} {...register('value', moneyRegistration)} /><FieldError>{errors.value?.message}</FieldError></div><div><Label htmlFor="renew-note">Note</Label><textarea id="renew-note" className={textareaClass} {...register('note')} /></div><DialogActions busy={busy} close={() => onOpenChange(false)} label="Confirmer le renouvellement" /></form></Dialog>
}

const declineSchema = z.object({ reason: z.string().trim().min(3, 'Indiquez le motif du refus'), note: z.string().trim().max(500).optional() })
export type DeclineValues = z.infer<typeof declineSchema>
export function DeclineDialog({ open, onOpenChange, busy, error, onSubmit }: BaseDialogProps & { onSubmit: (values: DeclineValues) => Promise<void> }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<DeclineValues>({ resolver: zodResolver(declineSchema) })
  useEffect(() => { if (open) reset({ reason: '', note: '' }) }, [open, reset])
  return <Dialog open={open} onOpenChange={onOpenChange} title="Enregistrer un refus" description="Indiquez le motif de perte du renouvellement."><form className="space-y-4 p-6" onSubmit={handleSubmit(onSubmit)}>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div><Label htmlFor="decline-reason">Motif du refus</Label><textarea id="decline-reason" className={textareaClass} {...register('reason')} /><FieldError>{errors.reason?.message}</FieldError></div><div><Label htmlFor="decline-note">Note interne</Label><textarea id="decline-note" className={textareaClass} {...register('note')} /></div><DialogActions busy={busy} close={() => onOpenChange(false)} label="Marquer comme refusé" destructive /></form></Dialog>
}

const assignSchema = z.object({ owner: z.string().min(1, 'Sélectionnez un consultant') })
export function AssignDialog({ open, onOpenChange, busy, error, consultants, currentOwner, onSubmit }: BaseDialogProps & { consultants: PersonRef[]; currentOwner: string; onSubmit: (owner: string) => Promise<void> }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ owner: string }>({ resolver: zodResolver(assignSchema), defaultValues: { owner: currentOwner } })
  useEffect(() => { if (open) reset({ owner: currentOwner }) }, [open, currentOwner, reset])
  return <Dialog open={open} onOpenChange={onOpenChange} title="Réattribuer le contrat" description="Choisissez le consultant responsable de la prochaine action."><form className="space-y-4 p-6" onSubmit={handleSubmit((v) => onSubmit(v.owner))}>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div><Label htmlFor="assign-owner">Consultant responsable</Label><select id="assign-owner" className={fieldClass} {...register('owner')}><option value="">Sélectionner un consultant</option>{consultants.map((person) => <option key={entityId(person)} value={entityId(person)}>{personName(person)}</option>)}</select><FieldError>{errors.owner?.message}</FieldError></div><DialogActions busy={busy} close={() => onOpenChange(false)} label="Réattribuer" /></form></Dialog>
}

function DialogActions({ busy, close, label, destructive }: { busy?: boolean; close: () => void; label: string; destructive?: boolean }) {
  return <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={close}>Annuler</Button><Button variant={destructive ? 'destructive' : 'default'} disabled={busy}>{busy ? 'Enregistrement…' : label}</Button></div>
}
