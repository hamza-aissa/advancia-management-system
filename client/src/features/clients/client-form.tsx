import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { User } from '@/types'
import type { Client, ClientInput, ClientUpdate } from './types'

const requiredSchema = z.object({
  name: z.string().trim().min(2, 'Saisissez au moins 2 caractères').max(160),
  email: z.string().trim().email('Saisissez une adresse e-mail valide').max(254),
  phone: z.string().trim().max(40).optional(),
  address: z.string().trim().max(500).optional(),
  assignedAgent: z.string().min(1, 'Sélectionnez un agent'),
  assignedConsultant: z.string().min(1, 'Sélectionnez un consultant'),
  notes: z.string().trim().max(2000).optional(),
  lastContactAt: z.string().optional(),
})

const operationalSchema = z.object({ notes: z.string().trim().max(2000).optional(), lastContactAt: z.string().optional() })
type FullValues = z.infer<typeof requiredSchema>
type OperationalValues = z.infer<typeof operationalSchema>

interface ClientFormProps {
  mode: 'create' | 'admin-edit' | 'operational-edit'
  client?: Client
  agents?: User[]
  consultants?: User[]
  isSubmitting: boolean
  serverErrors?: Record<string, string>
  submitLabel?: string
  onCancel: () => void
  onSubmit: (input: ClientInput | ClientUpdate) => void
}

function toLocalDateTime(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function FieldError({ id, message }: { id?: string; message?: string }) { return message ? <p id={id} className="text-xs font-medium text-destructive" role="alert">{message}</p> : null }
const selectClass = 'flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15'

export function ClientForm(props: ClientFormProps) {
  if (props.mode === 'operational-edit') return <OperationalForm {...props} />
  return <FullClientForm {...props} />
}

function FullClientForm({ mode, client, agents = [], consultants = [], isSubmitting, serverErrors = {}, submitLabel, onCancel, onSubmit }: ClientFormProps) {
  const form = useForm<FullValues>({ resolver: zodResolver(requiredSchema), defaultValues: {
    name: client?.name ?? '', email: client?.email ?? '', phone: client?.phone ?? '', address: client?.address ?? '',
    assignedAgent: client?.assignedAgent?.id ?? '', assignedConsultant: client?.assignedConsultant?.id ?? '', notes: client?.notes ?? '', lastContactAt: toLocalDateTime(client?.lastContactAt),
  } })
  useEffect(() => { for (const [field, message] of Object.entries(serverErrors)) if (field in form.getValues()) form.setError(field as keyof FullValues, { message }) }, [form, serverErrors])
  const field = (name: keyof FullValues) => form.formState.errors[name]?.message

  return <form className="space-y-5 p-6" onSubmit={form.handleSubmit((values) => onSubmit({ ...values, phone: values.phone || undefined, address: values.address || undefined, notes: values.notes || undefined, lastContactAt: values.lastContactAt ? new Date(values.lastContactAt).toISOString() : null }))} noValidate>
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="space-y-2"><Label htmlFor="client-name">Nom du client</Label><Input id="client-name" autoComplete="organization" {...form.register('name')} aria-invalid={Boolean(field('name'))} aria-describedby={field('name') ? 'client-name-error' : undefined} /><FieldError id="client-name-error" message={field('name')} /></div>
      <div className="space-y-2"><Label htmlFor="client-email">Email</Label><Input id="client-email" type="email" autoComplete="email" {...form.register('email')} aria-invalid={Boolean(field('email'))} aria-describedby={field('email') ? 'client-email-error' : undefined} /><FieldError id="client-email-error" message={field('email')} /></div>
      <div className="space-y-2"><Label htmlFor="client-phone">Téléphone</Label><Input id="client-phone" autoComplete="tel" {...form.register('phone')} aria-invalid={Boolean(field('phone'))} aria-describedby={field('phone') ? 'client-phone-error' : undefined} /><FieldError id="client-phone-error" message={field('phone')} /></div>
      <div className="space-y-2"><Label htmlFor="client-contact">Dernier contact</Label><Input id="client-contact" type="datetime-local" {...form.register('lastContactAt')} aria-invalid={Boolean(field('lastContactAt'))} aria-describedby={field('lastContactAt') ? 'client-contact-error' : undefined} /><FieldError id="client-contact-error" message={field('lastContactAt')} /></div>
      <div className="space-y-2"><Label htmlFor="assigned-agent">Agent responsable</Label><select id="assigned-agent" className={selectClass} {...form.register('assignedAgent')} aria-invalid={Boolean(field('assignedAgent'))} aria-describedby={field('assignedAgent') ? 'assigned-agent-error' : undefined}><option value="">Sélectionner un agent</option>{agents.map((user) => <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>)}</select><FieldError id="assigned-agent-error" message={field('assignedAgent')} /></div>
      <div className="space-y-2"><Label htmlFor="assigned-consultant">Consultant responsable</Label><select id="assigned-consultant" className={selectClass} {...form.register('assignedConsultant')} aria-invalid={Boolean(field('assignedConsultant'))} aria-describedby={field('assignedConsultant') ? 'assigned-consultant-error' : undefined}><option value="">Sélectionner un consultant</option>{consultants.map((user) => <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>)}</select><FieldError id="assigned-consultant-error" message={field('assignedConsultant')} /></div>
    </div>
    <div className="space-y-2"><Label htmlFor="client-address">Adresse</Label><Input id="client-address" autoComplete="street-address" {...form.register('address')} aria-invalid={Boolean(field('address'))} aria-describedby={field('address') ? 'client-address-error' : undefined} /><FieldError id="client-address-error" message={field('address')} /></div>
    <div className="space-y-2"><Label htmlFor="client-notes">Notes opérationnelles</Label><Textarea id="client-notes" placeholder="Contexte utile pour le prochain contact" {...form.register('notes')} aria-invalid={Boolean(field('notes'))} aria-describedby={field('notes') ? 'client-notes-error' : undefined} /><FieldError id="client-notes-error" message={field('notes')} /></div>
    <div className="flex justify-end gap-3 border-t pt-5"><Button type="button" variant="outline" onClick={onCancel}>Annuler</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Enregistrement…' : submitLabel || (mode === 'create' ? 'Créer le client' : 'Enregistrer')}</Button></div>
  </form>
}

function OperationalForm({ client, isSubmitting, serverErrors = {}, onCancel, onSubmit }: ClientFormProps) {
  const form = useForm<OperationalValues>({ resolver: zodResolver(operationalSchema), defaultValues: { notes: client?.notes ?? '', lastContactAt: toLocalDateTime(client?.lastContactAt) } })
  useEffect(() => { for (const [field, message] of Object.entries(serverErrors)) if (field in form.getValues()) form.setError(field as keyof OperationalValues, { message }) }, [form, serverErrors])
  return <form className="space-y-5 p-6" onSubmit={form.handleSubmit((values) => onSubmit({ notes: values.notes || '', lastContactAt: values.lastContactAt ? new Date(values.lastContactAt).toISOString() : null }))} noValidate>
    <div className="space-y-2"><Label htmlFor="operational-contact">Dernier contact</Label><Input id="operational-contact" type="datetime-local" {...form.register('lastContactAt')} aria-invalid={Boolean(form.formState.errors.lastContactAt || serverErrors.lastContactAt)} aria-describedby={(form.formState.errors.lastContactAt || serverErrors.lastContactAt) ? 'operational-contact-error' : undefined} /><FieldError id="operational-contact-error" message={form.formState.errors.lastContactAt?.message || serverErrors.lastContactAt} /></div>
    <div className="space-y-2"><Label htmlFor="operational-notes">Notes opérationnelles</Label><Textarea id="operational-notes" placeholder="Contexte du dernier échange et prochaine étape" {...form.register('notes')} aria-invalid={Boolean(form.formState.errors.notes || serverErrors.notes)} aria-describedby={(form.formState.errors.notes || serverErrors.notes) ? 'operational-notes-error' : undefined} /><FieldError id="operational-notes-error" message={form.formState.errors.notes?.message || serverErrors.notes} /></div>
    <p className="text-xs text-muted-foreground">Seul un administrateur peut modifier les coordonnées et les affectations.</p>
    <div className="flex justify-end gap-3 border-t pt-5"><Button type="button" variant="outline" onClick={onCancel}>Annuler</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Enregistrement…' : 'Enregistrer'}</Button></div>
  </form>
}
