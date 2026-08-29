import { api } from '@/lib/api'
import type { ApiResponse } from '@/types'
import type { ActionFilters, DashboardData, RenewalActionItem } from './types'

function query(filters: ActionFilters = {}) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== ''),
  )
}

export async function getDashboard(filters: ActionFilters = {}) {
  const response = await api.get<ApiResponse<DashboardData>>('/dashboard', { params: query(filters) })
  return response.data.data
}

export async function getActions(filters: ActionFilters = {}) {
  const response = await api.get<ApiResponse<{ actions: RenewalActionItem[] }>>('/actions', { params: query(filters) })
  return response.data.data.actions
}
