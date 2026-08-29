import axios from 'axios'
import { api } from '@/lib/api'
import type { ApiErrorPayload, ApiResponse, User } from '@/types'
import type { Client, ClientInput, ClientStatus, ClientUpdate } from './types'

export interface ClientFilters {
  search?: string
  status?: ClientStatus | 'all'
  archived?: boolean
}

export const clientKeys = {
  all: ['clients'] as const,
  list: (filters: ClientFilters) => ['clients', 'list', filters] as const,
  detail: (id: string) => ['clients', 'detail', id] as const,
  users: (role: 'agent' | 'consultant') => ['users', role] as const,
}

export async function getClients(filters: ClientFilters) {
  const { data } = await api.get<ApiResponse<{ clients: Client[] }>>('/clients', {
    params: { search: filters.search || undefined, status: filters.status === 'all' ? undefined : filters.status, archived: filters.archived || undefined },
  })
  return data.data.clients
}

export async function getClient(id: string) {
  const { data } = await api.get<ApiResponse<Client>>(`/clients/${id}`)
  return data.data
}

export async function createClient(input: ClientInput) {
  const { data } = await api.post<ApiResponse<Client>>('/clients', input)
  return data.data
}

export async function updateClient(id: string, input: ClientUpdate) {
  const { data } = await api.patch<ApiResponse<Client>>(`/clients/${id}`, input)
  return data.data
}

export async function archiveClient(id: string) {
  const { data } = await api.patch<ApiResponse<Client>>(`/clients/${id}/archive`)
  return data.data
}

export async function getAssignableUsers(role: 'agent' | 'consultant') {
  const { data } = await api.get<ApiResponse<{ users: User[] }>>('/users', { params: { role } })
  return data.data.users
}

export function getFieldErrors(error: unknown): Record<string, string> {
  if (!axios.isAxiosError<ApiErrorPayload>(error)) return {}
  const fields = error.response?.data?.error?.fields ?? {}
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]))
}
