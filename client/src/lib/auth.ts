import { api, authStorage } from '@/lib/api'
import type { ApiResponse, AuthResponse, User } from '@/types'

export const authService = {
  async login(email: string, password: string) {
    const { data: response } = await api.post<ApiResponse<AuthResponse>>('/auth/login', { email, password })
    authStorage.save(response.data.token, response.data.user)
    return response.data.user
  },
  async profile() {
    const { data: response } = await api.get<ApiResponse<User>>('/auth/profile')
    return response.data
  },
  restoreUser(): User | null {
    const raw = authStorage.user()
    if (!raw) return null
    try { return JSON.parse(raw) as User } catch { return null }
  },
  logout: authStorage.clear,
}
