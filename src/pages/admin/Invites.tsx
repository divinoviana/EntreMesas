import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Button, Card, Empty, Spinner } from '@/components/ui'

interface Invite {
  code: string
  note: string | null
  is_active: boolean
  created_at: string
  used_at: string | null
}

function genCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const part = (n: number) =>
    Array.from({ length: n }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
  return `EM-${part(4)}-${part(4)}`
}

export default function Invites() {
  const { user, staff, signOut } = useAuth()
  const nav = useNavigate()
  const [loading, setLoading] = useState(true)
  const [invites, setInvites] = useState<Invite[]>([])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('establishment_invites')
      .select('code,note,is_active,created_at,used_at')
      .order('created_at', { ascending: false })
    setInvites((data as Invite[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function generate(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    const code = genCode()
    const { error } = await supabase
      .from('establishment_invites')
      .insert({ code, note: note.trim() || null, created_by: user?.id })
    setBusy(false)
    if (error) {
      setErr(error.message)
      return
    }
    setNote('')
    await load()
  }

  async function deactivate(code: string) {
    await supabase.from('establishment_invites').update({ is_active: false }).eq('code', code)
    await load()
  }

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-30 bg-ink/90 backdrop-blur border-b border-line">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="font-extrabold">🎟️ Convites — admin</div>
          <div className="flex items-center gap-4 text-xs">
            {staff && (
              <Link to="/app" className="text-gray-400 hover:text-gray-200">
                Meu bar
              </Link>
            )}
            <button onClick={async () => { await signOut(); nav('/login') }} className="text-gray-500 hover:text-gray-300">
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-xl font-extrabold">Códigos de convite</h1>
        <p className="text-gray-400 text-sm">
          Gere um código e entregue ao dono do bar autorizado. Só com um código válido é
          possível cadastrar um novo bar.
        </p>

        <Card className="p-4 mt-4">
          <form onSubmit={generate} className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-gray-400">Identificação (opcional)</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ex.: Bar do Márcio / João (11) 9...."
                className="mt-1 w-full px-3 py-2 rounded-lg bg-ink border border-line outline-none focus:border-brand text-sm"
              />
            </div>
            <Button type="submit" disabled={busy}>
              {busy ? 'Gerando…' : 'Gerar código'}
            </Button>
          </form>
          {err && <p className="text-xs text-rose-300 mt-2">{err}</p>}
        </Card>

        <div className="mt-6">
          {loading ? (
            <Spinner />
          ) : invites.length === 0 ? (
            <Empty>Nenhum convite gerado ainda.</Empty>
          ) : (
            <Card className="divide-y divide-line">
              {invites.map((inv) => (
                <div key={inv.code} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="font-mono font-semibold tracking-wider">{inv.code}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {inv.note || '—'}
                      {inv.used_at
                        ? ` · usado em ${new Date(inv.used_at).toLocaleDateString('pt-BR')}`
                        : inv.is_active
                          ? ' · disponível'
                          : ' · inativo'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs shrink-0">
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(inv.code)
                        setCopied(inv.code)
                        setTimeout(() => setCopied(null), 1500)
                      }}
                      className="px-2.5 py-1 rounded-lg border border-line hover:bg-panel2"
                    >
                      {copied === inv.code ? 'Copiado ✓' : 'Copiar'}
                    </button>
                    {inv.is_active && !inv.used_at && (
                      <button onClick={() => deactivate(inv.code)} className="text-rose-400 hover:text-rose-300">
                        Desativar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
