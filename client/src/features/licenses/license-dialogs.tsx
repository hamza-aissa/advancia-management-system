import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { FieldError, Modal, fieldClass, itemId, textareaClass } from './license-ui'
import type { License, LicenseClientOption, LicenseInput, LicenseOffer } from './types'

const optionalNumber = z.string().refine((value) => !value || (!Number.isNaN(Number(value)) && Number(value) >= 0), 'Saisissez un nombre positif').optional()
const licenseSchema = z.object({
  client: z.string().min(1, 'Sélectionnez un client'), offer: z.string().min(1, 'Sélectionnez une offre'),
  description: z.string().optional(), startDate: z.string().min(1, 'Sélectionnez une date de début'), expiryDate: z.string().min(1, 'Sélectionnez une date d’échéance'),
  quantity: z.string().refine((value) => Number.isFinite(Number(value)) && Number(value) > 0, 'La quantité doit être supérieure à zéro'),
}).refine((data) => !data.startDate || !data.expiryDate || data.expiryDate > data.startDate, { path: ['expiryDate'], message: 'L’échéance doit être postérieure à la date de début' })

type FormValues = z.input<typeof licenseSchema>
const dateInput = (value?: string) => value ? value.slice(0, 10) : ''

export function LicenseFormDialog({ open, license, initialClient = '', clients, offers, busy, error, onClose, onSubmit }: {
  open: boolean; license?: License; initialClient?: string; clients: LicenseClientOption[]; offers: LicenseOffer[]; busy: boolean; error?: string; onClose: () => void; onSubmit: (input: LicenseInput | Partial<LicenseInput>) => void
}) {
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(licenseSchema), defaultValues: { quantity: '1' } })
  useEffect(() => reset(license ? {
    client: itemId(license.client), offer: license.offer ? itemId(license.offer) : '', description: license.description || '', startDate: dateInput(license.startDate), expiryDate: dateInput(license.expiryDate), quantity: license.quantity?.toString() || '1',
  } : { client: initialClient, offer: '', description: '', startDate: '', expiryDate: '', quantity: '1' }), [initialClient, license, open, reset])
  const selectedOfferId = useWatch({ control, name: 'offer' })
  const selectedOffer = offers.find((offer) => itemId(offer) === selectedOfferId)
  const quantity = Number(useWatch({ control, name: 'quantity' })) || 0
  return <Modal open={open} title={license ? 'Modifier la licence' : 'Nouvelle licence'} description="Renseignez les informations utiles au suivi du renouvellement." onClose={onClose}>
    <form className="space-y-4" noValidate onSubmit={handleSubmit((values) => onSubmit(license ? { description: values.description, quantity: Number(values.quantity) } : { ...values, quantity: Number(values.quantity) }))}>
      {error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
      <div><Label htmlFor="license-client">Client</Label><select id="license-client" className={fieldClass} disabled={Boolean(license)} aria-invalid={Boolean(errors.client)} {...register('client')}><option value="">Sélectionner un client</option>{clients.map((client) => <option key={itemId(client)} value={itemId(client)}>{client.name}</option>)}</select><FieldError message={errors.client?.message} /></div>
      <div><Label htmlFor="license-offer">Offre de licence</Label><select id="license-offer" className={fieldClass} disabled={Boolean(license)} aria-invalid={Boolean(errors.offer)} {...register('offer')}><option value="">Sélectionner une offre</option>{offers.map((offer) => <option key={itemId(offer)} value={itemId(offer)}>{offer.name} — {offer.unitPrice.toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND/unité</option>)}</select><FieldError message={errors.offer?.message} /></div>
      <div><Label htmlFor="license-description">Description</Label><textarea id="license-description" className={textareaClass} {...register('description')} /></div>
      <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="license-start">Date de début</Label><input id="license-start" type="date" className={fieldClass} disabled={Boolean(license)} {...register('startDate')} /><FieldError message={errors.startDate?.message} /></div><div><Label htmlFor="license-expiry">Date d’échéance</Label><input id="license-expiry" type="date" className={fieldClass} disabled={Boolean(license)} {...register('expiryDate')} /><FieldError message={errors.expiryDate?.message} /></div></div>
      <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="license-quantity">Quantité</Label><input id="license-quantity" type="number" min="1" className={fieldClass} {...register('quantity')} /><FieldError message={errors.quantity?.message} /></div><div><Label>Valeur calculée</Label><div className="flex h-8 items-center rounded-md border bg-muted/40 px-3 font-mono text-sm font-medium">{(selectedOffer ? selectedOffer.unitPrice * quantity : license?.value)?.toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) || '—'} TND</div></div></div>
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
