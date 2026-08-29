import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Activity, Building2, ClipboardCheck, FileKey2, FileText, LayoutDashboard, LogOut, Menu, ShieldCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types'

type NavigationItem = { label: string; to: string; icon: typeof LayoutDashboard; roles?: UserRole[] }

const navigation: NavigationItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'My actions', to: '/actions', icon: ClipboardCheck, roles: ['agent', 'consultant'] },
  { label: 'Clients', to: '/clients', icon: Building2 },
  { label: 'Contracts', to: '/contracts', icon: FileText, roles: ['consultant', 'admin'] },
  { label: 'Licenses', to: '/licenses', icon: FileKey2, roles: ['agent', 'admin'] },
  { label: 'Admin overview', to: '/admin', icon: ShieldCheck, roles: ['admin'] },
]

const routeTitles: Record<string, { eyebrow: string; title: string }> = {
  '/dashboard': { eyebrow: 'Renewal operations', title: 'Dashboard' },
  '/actions': { eyebrow: 'Your queue', title: 'My actions' },
  '/clients': { eyebrow: 'Account portfolio', title: 'Clients' },
  '/contracts': { eyebrow: 'Renewal pipeline', title: 'Contracts' },
  '/licenses': { eyebrow: 'Renewal pipeline', title: 'Licenses' },
  '/admin': { eyebrow: 'Operations control', title: 'Admin overview' },
}

function Brand() {
  return <div className="flex h-16 items-center gap-3 border-b px-5"><div className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground"><Activity className="size-4" /></div><div><p className="text-[15px] font-bold tracking-tight">Advancia</p><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">Renewal desk</p></div></div>
}

interface SidebarProps {
  items: NavigationItem[]
  user: ReturnType<typeof useAuth>['user']
  logout: () => void
  onNavigate?: () => void
}

function Sidebar({ items, user, logout, onNavigate }: SidebarProps) {
  return <div className="flex h-full flex-col bg-[#111827] text-white"><Brand /><nav aria-label="Main navigation" className="flex-1 space-y-1 p-3">{items.map((item) => <NavLink key={item.to} to={item.to} onClick={onNavigate} className={({ isActive }) => cn('flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white', isActive && 'bg-white/10 text-white')}><item.icon className="size-4" />{item.label}</NavLink>)}</nav><div className="border-t border-white/10 p-3"><div className="mb-3 flex items-center gap-3 px-2"><div className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold">{user?.firstName?.[0]}{user?.lastName?.[0]}</div><div className="min-w-0"><p className="truncate text-sm font-medium">{user?.firstName} {user?.lastName}</p><p className="truncate text-xs capitalize text-slate-400">{user?.role}</p></div></div><Button variant="ghost" onClick={logout} className="w-full justify-start text-slate-400 hover:bg-white/5 hover:text-white"><LogOut />Sign out</Button></div></div>
}

export function AppShell() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const items = navigation.filter((item) => !item.roles || (user && item.roles.includes(user.role)))
  const current = routeTitles[location.pathname] || { eyebrow: 'Advancia', title: 'Workspace' }

  return <div className="min-h-screen bg-background lg:grid lg:grid-cols-[248px_1fr]"><aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] lg:block"><Sidebar items={items} user={user} logout={logout} /></aside>{mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><button aria-label="Close navigation" className="absolute inset-0 bg-slate-950/45" onClick={() => setMobileOpen(false)} /><aside className="relative h-full w-[280px] shadow-2xl"><Sidebar items={items} user={user} logout={logout} onNavigate={() => setMobileOpen(false)} /><button onClick={() => setMobileOpen(false)} aria-label="Close navigation" className="absolute right-3 top-3 rounded p-2 text-slate-300 hover:bg-white/10"><X className="size-5" /></button></aside></div>}<div className="min-w-0 lg:col-start-2"><header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-8"><div className="flex items-center gap-3"><Button size="icon" variant="ghost" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu /></Button><div><p className="hidden text-[10px] font-bold uppercase tracking-[.16em] text-primary sm:block">{current.eyebrow}</p><h1 className="text-lg font-semibold tracking-tight">{current.title}</h1></div></div><div className="flex items-center gap-2 rounded-full border bg-card py-1 pl-1 pr-3 text-xs text-muted-foreground"><span className="grid size-7 place-items-center rounded-full bg-muted font-bold text-foreground">{user?.firstName?.[0]}{user?.lastName?.[0]}</span><span className="hidden sm:inline">{user?.firstName}</span></div></header><main className="mx-auto w-full max-w-[1440px] p-4 md:p-8"><Outlet /></main></div></div>
}
