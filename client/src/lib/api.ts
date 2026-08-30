import axios, { AxiosError } from 'axios'
import type { ApiErrorPayload } from '@/types'

const TOKEN_KEY = 'advancia.auth.token'
const USER_KEY = 'advancia.auth.user'

export const authStorage = {
  token: () => localStorage.getItem(TOKEN_KEY),
  user: () => localStorage.getItem(USER_KEY),
  save: (token: string, user: unknown) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  },
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
})

api.interceptors.request.use((config) => {
  const token = authStorage.token()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      authStorage.clear()
      window.dispatchEvent(new Event('advancia:unauthorized'))
    }
    return Promise.reject(error)
  },
)

export function getApiErrorMessage(error: unknown, fallback = 'Une erreur est survenue. Veuillez réessayer.') {
  if (!axios.isAxiosError<ApiErrorPayload>(error)) return fallback
  if (!error.response) return 'Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez.'
  return error.response.data?.error?.message || fallback
}
