import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { createBarWithInvite } from '@/lib/api'
import { Button } from '@/components/ui'

export default function Onboarding() {
  const { user, refresh, signOut, isPlatformAdmin } = useAuth()
  const nav = useNavigate()
  const [barName, setBarName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function create(e: FormEvent) {
    e.preventDefault()
    if (!barName.trim() || !code.trim() || !user) return
    setBusy(true)
    setErr(null)
    try {
      await createBarWithInvite(code.trim(), barName.trim(), ownerName.trim())
      await refresh()
      // Confirma que o app consegue LER o registro de staff (políticas RLS aplicadas).
      const { data: s } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()
      if (!s) {
        setErr(
          'Seu bar foi criado, mas o app não conseguiu carregar suas permissões. ' +
            'Provavelmente a migração 0002 (políticas RLS) não foi aplicada no Supabase. ' +
            'Aplique a 0002 e recarregue esta página.',
        )
        setBusy(false)
        return
      }
      nav('/app')
    } catch (e: any) {
      setErr(e?.message || 'Não foi possível criar o bar. Verifique o código de convite.')
      setBusy(false)
    }
  }

  return (
    <div className="min-h-full grid place-items-center p-5">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-extrabold">Configurar seu bar 👋</h1>
        <p className="text-gray-400 mt-2 text-sm">
          O cadastro de bares é <strong>controlado</strong>: você precisa de um{' '}
          <strong>código de convite</strong> fornecido pelo administrador do EntreMesas.
        </p>

        <form onSubmit={create} className="mt-6 bg-panel border border-line rounded-2xl p-5 space-y-3">
          <div>
            <label className="text-xs text-gray-400">Código de convite</label>
            <input
              required
              placeholder="Ex.: EM-AB12-CD34"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="mt-1 w-full px-3 py-2.5 rounded-lg bg-ink border border-line outline-none focus:border-brand tracking-wider"
            />
          </div>
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
          <p className="text-xs text-gray-500">
            Já vem com cardápio e 8 mesas de exemplo — você ajusta depois.
          </p>
        </form>

        {isPlatformAdmin && (
          <Link
            to="/convites"
            className="block text-center text-sm text-brand mt-5 hover:underline"
          >
            🎟️ Você é admin da plataforma — gerar códigos de convite →
          </Link>
        )}

        <button onClick={() => signOut()} className="block mx-auto text-xs text-gray-600 mt-6 hover:text-gray-400">
          Sair desta conta
        </button>
      </div>
    </div>
  )
}
