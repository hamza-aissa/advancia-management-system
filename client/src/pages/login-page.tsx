import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, CheckCircle2, LoaderCircle, LockKeyhole, ShieldCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/auth-context'
import { getApiErrorMessage } from '@/lib/api'

const loginSchema = z.object({ email: z.email('Enter a valid email address'), password: z.string().min(1, 'Password is required') })
type LoginValues = z.infer<typeof loginSchema>

const demoUsers = [
  { role: 'Agent', email: 'agent@advancia.com' },
  { role: 'Consultant', email: 'consultant@advancia.com' },
  { role: 'Admin', email: 'admin@advancia.com' },
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
    catch (error) { setServerError(getApiErrorMessage(error, 'We could not sign you in with those credentials.')) }
  }

  const chooseDemo = (email: string) => { setValue('email', email, { shouldValidate: true }); setValue('password', 'password123', { shouldValidate: true }) }

  return <main className="grid min-h-screen bg-[#f7f7f4] lg:grid-cols-[minmax(400px,0.9fr)_minmax(560px,1.1fr)]"><section className="hidden flex-col justify-between bg-[#111827] p-12 text-white lg:flex xl:p-16"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-md bg-blue-600"><ShieldCheck className="size-5" /></div><span className="font-bold tracking-tight">Advancia</span></div><div className="max-w-xl"><p className="mb-5 text-xs font-bold uppercase tracking-[.2em] text-blue-400">Renewal operations</p><h1 className="text-5xl font-semibold leading-[1.05] tracking-[-.045em] xl:text-6xl">Keep every client renewal moving.</h1><p className="mt-7 max-w-lg text-base leading-7 text-slate-400">One operational workspace to detect expiry risk, assign ownership, follow up, and close every contract or license renewal.</p><ul className="mt-10 space-y-3 text-sm text-slate-300">{['15 · 10 · 6 day expiry alerts', 'Clear ownership and follow-up queues', 'Complete renewal decision history'].map((item) => <li className="flex items-center gap-3" key={item}><CheckCircle2 className="size-4 text-blue-400" />{item}</li>)}</ul></div><p className="text-xs text-slate-500">Internal operations workspace</p></section><section className="flex items-center justify-center px-5 py-12 sm:px-8"><div className="w-full max-w-[440px]"><div className="mb-8 flex items-center gap-3 lg:hidden"><div className="grid size-9 place-items-center rounded-md bg-primary text-white"><ShieldCheck className="size-5" /></div><span className="font-bold tracking-tight">Advancia</span></div><Card className="border-slate-200 bg-white"><CardHeader className="pb-5"><div className="mb-5 grid size-11 place-items-center rounded-lg border bg-slate-50"><LockKeyhole className="size-5 text-primary" /></div><CardTitle className="text-2xl">Sign in to your workspace</CardTitle><CardDescription>Use your Advancia account to manage renewal operations.</CardDescription></CardHeader><CardContent><form onSubmit={handleSubmit(submit)} className="space-y-5" noValidate>{serverError && <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">{serverError}</div>}<div className="space-y-2"><Label htmlFor="email">Email address</Label><Input id="email" type="email" autoComplete="email" autoFocus placeholder="name@advancia.com" aria-invalid={Boolean(errors.email)} {...register('email')} />{errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}</div><div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" autoComplete="current-password" aria-invalid={Boolean(errors.password)} {...register('password')} />{errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}</div><Button className="w-full" disabled={isSubmitting || isLoading}>{isSubmitting ? <><LoaderCircle className="animate-spin" />Signing in</> : <>Sign in<ArrowRight /></>}</Button></form><div className="mt-8 border-t pt-6"><p className="mb-3 text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground">Demo access · password123</p><div className="grid gap-2 sm:grid-cols-3">{demoUsers.map((demo) => <button key={demo.role} type="button" onClick={() => chooseDemo(demo.email)} className="rounded-md border bg-slate-50 px-2 py-2 text-left transition hover:border-primary/40 hover:bg-blue-50"><span className="block text-xs font-semibold">{demo.role}</span><span className="block truncate text-[10px] text-muted-foreground">{demo.email}</span></button>)}</div></div></CardContent></Card></div></section></main>
}
