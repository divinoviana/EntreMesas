import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export default function StaffLayout() {
  const { establishment, signOut } = useAuth()
  const nav = useNavigate()

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${
      isActive ? 'bg-brand text-ink font-semibold' : 'text-gray-300 hover:bg-panel2'
    }`

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-30 bg-ink/90 backdrop-blur border-b border-line">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="font-extrabold truncate">🍻 {establishment?.name ?? 'EntreMesas'}</div>
          <button
            onClick={async () => {
              await signOut()
              nav('/login')
            }}
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            Sair
          </button>
        </div>
        <nav className="max-w-5xl mx-auto px-4 pb-2 flex items-center gap-1 overflow-x-auto">
          <NavLink end to="/app" className={linkCls}>
            📊 Painel
          </NavLink>
          <NavLink to="/app/operacao" className={linkCls}>
            🪑 Operação
          </NavLink>
          <NavLink to="/app/cardapio" className={linkCls}>
            📋 Cardápio
          </NavLink>
          <NavLink to="/app/mesas" className={linkCls}>
            🔳 Mesas & QR
          </NavLink>
        </nav>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
