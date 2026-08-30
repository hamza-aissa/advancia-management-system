import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Activity, BookOpen, Building2, ClipboardCheck, FileKey2, FileText, LayoutDashboard, LogOut, Menu, ShieldCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types'

type NavigationItem = { label: string; to: string; icon: typeof LayoutDashboard; roles?: UserRole[] }

const navigation: NavigationItem[] = [
  { label: 'Tableau de bord', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Mes actions', to: '/actions', icon: ClipboardCheck, roles: ['agent', 'consultant'] },
  { label: 'Clients', to: '/clients', icon: Building2 },
  { label: 'Contrats', to: '/contracts', icon: FileText, roles: ['consultant', 'admin'] },
  { label: 'Licences', to: '/licenses', icon: FileKey2, roles: ['agent', 'admin'] },
  { label: 'Supervision', to: '/admin', icon: ShieldCheck, roles: ['admin'] },
  { label: 'Catalogues', to: '/catalogues', icon: BookOpen, roles: ['admin'] },
]

const routeTitles: Record<string, { eyebrow: string; title: string }> = {
  '/dashboard': { eyebrow: 'Suivi des renouvellements', title: 'Tableau de bord' },
  '/actions': { eyebrow: 'File de travail', title: 'Mes actions' },
  '/clients': { eyebrow: 'Portefeuille', title: 'Clients' },
  '/contracts': { eyebrow: 'Échéances', title: 'Contrats' },
  '/licenses': { eyebrow: 'Échéances', title: 'Licences' },
  '/admin': { eyebrow: 'Pilotage', title: 'Supervision' },
  '/catalogues': { eyebrow: 'Administration', title: 'Catalogues' },
}

function Brand() {
  return <div className="flex h-14 items-center gap-3 border-b px-4"><div className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground"><Activity className="size-4" /></div><div><p className="text-[15px] font-semibold tracking-tight">Advancia</p><p className="text-[10px] font-medium uppercase tracking-[.12em] text-muted-foreground">Gestion interne</p></div></div>
}

interface SidebarProps {
  items: NavigationItem[]
  user: ReturnType<typeof useAuth>['user']
  logout: () => void
  onNavigate?: () => void
}

function Sidebar({ items, user, logout, onNavigate }: SidebarProps) {
  const role = user?.role === 'agent' ? 'Agent · licences' : user?.role === 'consultant' ? 'Consultant · contrats' : 'Administrateur'
  return <div className="flex h-full flex-col border-r bg-slate-50 text-slate-800"><Brand /><nav aria-label="Navigation principale" className="flex-1 space-y-1 p-2">{items.map((item) => <NavLink key={item.to} to={item.to} onClick={onNavigate} className={({ isActive }) => cn('flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950', isActive && 'bg-blue-50 text-blue-800')}><item.icon className="size-4" />{item.label}</NavLink>)}</nav><div className="border-t p-2"><div className="mb-2 flex items-center gap-2 px-2 py-1"><div className="grid size-8 shrink-0 place-items-center rounded-md bg-slate-200 text-xs font-semibold">{user?.firstName?.[0]}{user?.lastName?.[0]}</div><div className="min-w-0"><p className="truncate text-sm font-medium">{user?.firstName} {user?.lastName}</p><p className="truncate text-[11px] text-muted-foreground">{role}</p></div></div><Button variant="ghost" size="sm" onClick={logout} className="w-full justify-start text-slate-600"><LogOut />Déconnexion</Button></div></div>
}

export function AppShell() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const items = navigation.filter((item) => !item.roles || (user && item.roles.includes(user.role)))
  const current = routeTitles[location.pathname] || { eyebrow: 'Advancia', title: 'Espace de travail' }

  return <div className="min-h-screen bg-background lg:grid lg:grid-cols-[220px_1fr]"><aside className="fixed inset-y-0 left-0 z-40 hidden w-[220px] lg:block"><Sidebar items={items} user={user} logout={logout} /></aside>{mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><button aria-label="Fermer la navigation" className="absolute inset-0 bg-slate-950/35" onClick={() => setMobileOpen(false)} /><aside className="relative h-full w-[260px]"><Sidebar items={items} user={user} logout={logout} onNavigate={() => setMobileOpen(false)} /><button onClick={() => setMobileOpen(false)} aria-label="Fermer la navigation" className="absolute right-2 top-2 rounded p-2 text-slate-600 hover:bg-slate-100"><X className="size-5" /></button></aside></div>}<div className="min-w-0 lg:col-start-2"><header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-6"><div className="flex items-center gap-3"><Button size="icon" variant="ghost" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Ouvrir la navigation"><Menu /></Button><div><p className="hidden text-[10px] font-semibold uppercase tracking-[.12em] text-primary sm:block">{current.eyebrow}</p><h1 className="text-base font-semibold">{current.title}</h1></div></div><div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="grid size-7 place-items-center rounded-md bg-muted font-semibold text-foreground">{user?.firstName?.[0]}{user?.lastName?.[0]}</span><span className="hidden sm:inline">{user?.firstName}</span></div></header><main className="w-full p-4 md:p-6"><Outlet /></main></div></div>
}
