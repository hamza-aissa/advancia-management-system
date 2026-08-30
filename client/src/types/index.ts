export const USER_ROLES = ['agent', 'consultant', 'admin'] as const
export type UserRole = (typeof USER_ROLES)[number]

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  active?: boolean
  createdAt?: string
}

export interface AuthResponse {
  message: string
  token: string
  user: User
}

export interface ApiErrorPayload {
  error?: {
    code?: string
    message?: string
    fields?: Record<string, string | string[]>
  }
}

export interface ApiResponse<T> { data: T }
