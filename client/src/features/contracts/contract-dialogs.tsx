import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { FieldError, fieldClass, textareaClass } from './contract-ui'
import type { ClientRef, Contract, PersonRef } from './types'
import { entityId, personName } from './types'

const optionalMoney = z.number().min(0).optional()
const moneyRegistration = { setValueAs: (value: string) => value === '' ? undefined : Number(value) }
const contractSchema = z.object({
  client: z.string().min(1, 'Select a client'),
  title: z.string().trim().min(2, 'Enter a contract title'),
  description: z.string().trim().optional(),
  startDate: z.string().min(1, 'Select a start date'),
  expiryDate: z.string().min(1, 'Select an expiry date'),
  value: optionalMoney,
  owner: z.string().optional(),
}).refine((data) => !data.startDate || !data.expiryDate || data.expiryDate > data.startDate, { message: 'Expiry must be after the start date', path: ['expiryDate'] })
export type ContractFormValues = z.infer<typeof contractSchema>

interface BaseDialogProps { open: boolean; onOpenChange: (open: boolean) => void; busy?: boolean; error?: string }

export function ContractFormDialog({ open, onOpenChange, busy, error, contract, clients, consultants, isAdmin, onSubmit }: BaseDialogProps & {
  contract?: Contract; clients: ClientRef[]; consultants: PersonRef[]; isAdmin: boolean; onSubmit: (values: ContractFormValues) => Promise<void>
}) {
  const clientId = !contract ? '' : typeof contract.client === 'string' ? contract.client : entityId(contract.client)
  const ownerId = !contract ? '' : typeof contract.owner === 'string' ? contract.owner : entityId(contract.owner)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ContractFormValues>({ resolver: zodResolver(contractSchema), defaultValues: {
    client: clientId, title: contract?.title || '', description: contract?.description || '', startDate: contract?.startDate?.slice(0, 10) || '',
    expiryDate: contract?.expiryDate?.slice(0, 10) || '', value: contract?.value, owner: ownerId,
  } })
  useEffect(() => { if (open) reset({ client: clientId, title: contract?.title || '', description: contract?.description || '', startDate: contract?.startDate?.slice(0, 10) || '', expiryDate: contract?.expiryDate?.slice(0, 10) || '', value: contract?.value, owner: ownerId }) }, [open, contract, clientId, ownerId, reset])
  return <Dialog open={open} onOpenChange={onOpenChange} title={contract ? 'Edit contract' : 'New contract'} description="Record the commercial agreement and its renewal owner.">
    <form className="space-y-4 p-6" onSubmit={handleSubmit(onSubmit)}>
      {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div><Label htmlFor="contract-client">Client</Label><select id="contract-client" className={fieldClass} disabled={Boolean(contract)} {...register('client')}><option value="">Select client</option>{clients.map((client) => <option key={entityId(client)} value={entityId(client)}>{client.name}</option>)}</select><FieldError>{errors.client?.message}</FieldError></div>
      <div><Label htmlFor="contract-title">Contract title</Label><input id="contract-title" className={fieldClass} {...register('title')} /><FieldError>{errors.title?.message}</FieldError></div>
      <div><Label htmlFor="contract-description">Description</Label><textarea id="contract-description" className={textareaClass} {...register('description')} /></div>
      <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="contract-start">Start date</Label><input id="contract-start" type="date" className={fieldClass} disabled={Boolean(contract)} {...register('startDate')} /><FieldError>{errors.startDate?.message}</FieldError></div><div><Label htmlFor="contract-expiry">Expiry date</Label><input id="contract-expiry" type="date" className={fieldClass} disabled={Boolean(contract)} {...register('expiryDate')} /><FieldError>{errors.expiryDate?.message}</FieldError></div></div>
      <div><Label htmlFor="contract-value">Contract value</Label><input id="contract-value" type="number" min="0" step="0.01" className={fieldClass} {...register('value', moneyRegistration)} /><FieldError>{errors.value?.message}</FieldError></div>
      {isAdmin && !contract && <div><Label htmlFor="contract-owner">Responsible consultant</Label><select id="contract-owner" className={fieldClass} {...register('owner')}><option value="">Select consultant</option>{consultants.map((person) => <option key={entityId(person)} value={entityId(person)}>{personName(person)}</option>)}</select><FieldError>{errors.owner?.message}</FieldError></div>}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={busy}>{busy ? 'Saving…' : 'Save contract'}</Button></div>
    </form>
  </Dialog>
}

const noteSchema = z.object({ note: z.string().trim().max(500).optional() })
type NoteValues = z.infer<typeof noteSchema>
export function ContactDialog({ open, onOpenChange, busy, error, onSubmit }: BaseDialogProps & { onSubmit: (note?: string) => Promise<void> }) {
  const { register, handleSubmit, reset } = useForm<NoteValues>({ resolver: zodResolver(noteSchema) })
  useEffect(() => { if (open) reset({ note: '' }) }, [open, reset])
  return <Dialog open={open} onOpenChange={onOpenChange} title="Mark as contacted" description="Record that the client has been contacted about this renewal."><form className="space-y-4 p-6" onSubmit={handleSubmit((v) => onSubmit(v.note))}>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div><Label htmlFor="contact-note">Internal note</Label><textarea id="contact-note" className={textareaClass} {...register('note')} /></div><DialogActions busy={busy} close={() => onOpenChange(false)} label="Confirm contact" /></form></Dialog>
}

const followUpSchema = z.object({ nextFollowUpAt: z.string().min(1, 'Select a follow-up date'), note: z.string().trim().max(500).optional() })
type FollowUpValues = z.infer<typeof followUpSchema>
export function FollowUpDialog({ open, onOpenChange, busy, error, onSubmit }: BaseDialogProps & { onSubmit: (values: FollowUpValues) => Promise<void> }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FollowUpValues>({ resolver: zodResolver(followUpSchema) })
  useEffect(() => { if (open) reset({ nextFollowUpAt: '', note: '' }) }, [open, reset])
  return <Dialog open={open} onOpenChange={onOpenChange} title="Schedule follow-up" description="Keep the renewal moving with a clear next action."><form className="space-y-4 p-6" onSubmit={handleSubmit(onSubmit)}>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div><Label htmlFor="follow-up-date">Next follow-up</Label><input id="follow-up-date" type="date" className={fieldClass} {...register('nextFollowUpAt')} /><FieldError>{errors.nextFollowUpAt?.message}</FieldError></div><div><Label htmlFor="follow-up-note">Note</Label><textarea id="follow-up-note" className={textareaClass} {...register('note')} /></div><DialogActions busy={busy} close={() => onOpenChange(false)} label="Schedule follow-up" /></form></Dialog>
}

const renewSchema = z.object({ expiryDate: z.string().min(1, 'Select the new expiry date'), value: optionalMoney, note: z.string().trim().max(500).optional() })
export type RenewValues = z.infer<typeof renewSchema>
export function RenewDialog({ open, onOpenChange, busy, error, currentExpiryDate, onSubmit }: BaseDialogProps & { currentExpiryDate: string; onSubmit: (values: RenewValues) => Promise<void> }) {
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<RenewValues>({ resolver: zodResolver(renewSchema) })
  useEffect(() => { if (open) reset({ expiryDate: '', value: undefined, note: '' }) }, [open, reset])
  const submit = handleSubmit(async (values) => { if (values.expiryDate <= currentExpiryDate.slice(0, 10)) { setError('expiryDate', { message: 'New expiry must be after the current expiry' }); return } await onSubmit(values) })
  return <Dialog open={open} onOpenChange={onOpenChange} title="Record renewal" description="Close the renewal and preserve the previous term in history."><form className="space-y-4 p-6" onSubmit={submit}>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div><Label htmlFor="renew-expiry">New expiry date</Label><input id="renew-expiry" type="date" min={new Date(new Date(currentExpiryDate).getTime() + 86400000).toISOString().slice(0, 10)} className={fieldClass} {...register('expiryDate')} /><FieldError>{errors.expiryDate?.message}</FieldError></div><div><Label htmlFor="renew-value">Renewal value</Label><input id="renew-value" type="number" min="0" step="0.01" className={fieldClass} {...register('value', moneyRegistration)} /><FieldError>{errors.value?.message}</FieldError></div><div><Label htmlFor="renew-note">Note</Label><textarea id="renew-note" className={textareaClass} {...register('note')} /></div><DialogActions busy={busy} close={() => onOpenChange(false)} label="Confirm renewal" /></form></Dialog>
}

const declineSchema = z.object({ reason: z.string().trim().min(3, 'Enter why the renewal was declined'), note: z.string().trim().max(500).optional() })
export type DeclineValues = z.infer<typeof declineSchema>
export function DeclineDialog({ open, onOpenChange, busy, error, onSubmit }: BaseDialogProps & { onSubmit: (values: DeclineValues) => Promise<void> }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<DeclineValues>({ resolver: zodResolver(declineSchema) })
  useEffect(() => { if (open) reset({ reason: '', note: '' }) }, [open, reset])
  return <Dialog open={open} onOpenChange={onOpenChange} title="Record declined renewal" description="Capture the loss reason so the team can learn from it."><form className="space-y-4 p-6" onSubmit={handleSubmit(onSubmit)}>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div><Label htmlFor="decline-reason">Decline reason</Label><textarea id="decline-reason" className={textareaClass} {...register('reason')} /><FieldError>{errors.reason?.message}</FieldError></div><div><Label htmlFor="decline-note">Internal note</Label><textarea id="decline-note" className={textareaClass} {...register('note')} /></div><DialogActions busy={busy} close={() => onOpenChange(false)} label="Mark declined" destructive /></form></Dialog>
}

const assignSchema = z.object({ owner: z.string().min(1, 'Select a consultant') })
export function AssignDialog({ open, onOpenChange, busy, error, consultants, currentOwner, onSubmit }: BaseDialogProps & { consultants: PersonRef[]; currentOwner: string; onSubmit: (owner: string) => Promise<void> }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ owner: string }>({ resolver: zodResolver(assignSchema), defaultValues: { owner: currentOwner } })
  useEffect(() => { if (open) reset({ owner: currentOwner }) }, [open, currentOwner, reset])
  return <Dialog open={open} onOpenChange={onOpenChange} title="Reassign contract" description="Choose the consultant responsible for the next action."><form className="space-y-4 p-6" onSubmit={handleSubmit((v) => onSubmit(v.owner))}>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div><Label htmlFor="assign-owner">Responsible consultant</Label><select id="assign-owner" className={fieldClass} {...register('owner')}><option value="">Select consultant</option>{consultants.map((person) => <option key={entityId(person)} value={entityId(person)}>{personName(person)}</option>)}</select><FieldError>{errors.owner?.message}</FieldError></div><DialogActions busy={busy} close={() => onOpenChange(false)} label="Reassign" /></form></Dialog>
}

function DialogActions({ busy, close, label, destructive }: { busy?: boolean; close: () => void; label: string; destructive?: boolean }) {
  return <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={close}>Cancel</Button><Button variant={destructive ? 'destructive' : 'default'} disabled={busy}>{busy ? 'Saving…' : label}</Button></div>
}
