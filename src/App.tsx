import { Routes, Route, Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { isConfigured } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Spinner } from '@/components/ui'

import Home from '@/pages/Home'
import Login from '@/pages/Login'
import Onboarding from '@/pages/Onboarding'
import TableView from '@/pages/customer/TableView'
import StaffLayout from '@/pages/staff/StaffLayout'
import Dashboard from '@/pages/staff/Dashboard'
import Operacao from '@/pages/staff/Operacao'
import TableDetail from '@/pages/staff/TableDetail'
import Cardapio from '@/pages/staff/Cardapio'
import MesasAdmin from '@/pages/staff/MesasAdmin'

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireStaff({ children }: { children: ReactNode }) {
  const { staff, loading } = useAuth()
  if (loading) return <Spinner />
  if (!staff) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

function ConfigScreen() {
  return (
    <div className="min-h-full grid place-items-center p-6">
      <div className="max-w-md bg-panel border border-line rounded-2xl p-6">
        <h1 className="text-xl font-extrabold">🍻 EntreMesas</h1>
        <p className="text-gray-400 mt-3 text-sm">
          App não configurado. Defina as variáveis de ambiente e recarregue:
        </p>
        <pre className="mt-3 text-xs bg-ink border border-line rounded-lg p-3 overflow-auto">
{`VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key`}
        </pre>
        <p className="text-gray-500 mt-3 text-xs">
          Em desenvolvimento: arquivo <code>.env.local</code>. Na Vercel: Project → Settings →
          Environment Variables.
        </p>
      </div>
    </div>
  )
}

export default function App() {
  if (!isConfigured) return <ConfigScreen />
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
      <Route path="/t/:tableId" element={<TableView />} />
      <Route
        path="/app"
        element={
          <RequireAuth>
            <RequireStaff>
              <StaffLayout />
            </RequireStaff>
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="operacao" element={<Operacao />} />
        <Route path="operacao/:tableId" element={<TableDetail />} />
        <Route path="cardapio" element={<Cardapio />} />
        <Route path="mesas" element={<MesasAdmin />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
