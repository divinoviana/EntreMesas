import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { createBarWithDefaults } from '@/lib/api'
import { Button } from '@/components/ui'

export default function Onboarding() {
  const { user, refresh, signOut } = useAuth()
  const nav = useNavigate()
  const [barName, setBarName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function create(e: FormEvent) {
    e.preventDefault()
    if (!barName.trim() || !user) return
    setBusy(true)
    setErr(null)
    try {
      await createBarWithDefaults(user.id, ownerName.trim(), barName.trim())
      await refresh()
      nav('/app')
    } catch (e: any) {
      setErr(e?.message || 'Não foi possível criar o bar. Verifique se as migrations 0001 e 0002 foram aplicadas no Supabase.')
      setBusy(false)
    }
  }

  return (
    <div className="min-h-full grid place-items-center p-5">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-extrabold">Bem-vindo! 👋</h1>
        <p className="text-gray-400 mt-2 text-sm">
          Vamos configurar seu bar. Já deixamos um <strong>cardápio</strong> e <strong>8 mesas</strong> de
          exemplo prontos — você ajusta depois.
        </p>

        <form onSubmit={create} className="mt-6 bg-panel border border-line rounded-2xl p-5 space-y-3">
          <div>
            <label className="text-xs text-gray-400">Nome do bar</label>
            <input
              required
              placeholder="Ex.: Bar do Márcio"
              value={barName}
              onChange={(e) => setBarName(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 rounded-lg bg-ink border border-line outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Seu nome (responsável)</label>
            <input
              placeholder="Ex.: Márcio"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 rounded-lg bg-ink border border-line outline-none focus:border-brand"
            />
          </div>

          {err && <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg p-2">{err}</p>}

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Criando…' : 'Criar meu bar'}
          </Button>
        </form>

        <button onClick={() => signOut()} className="block mx-auto text-xs text-gray-600 mt-6 hover:text-gray-400">
          Sair desta conta
        </button>
      </div>
    </div>
  )
}
