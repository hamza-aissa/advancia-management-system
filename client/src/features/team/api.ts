import { api } from '@/lib/api'
import type { User, UserRole } from '@/types'

type Envelope<T> = { data: T }
export interface TeamMemberInput { firstName: string; lastName: string; email: string; password: string; role: Exclude<UserRole, 'admin'> }

export const teamApi = {
  list: async () => (await api.get<Envelope<{ users: User[] }>>('/users', { params: { includeInactive: true } })).data.data.users,
  create: async (input: TeamMemberInput) => (await api.post<Envelope<User>>('/users', input)).data.data,
  setActive: async (id: string, active: boolean) => (await api.patch<Envelope<User>>(`/users/${id}/status`, { active })).data.data,
}
