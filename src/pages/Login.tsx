import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const nav = useNavigate()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    const fn = mode === 'in' ? signIn : signUp
    const { error } = await fn(email.trim(), password)
    if (error) {
      setBusy(false)
      setMsg(error)
      return
    }
    // Verifica se já existe sessão (sign up com confirmação de e-mail não cria sessão na hora)
    const { data } = await supabase.auth.getSession()
    setBusy(false)
    if (data.session) {
      nav('/app')
    } else {
      setMsg(
        'Conta criada. Se a confirmação de e-mail estiver ativada no seu Supabase, confirme pelo link enviado e depois entre. (Para testes, desative em Authentication → Providers → Email → "Confirm email".)',
      )
      setMode('in')
    }
  }

  return (
    <div className="min-h-full grid place-items-center p-5">
      <div className="w-full max-w-sm">
        <div className="text-2xl font-extrabold text-center">
          🍻 Entre<span className="text-brand">Mesas</span>
        </div>
        <p className="text-center text-gray-400 text-sm mt-1">Acesso da equipe</p>

        <form onSubmit={submit} className="mt-6 bg-panel border border-line rounded-2xl p-5 space-y-3">
          <div className="flex gap-2 text-sm">
            <button
              type="button"
              onClick={() => setMode('in')}
              className={`flex-1 py-2 rounded-lg ${mode === 'in' ? 'bg-brand text-ink font-semibold' : 'border border-line'}`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setMode('up')}
              className={`flex-1 py-2 rounded-lg ${mode === 'up' ? 'bg-brand text-ink font-semibold' : 'border border-line'}`}
            >
              Criar conta
            </button>
          </div>

          <input
            type="email"
            required
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-ink border border-line outline-none focus:border-brand"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Senha (mín. 6 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-ink border border-line outline-none focus:border-brand"
          />

          {msg && <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">{msg}</p>}

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Aguarde…' : mode === 'in' ? 'Entrar' : 'Criar conta'}
          </Button>
        </form>

        <Link to="/" className="block text-center text-xs text-gray-600 mt-6 hover:text-gray-400">
          ← Voltar
        </Link>
      </div>
    </div>
  )
}
