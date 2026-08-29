import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authService } from '@/lib/auth'
import { authStorage } from '@/lib/api'
import type { User } from '@/types'

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => authService.restoreUser())
  const [isLoading, setIsLoading] = useState(Boolean(authStorage.token()))

  const logout = useCallback(() => {
    authService.logout()
    setUser(null)
  }, [])

  useEffect(() => {
    const onUnauthorized = () => setUser(null)
    window.addEventListener('advancia:unauthorized', onUnauthorized)
    return () => window.removeEventListener('advancia:unauthorized', onUnauthorized)
  }, [])

  useEffect(() => {
    if (!authStorage.token()) return
    authService.profile()
      .then(setUser)
      .catch(logout)
      .finally(() => setIsLoading(false))
  }, [logout])

  const login = useCallback(async (email: string, password: string) => {
    const nextUser = await authService.login(email, password)
    setUser(nextUser)
  }, [])

  const value = useMemo(() => ({ user, isAuthenticated: Boolean(user), isLoading, login, logout }), [user, isLoading, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
