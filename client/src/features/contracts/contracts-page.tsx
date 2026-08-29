import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Plus, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, PageLoader } from '@/components/feedback'
import { useAuth } from '@/contexts/auth-context'
import { getApiErrorMessage } from '@/lib/api'
import { ContractFormDialog, type ContractFormValues } from './contract-dialogs'
import { contractsApi } from './contracts-api'
import { clientName, entityId, personName, type RenewalStatus, type Urgency } from './types'
import { fieldClass, formatDate, formatMoney, StatusBadge, UrgencyBadge } from './contract-ui'

const urgencyOptions: Array<Urgency | 'all'> = ['all', 'expired', 'critical', 'urgent', 'upcoming', 'safe']
const statusOptions: Array<RenewalStatus | 'all'> = ['all', 'not_contacted', 'contacted', 'waiting', 'renewed', 'declined']
const normalize = (value: string) => value.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase())

export function ContractsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [urgency, setUrgency] = useState<Urgency | 'all'>('all')
  const [status, setStatus] = useState<RenewalStatus | 'all'>('all')
  const [owner, setOwner] = useState('all')

  const contracts = useQuery({ queryKey: ['contracts'], queryFn: contractsApi.list })
  const clients = useQuery({ queryKey: ['contract-clients'], queryFn: contractsApi.clients })
  const consultants = useQuery({ queryKey: ['consultants'], queryFn: contractsApi.consultants, enabled: isAdmin })
  const createContract = useMutation({
    mutationFn: (values: ContractFormValues) => contractsApi.create(values),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['contracts'] }); setCreateOpen(false) },
  })

  const rows = useMemo(() => (contracts.data || []).filter((contract) => {
    const needle = search.trim().toLowerCase()
    const matchesSearch = !needle || contract.title.toLowerCase().includes(needle) || clientName(contract.client).toLowerCase().includes(needle)
    const matchesUrgency = urgency === 'all' || contract.urgency === urgency
    const matchesStatus = status === 'all' || contract.renewalStatus === status
    const ownerId = typeof contract.owner === 'string' ? contract.owner : entityId(contract.owner)
    return matchesSearch && matchesUrgency && matchesStatus && (owner === 'all' || ownerId === owner)
  }), [contracts.data, owner, search, status, urgency])

  if (contracts.isLoading) return <PageLoader label="Loading contracts" />
  if (contracts.isError) return <ErrorState message={getApiErrorMessage(contracts.error)} retry={() => contracts.refetch()} />

  return <div className="space-y-6">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="text-sm font-semibold text-primary">Renewal operations</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Contracts</h1><p className="mt-2 text-sm text-muted-foreground">{isAdmin ? 'Monitor every contract and keep ownership clear.' : 'Manage your assigned contracts and next actions.'}</p></div>
      <Button onClick={() => setCreateOpen(true)}><Plus />Add contract</Button>
    </header>

    <section aria-label="Contract filters" className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-2 xl:grid-cols-4">
      <label className="relative"><span className="sr-only">Search contracts</span><Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} className={`${fieldClass} pl-9`} placeholder="Search contract or client" /></label>
      <label><span className="sr-only">Filter by urgency</span><select value={urgency} onChange={(event) => setUrgency(event.target.value as Urgency | 'all')} className={fieldClass}>{urgencyOptions.map((value) => <option key={value} value={value}>{value === 'all' ? 'All urgency levels' : normalize(value)}</option>)}</select></label>
      <label><span className="sr-only">Filter by renewal status</span><select value={status} onChange={(event) => setStatus(event.target.value as RenewalStatus | 'all')} className={fieldClass}>{statusOptions.map((value) => <option key={value} value={value}>{value === 'all' ? 'All renewal statuses' : normalize(value)}</option>)}</select></label>
      {isAdmin && <label><span className="sr-only">Filter by consultant</span><select value={owner} onChange={(event) => setOwner(event.target.value)} className={fieldClass}><option value="all">All consultants</option>{(consultants.data || []).map((person) => <option key={entityId(person)} value={entityId(person)}>{personName(person)}</option>)}</select></label>}
    </section>

    {rows.length === 0 ? <EmptyState title="No contracts found" message={contracts.data?.length ? 'Adjust the filters to see other contracts.' : 'Create the first contract to start tracking its renewal.'} action={!contracts.data?.length && <Button onClick={() => setCreateOpen(true)}>Add contract</Button>} /> : <>
      <div className="hidden overflow-hidden rounded-lg border bg-card lg:block">
        <table className="w-full text-left text-sm"><thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3">Contract</th><th className="px-5 py-3">Value</th><th className="px-5 py-3">Expiry</th><th className="px-5 py-3">Urgency</th><th className="px-5 py-3">Renewal</th>{isAdmin && <th className="px-5 py-3">Consultant</th>}<th className="px-5 py-3"><span className="sr-only">Open</span></th></tr></thead>
          <tbody className="divide-y">{rows.map((contract) => <tr key={entityId(contract)} className="transition hover:bg-muted/30"><td className="px-5 py-4"><p className="font-semibold">{contract.title}</p><p className="mt-0.5 text-muted-foreground">{clientName(contract.client)}</p></td><td className="px-5 py-4 font-medium">{formatMoney(contract.value)}</td><td className="px-5 py-4">{formatDate(contract.expiryDate)}</td><td className="px-5 py-4"><UrgencyBadge urgency={contract.urgency} days={contract.daysUntilExpiry} /></td><td className="px-5 py-4"><StatusBadge status={contract.renewalStatus} /></td>{isAdmin && <td className="px-5 py-4">{personName(contract.owner)}</td>}<td className="px-5 py-4 text-right"><Button asChild size="icon" variant="ghost"><Link to={`/contracts/${entityId(contract)}`} aria-label={`Open ${contract.title}`}><ArrowRight /></Link></Button></td></tr>)}</tbody>
        </table>
      </div>
      <div className="grid gap-3 lg:hidden">{rows.map((contract) => <Link key={entityId(contract)} to={`/contracts/${entityId(contract)}`} className="rounded-lg border bg-card p-4 shadow-sm transition hover:border-primary/40"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{contract.title}</h2><p className="mt-1 text-sm text-muted-foreground">{clientName(contract.client)}</p></div><ArrowRight className="size-4 text-muted-foreground" /></div><div className="mt-4 flex flex-wrap gap-2"><UrgencyBadge urgency={contract.urgency} days={contract.daysUntilExpiry} /><StatusBadge status={contract.renewalStatus} /></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-muted-foreground">Expiry</dt><dd className="mt-1 font-medium">{formatDate(contract.expiryDate)}</dd></div><div><dt className="text-muted-foreground">Value</dt><dd className="mt-1 font-medium">{formatMoney(contract.value)}</dd></div></dl></Link>)}</div>
    </>}

    <ContractFormDialog open={createOpen} onOpenChange={setCreateOpen} clients={clients.data || []} consultants={consultants.data || []} isAdmin={isAdmin} busy={createContract.isPending} error={createContract.isError ? getApiErrorMessage(createContract.error) : undefined} onSubmit={async (values) => { await createContract.mutateAsync(values) }} />
  </div>
}
