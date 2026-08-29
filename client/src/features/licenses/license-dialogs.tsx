import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { FieldError, Modal, fieldClass, itemId, textareaClass } from './license-ui'
import type { License, LicenseClientOption, LicenseInput, LicensePerson } from './types'

const optionalNumber = z.string().refine((value) => !value || (!Number.isNaN(Number(value)) && Number(value) >= 0), 'Enter a positive number').optional()
const licenseSchema = z.object({
  client: z.string().min(1, 'Select a client'), name: z.string().trim().min(2, 'Enter a license name'),
  description: z.string().optional(), startDate: z.string().min(1, 'Select a start date'), expiryDate: z.string().min(1, 'Select an expiry date'),
  value: optionalNumber, quantity: optionalNumber, owner: z.string().optional(),
}).refine((data) => !data.startDate || !data.expiryDate || data.expiryDate > data.startDate, { path: ['expiryDate'], message: 'Expiry must follow the start date' })

type FormValues = z.input<typeof licenseSchema>
const dateInput = (value?: string) => value ? value.slice(0, 10) : ''

export function LicenseFormDialog({ open, license, clients, agents, isAdmin, busy, error, onClose, onSubmit }: {
  open: boolean; license?: License; clients: LicenseClientOption[]; agents: LicensePerson[]; isAdmin: boolean; busy: boolean; error?: string; onClose: () => void; onSubmit: (input: LicenseInput) => void
}) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(licenseSchema), defaultValues: { quantity: '1' } })
  useEffect(() => reset(license ? {
    client: itemId(license.client), name: license.name, description: license.description || '', startDate: dateInput(license.startDate), expiryDate: dateInput(license.expiryDate), value: license.value?.toString() || '', quantity: license.quantity?.toString() || '', owner: itemId(license.owner),
  } : { client: '', name: '', description: '', startDate: '', expiryDate: '', value: '', quantity: '1', owner: '' }), [license, open, reset])
  return <Modal open={open} title={license ? 'Edit license' : 'Add license'} description="Keep the commercial record concise and assign clear ownership." onClose={onClose}>
    <form className="space-y-4" noValidate onSubmit={handleSubmit((values) => onSubmit({ ...values, value: values.value ? Number(values.value) : undefined, quantity: values.quantity ? Number(values.quantity) : undefined }))}>
      {error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
      <div><Label htmlFor="license-client">Client</Label><select id="license-client" className={fieldClass} disabled={Boolean(license)} aria-invalid={Boolean(errors.client)} {...register('client')}><option value="">Select client</option>{clients.map((client) => <option key={itemId(client)} value={itemId(client)}>{client.name}</option>)}</select><FieldError message={errors.client?.message} /></div>
      <div><Label htmlFor="license-name">License name</Label><input id="license-name" className={fieldClass} aria-invalid={Boolean(errors.name)} {...register('name')} /><FieldError message={errors.name?.message} /></div>
      <div><Label htmlFor="license-description">Description</Label><textarea id="license-description" className={textareaClass} {...register('description')} /></div>
      <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="license-start">Start date</Label><input id="license-start" type="date" className={fieldClass} disabled={Boolean(license)} {...register('startDate')} /><FieldError message={errors.startDate?.message} /></div><div><Label htmlFor="license-expiry">Expiry date</Label><input id="license-expiry" type="date" className={fieldClass} disabled={Boolean(license)} {...register('expiryDate')} /><FieldError message={errors.expiryDate?.message} /></div></div>
      <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="license-quantity">Quantity</Label><input id="license-quantity" type="number" min="0" className={fieldClass} {...register('quantity')} /><FieldError message={errors.quantity?.message} /></div><div><Label htmlFor="license-value">Renewal value</Label><input id="license-value" type="number" min="0" step="0.01" className={fieldClass} {...register('value')} /><FieldError message={errors.value?.message} /></div></div>
      {isAdmin && !license && <div><Label htmlFor="license-owner">Assigned agent</Label><select id="license-owner" className={fieldClass} aria-invalid={Boolean(errors.owner)} {...register('owner')}><option value="">Select agent</option>{agents.map((agent) => <option key={itemId(agent)} value={itemId(agent)}>{agent.firstName} {agent.lastName}</option>)}</select><FieldError message={errors.owner?.message} /></div>}
      <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button disabled={busy}>{busy ? 'Saving…' : license ? 'Save changes' : 'Create license'}</Button></div>
    </form>
  </Modal>
}

const actionSchemas = {
  contact: z.object({ note: z.string().optional() }),
  followUp: z.object({ nextFollowUpAt: z.string().min(1, 'Select a follow-up date'), note: z.string().optional() }),
  renew: z.object({ expiryDate: z.string().min(1, 'Select the new expiry date'), value: optionalNumber, note: z.string().optional() }),
  decline: z.object({ reason: z.string().trim().min(3, 'Record why the renewal was declined'), note: z.string().optional() }),
}
export type LicenseAction = keyof typeof actionSchemas
type ActionValues = { note?: string; nextFollowUpAt?: string; expiryDate?: string; value?: string; reason?: string }
const actionCopy: Record<LicenseAction, { title: string; description: string; submit: string }> = {
  contact: { title: 'Record contact', description: 'Confirm that the client was contacted.', submit: 'Mark contacted' },
  followUp: { title: 'Schedule follow-up', description: 'Add the next concrete action date.', submit: 'Schedule follow-up' },
  renew: { title: 'Record renewal', description: 'Extend the license and preserve its renewal history.', submit: 'Complete renewal' },
  decline: { title: 'Record declined renewal', description: 'Close this renewal with a clear loss reason.', submit: 'Mark declined' },
}

export function LicenseActionDialog({ action, busy, error, onClose, onSubmit }: { action: LicenseAction | null; busy: boolean; error?: string; onClose: () => void; onSubmit: (values: Omit<ActionValues, 'value'> & { value?: number }) => void }) {
  const schema = action ? actionSchemas[action] : actionSchemas.contact
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ActionValues>({ resolver: zodResolver(schema) })
  useEffect(() => reset({}), [action, reset])
  if (!action) return null
  const copy = actionCopy[action]
  return <Modal open title={copy.title} description={copy.description} onClose={onClose}><form className="space-y-4" noValidate onSubmit={handleSubmit((values) => onSubmit({ ...values, value: values.value ? Number(values.value) : undefined }))}>
    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {action === 'followUp' && <div><Label htmlFor="follow-up-date">Next follow-up</Label><input id="follow-up-date" type="datetime-local" className={fieldClass} {...register('nextFollowUpAt')} /><FieldError message={errors.nextFollowUpAt?.message} /></div>}
    {action === 'renew' && <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="renew-expiry">New expiry date</Label><input id="renew-expiry" type="date" className={fieldClass} {...register('expiryDate')} /><FieldError message={errors.expiryDate?.message} /></div><div><Label htmlFor="renew-value">Renewal value</Label><input id="renew-value" type="number" min="0" step="0.01" className={fieldClass} {...register('value')} /></div></div>}
    {action === 'decline' && <div><Label htmlFor="decline-reason">Reason</Label><input id="decline-reason" className={fieldClass} {...register('reason')} /><FieldError message={errors.reason?.message} /></div>}
    <div><Label htmlFor="action-note">Internal note <span className="font-normal text-muted-foreground">(optional)</span></Label><textarea id="action-note" className={textareaClass} {...register('note')} /></div>
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button variant={action === 'decline' ? 'destructive' : 'default'} disabled={busy}>{busy ? 'Saving…' : copy.submit}</Button></div>
  </form></Modal>
}
