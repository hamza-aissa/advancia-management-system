import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit3, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { EmptyState, ErrorState, PageLoader } from '@/components/feedback'
import { Label } from '@/components/ui/label'
import { getApiErrorMessage } from '@/lib/api'
import { catalogApi } from './api'
import type { ContractType, LicenseOffer } from './types'

const fieldClass = 'h-8 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30'
const textareaClass = 'min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30'

export function CatalogsPage() {
  const offers = useQuery({ queryKey: ['catalog', 'license-offers', true], queryFn: () => catalogApi.licenseOffers(true) })
  const types = useQuery({ queryKey: ['catalog', 'contract-types', true], queryFn: () => catalogApi.contractTypes(true) })
  if (offers.isPending || types.isPending) return <PageLoader label="Chargement des catalogues" />
  if (offers.isError || types.isError) return <ErrorState message={getApiErrorMessage(offers.error || types.error, 'Impossible de charger les catalogues.')} retry={() => { offers.refetch(); types.refetch() }} />
  return <div className="space-y-6">
    <div><h2 className="text-xl font-semibold">Catalogues commerciaux</h2><p className="mt-1 text-sm text-muted-foreground">Définissez les offres utilisées par les Agents et les types utilisés par les Consultants.</p></div>
    <LicenseOffersSection rows={offers.data || []} />
    <ContractTypesSection rows={types.data || []} />
  </div>
}

function LicenseOffersSection({ rows }: { rows: LicenseOffer[] }) {
  const [editing, setEditing] = useState<LicenseOffer | null | undefined>()
  const queryClient = useQueryClient()
  const save = useMutation({ mutationFn: (input: Omit<LicenseOffer, 'id'>) => editing ? catalogApi.updateLicenseOffer(editing.id, input) : catalogApi.createLicenseOffer(input), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['catalog', 'license-offers'] }); setEditing(undefined) } })
  return <section className="rounded-lg border bg-card"><SectionHeader title="Offres de licences" description="Nom et prix unitaire proposés aux clients." add={() => setEditing(null)} />
    {rows.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-y bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground"><th className="px-3 py-2 text-left">Offre</th><th className="px-3 py-2 text-right">Prix unitaire</th><th className="px-3 py-2 text-left">État</th><th className="w-20" /></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30"><td className="px-3 py-2"><p className="font-medium">{row.name}</p><p className="text-xs text-muted-foreground">{row.description || '—'}</p></td><td className="px-3 py-2 text-right font-mono">{row.unitPrice.toLocaleString('fr-TN', { minimumFractionDigits: 3 })} TND</td><td className="px-3 py-2">{row.active ? 'Active' : 'Inactive'}</td><td className="px-3 py-2"><Button size="sm" variant="ghost" onClick={() => setEditing(row)}><Edit3 />Modifier</Button></td></tr>)}</tbody></table></div> : <div className="p-3"><EmptyState title="Aucune offre" /></div>}
    <LicenseOfferDialog open={editing !== undefined} offer={editing || undefined} busy={save.isPending} error={save.isError ? getApiErrorMessage(save.error) : undefined} close={() => setEditing(undefined)} submit={(input) => save.mutate(input)} />
  </section>
}

function ContractTypesSection({ rows }: { rows: ContractType[] }) {
  const [editing, setEditing] = useState<ContractType | null | undefined>()
  const queryClient = useQueryClient()
  const save = useMutation({ mutationFn: (input: Omit<ContractType, 'id'>) => editing ? catalogApi.updateContractType(editing.id, input) : catalogApi.createContractType(input), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['catalog', 'contract-types'] }); setEditing(undefined) } })
  return <section className="rounded-lg border bg-card"><SectionHeader title="Types de contrats" description="Cadres contractuels proposés par les Consultants." add={() => setEditing(null)} />
    {rows.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-y bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground"><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-left">État</th><th className="w-20" /></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30"><td className="px-3 py-2"><p className="font-medium">{row.name}</p><p className="text-xs text-muted-foreground">{row.description || '—'}</p></td><td className="px-3 py-2">{row.active ? 'Actif' : 'Inactif'}</td><td className="px-3 py-2"><Button size="sm" variant="ghost" onClick={() => setEditing(row)}><Edit3 />Modifier</Button></td></tr>)}</tbody></table></div> : <div className="p-3"><EmptyState title="Aucun type" /></div>}
    <ContractTypeDialog open={editing !== undefined} type={editing || undefined} busy={save.isPending} error={save.isError ? getApiErrorMessage(save.error) : undefined} close={() => setEditing(undefined)} submit={(input) => save.mutate(input)} />
  </section>
}

function SectionHeader({ title, description, add }: { title: string; description: string; add: () => void }) { return <div className="flex items-center justify-between gap-3 px-3 py-2"><div><h3 className="text-sm font-semibold">{title}</h3><p className="text-xs text-muted-foreground">{description}</p></div><Button size="sm" onClick={add}><Plus />Ajouter</Button></div> }

function LicenseOfferDialog({ open, offer, busy, error, close, submit }: { open: boolean; offer?: LicenseOffer; busy: boolean; error?: string; close: () => void; submit: (input: Omit<LicenseOffer, 'id'>) => void }) {
  const { register, handleSubmit, reset } = useForm<Omit<LicenseOffer, 'id'>>()
  useEffect(() => { if (open) reset({ name: offer?.name || '', description: offer?.description || '', unitPrice: offer?.unitPrice ?? 0, active: offer?.active ?? true }) }, [open, offer, reset])
  return <Dialog open={open} onOpenChange={(value) => !value && close()} title={offer ? "Modifier l’offre" : 'Nouvelle offre'} description="Cette offre sera sélectionnable lors de l’attribution d’une licence."><form className="space-y-4 p-6" onSubmit={handleSubmit(submit)}>{error && <p className="text-sm text-destructive">{error}</p>}<div><Label>Nom</Label><input required className={fieldClass} {...register('name')} /></div><div><Label>Description</Label><textarea className={textareaClass} {...register('description')} /></div><div><Label>Prix unitaire (TND)</Label><input required min="0" step="0.001" type="number" className={fieldClass} {...register('unitPrice', { valueAsNumber: true })} /></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('active')} />Offre active</label><Actions busy={busy} close={close} /></form></Dialog>
}

function ContractTypeDialog({ open, type, busy, error, close, submit }: { open: boolean; type?: ContractType; busy: boolean; error?: string; close: () => void; submit: (input: Omit<ContractType, 'id'>) => void }) {
  const { register, handleSubmit, reset } = useForm<Omit<ContractType, 'id'>>()
  useEffect(() => { if (open) reset({ name: type?.name || '', description: type?.description || '', active: type?.active ?? true }) }, [open, type, reset])
  return <Dialog open={open} onOpenChange={(value) => !value && close()} title={type ? 'Modifier le type' : 'Nouveau type'} description="Ce type sera sélectionnable lors de la création du contrat."><form className="space-y-4 p-6" onSubmit={handleSubmit(submit)}>{error && <p className="text-sm text-destructive">{error}</p>}<div><Label>Nom</Label><input required className={fieldClass} {...register('name')} /></div><div><Label>Description</Label><textarea className={textareaClass} {...register('description')} /></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('active')} />Type actif</label><Actions busy={busy} close={close} /></form></Dialog>
}

function Actions({ busy, close }: { busy: boolean; close: () => void }) { return <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={close}>Annuler</Button><Button disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</Button></div> }
