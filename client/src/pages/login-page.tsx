import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/auth-context'
import { getApiErrorMessage } from '@/lib/api'
import { BrandLogo } from '@/components/brand-logo'

const loginSchema = z.object({ email: z.email('Saisissez une adresse e-mail valide'), password: z.string().min(1, 'Le mot de passe est obligatoire') })
type LoginValues = z.infer<typeof loginSchema>

const demoUsers = [
  { role: 'Agent · licences', email: 'agent@advancia.com' },
  { role: 'Consultant · contrats', email: 'consultant@advancia.com' },
  { role: 'Administrateur', email: 'admin@advancia.com' },
]

export function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState('')
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })

  if (!isLoading && isAuthenticated) return <Navigate to="/dashboard" replace />

  const submit = async (values: LoginValues) => {
    setServerError('')
    try { await login(values.email, values.password); navigate('/dashboard', { replace: true }) }
    catch (error) { setServerError(getApiErrorMessage(error, 'Identifiants incorrects. Vérifiez votre e-mail et votre mot de passe.')) }
  }

  const chooseDemo = (email: string) => { setValue('email', email, { shouldValidate: true }); setValue('password', 'password123', { shouldValidate: true }) }

  return <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10"><div className="w-full max-w-sm"><div className="mb-5"><BrandLogo className="h-10 max-w-[165px]" /><p className="mt-2 text-sm text-muted-foreground">Portail interne de gestion des renouvellements</p></div><Card><CardHeader className="pb-4"><CardTitle className="text-base">Connexion</CardTitle><CardDescription>Utilisez votre compte professionnel.</CardDescription></CardHeader><CardContent><form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>{serverError && <div role="alert" className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{serverError}</div>}<div className="space-y-1.5"><Label htmlFor="email">Adresse e-mail</Label><Input id="email" type="email" autoComplete="email" autoFocus placeholder="nom@advancia.com" aria-invalid={Boolean(errors.email)} {...register('email')} />{errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}</div><div className="space-y-1.5"><Label htmlFor="password">Mot de passe</Label><Input id="password" type="password" autoComplete="current-password" aria-invalid={Boolean(errors.password)} {...register('password')} />{errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}</div><Button className="w-full" disabled={isSubmitting || isLoading}>{isSubmitting ? <><LoaderCircle className="animate-spin" />Connexion…</> : 'Se connecter'}</Button></form><div className="mt-5 border-t pt-4"><p className="mb-2 text-[11px] font-medium text-muted-foreground">Comptes de démonstration · mot de passe : password123</p><div className="grid gap-1.5">{demoUsers.map((demo) => <button key={demo.role} type="button" onClick={() => chooseDemo(demo.email)} className="flex h-8 items-center justify-between rounded-md border bg-muted/40 px-2.5 text-left text-xs transition-colors hover:bg-accent"><span className="font-medium">{demo.role}</span><span className="text-muted-foreground">{demo.email}</span></button>)}</div></div></CardContent></Card><p className="mt-4 text-[10px] uppercase tracking-[.12em] text-muted-foreground">Advancia IT SYSTEM · Usage interne</p></div></main>
}
