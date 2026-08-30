import { api } from '@/lib/api'
import type { ApiResponse } from '@/types'
import type { ActionFilters, DashboardData, NotificationEntry, ReminderReport, ReminderStatus, RenewalActionItem } from './types'

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

export async function getReminderStatus() {
  return (await api.get<ApiResponse<ReminderStatus>>('/notifications/status')).data.data
}

export async function getNotificationHistory() {
  return (await api.get<ApiResponse<{ notifications: NotificationEntry[] }>>('/notifications/history')).data.data.notifications
}

export async function runReminders() {
  return (await api.post<ApiResponse<{ report: ReminderReport }>>('/notifications/run')).data.data.report
}
