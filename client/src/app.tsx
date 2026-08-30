import { Navigate, Outlet, RouterProvider, createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/app-shell'
import { PageLoader } from '@/components/feedback'
import { AuthProvider, useAuth } from '@/contexts/auth-context'
import { LoginPage } from '@/pages/login-page'
import { DashboardPage, AdminOverviewPage } from '@/features/dashboard'
import { MyActionsPage } from '@/features/actions'
import { ClientsPage, ClientDetailPage } from '@/features/clients'
import { ContractsPage, ContractDetailPage } from '@/features/contracts'
import { LicensesPage, LicenseDetailPage } from '@/features/licenses'
import { CatalogsPage } from '@/features/catalogs'
import { TeamPage } from '@/features/team/team-page'
import type { UserRole } from '@/types'

function ProtectedRoute({ roles }: { roles?: UserRole[] }) {
  const { user, isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <PageLoader />
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return <Outlet />
}

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { element: <ProtectedRoute />, children: [{ element: <AppShell />, children: [
    { index: true, element: <Navigate to="/dashboard" replace /> },
    { path: '/dashboard', element: <DashboardPage /> },
    { path: '/clients', element: <ClientsPage /> },
    { path: '/clients/:id', element: <ClientDetailPage /> },
  ] }] },
  { element: <ProtectedRoute roles={['agent', 'consultant']} />, children: [{ element: <AppShell />, children: [
    { path: '/actions', element: <MyActionsPage /> },
  ] }] },
  { element: <ProtectedRoute roles={['consultant', 'admin']} />, children: [{ element: <AppShell />, children: [
    { path: '/contracts', element: <ContractsPage /> },
    { path: '/contracts/:id', element: <ContractDetailPage /> },
  ] }] },
  { element: <ProtectedRoute roles={['agent', 'admin']} />, children: [{ element: <AppShell />, children: [
    { path: '/licenses', element: <LicensesPage /> },
    { path: '/licenses/:id', element: <LicenseDetailPage /> },
  ] }] },
  { element: <ProtectedRoute roles={['admin']} />, children: [{ element: <AppShell />, children: [
    { path: '/admin', element: <AdminOverviewPage /> },
    { path: '/catalogues', element: <CatalogsPage /> },
    { path: '/equipe', element: <TeamPage /> },
  ] }] },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])

export function App() { return <AuthProvider><RouterProvider router={router} /></AuthProvider> }
