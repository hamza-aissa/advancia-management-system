import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { FieldError, Modal, fieldClass, itemId, textareaClass } from './license-ui'
import type { License, LicenseClientOption, LicenseInput, LicensePerson } from './types'

const optionalNumber = z.string().refine((value) => !value || (!Number.isNaN(Number(value)) && Number(value) >= 0), 'Saisissez un nombre positif').optional()
const licenseSchema = z.object({
  client: z.string().min(1, 'Sélectionnez un client'), name: z.string().trim().min(2, 'Saisissez le nom de la licence'),
  description: z.string().optional(), startDate: z.string().min(1, 'Sélectionnez une date de début'), expiryDate: z.string().min(1, 'Sélectionnez une date d’échéance'),
  value: optionalNumber, quantity: optionalNumber, owner: z.string().optional(),
}).refine((data) => !data.startDate || !data.expiryDate || data.expiryDate > data.startDate, { path: ['expiryDate'], message: 'L’échéance doit être postérieure à la date de début' })

type FormValues = z.input<typeof licenseSchema>
const dateInput = (value?: string) => value ? value.slice(0, 10) : ''

export function LicenseFormDialog({ open, license, clients, agents, isAdmin, busy, error, onClose, onSubmit }: {
  open: boolean; license?: License; clients: LicenseClientOption[]; agents: LicensePerson[]; isAdmin: boolean; busy: boolean; error?: string; onClose: () => void; onSubmit: (input: LicenseInput) => void
}) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(licenseSchema), defaultValues: { quantity: '1' } })
  useEffect(() => reset(license ? {
    client: itemId(license.client), name: license.name, description: license.description || '', startDate: dateInput(license.startDate), expiryDate: dateInput(license.expiryDate), value: license.value?.toString() || '', quantity: license.quantity?.toString() || '', owner: itemId(license.owner),
  } : { client: '', name: '', description: '', startDate: '', expiryDate: '', value: '', quantity: '1', owner: '' }), [license, open, reset])
  return <Modal open={open} title={license ? 'Modifier la licence' : 'Nouvelle licence'} description="Renseignez les informations utiles au suivi du renouvellement." onClose={onClose}>
    <form className="space-y-4" noValidate onSubmit={handleSubmit((values) => onSubmit({ ...values, value: values.value ? Number(values.value) : undefined, quantity: values.quantity ? Number(values.quantity) : undefined }))}>
      {error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
      <div><Label htmlFor="license-client">Client</Label><select id="license-client" className={fieldClass} disabled={Boolean(license)} aria-invalid={Boolean(errors.client)} {...register('client')}><option value="">Sélectionner un client</option>{clients.map((client) => <option key={itemId(client)} value={itemId(client)}>{client.name}</option>)}</select><FieldError message={errors.client?.message} /></div>
      <div><Label htmlFor="license-name">Nom de la licence</Label><input id="license-name" className={fieldClass} aria-invalid={Boolean(errors.name)} {...register('name')} /><FieldError message={errors.name?.message} /></div>
      <div><Label htmlFor="license-description">Description</Label><textarea id="license-description" className={textareaClass} {...register('description')} /></div>
      <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="license-start">Date de début</Label><input id="license-start" type="date" className={fieldClass} disabled={Boolean(license)} {...register('startDate')} /><FieldError message={errors.startDate?.message} /></div><div><Label htmlFor="license-expiry">Date d’échéance</Label><input id="license-expiry" type="date" className={fieldClass} disabled={Boolean(license)} {...register('expiryDate')} /><FieldError message={errors.expiryDate?.message} /></div></div>
      <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="license-quantity">Quantité</Label><input id="license-quantity" type="number" min="0" className={fieldClass} {...register('quantity')} /><FieldError message={errors.quantity?.message} /></div><div><Label htmlFor="license-value">Valeur du renouvellement</Label><input id="license-value" type="number" min="0" step="0.01" className={fieldClass} {...register('value')} /><FieldError message={errors.value?.message} /></div></div>
      {isAdmin && !license && <div><Label htmlFor="license-owner">Agent responsable</Label><select id="license-owner" className={fieldClass} aria-invalid={Boolean(errors.owner)} {...register('owner')}><option value="">Sélectionner un agent</option>{agents.map((agent) => <option key={itemId(agent)} value={itemId(agent)}>{agent.firstName} {agent.lastName}</option>)}</select><FieldError message={errors.owner?.message} /></div>}
      <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={onClose}>Annuler</Button><Button disabled={busy}>{busy ? 'Enregistrement…' : license ? 'Enregistrer' : 'Créer la licence'}</Button></div>
    </form>
  </Modal>
}

const actionSchemas = {
  contact: z.object({ note: z.string().optional() }),
  followUp: z.object({ nextFollowUpAt: z.string().min(1, 'Sélectionnez une date de relance'), note: z.string().optional() }),
  renew: z.object({ expiryDate: z.string().min(1, 'Sélectionnez la nouvelle échéance'), value: optionalNumber, note: z.string().optional() }),
  decline: z.object({ reason: z.string().trim().min(3, 'Indiquez le motif du refus'), note: z.string().optional() }),
}
export type LicenseAction = keyof typeof actionSchemas
type ActionValues = { note?: string; nextFollowUpAt?: string; expiryDate?: string; value?: string; reason?: string }
const actionCopy: Record<LicenseAction, { title: string; description: string; submit: string }> = {
  contact: { title: 'Enregistrer le contact', description: 'Confirmez que le client a été contacté.', submit: 'Marquer comme contacté' },
  followUp: { title: 'Planifier une relance', description: 'Définissez la prochaine date d’action.', submit: 'Planifier la relance' },
  renew: { title: 'Enregistrer le renouvellement', description: 'Prolongez la licence et conservez son historique.', submit: 'Confirmer le renouvellement' },
  decline: { title: 'Enregistrer un refus', description: 'Clôturez le renouvellement avec un motif clair.', submit: 'Marquer comme refusé' },
}

export function LicenseActionDialog({ action, busy, error, onClose, onSubmit }: { action: LicenseAction | null; busy: boolean; error?: string; onClose: () => void; onSubmit: (values: Omit<ActionValues, 'value'> & { value?: number }) => void }) {
  const schema = action ? actionSchemas[action] : actionSchemas.contact
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ActionValues>({ resolver: zodResolver(schema) })
  useEffect(() => reset({}), [action, reset])
  if (!action) return null
  const copy = actionCopy[action]
  return <Modal open title={copy.title} description={copy.description} onClose={onClose}><form className="space-y-4" noValidate onSubmit={handleSubmit((values) => onSubmit({ ...values, value: values.value ? Number(values.value) : undefined }))}>
    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {action === 'followUp' && <div><Label htmlFor="follow-up-date">Prochaine relance</Label><input id="follow-up-date" type="datetime-local" className={fieldClass} {...register('nextFollowUpAt')} /><FieldError message={errors.nextFollowUpAt?.message} /></div>}
    {action === 'renew' && <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="renew-expiry">Nouvelle échéance</Label><input id="renew-expiry" type="date" className={fieldClass} {...register('expiryDate')} /><FieldError message={errors.expiryDate?.message} /></div><div><Label htmlFor="renew-value">Valeur du renouvellement</Label><input id="renew-value" type="number" min="0" step="0.01" className={fieldClass} {...register('value')} /></div></div>}
    {action === 'decline' && <div><Label htmlFor="decline-reason">Motif</Label><input id="decline-reason" className={fieldClass} {...register('reason')} /><FieldError message={errors.reason?.message} /></div>}
    <div><Label htmlFor="action-note">Note interne <span className="font-normal text-muted-foreground">(facultatif)</span></Label><textarea id="action-note" className={textareaClass} {...register('note')} /></div>
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Annuler</Button><Button variant={action === 'decline' ? 'destructive' : 'default'} disabled={busy}>{busy ? 'Enregistrement…' : copy.submit}</Button></div>
  </form></Modal>
}
