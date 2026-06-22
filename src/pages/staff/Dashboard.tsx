import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { brl } from '@/lib/format'
import { Card, Spinner } from '@/components/ui'

interface Stats {
  openCount: number
  openSum: number
  todaySum: number
  tables: number
  occupied: number
  pending: number
}

export default function Dashboard() {
  const { establishment } = useAuth()
  const estId = establishment?.id
  const [stats, setStats] = useState<Stats | null>(null)

  const load = useCallback(async () => {
    if (!estId) return
    const { data: orders } = await supabase
      .from('orders')
      .select('id,status,total_cents,closed_at')
      .eq('establishment_id', estId)
    const list = orders ?? []
    const open = list.filter((o: any) => o.status === 'open' || o.status === 'closing')
    const openSum = open.reduce((s: number, o: any) => s + (o.total_cents ?? 0), 0)
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const todaySum = list
      .filter((o: any) => o.status === 'paid' && o.closed_at && new Date(o.closed_at) >= start)
      .reduce((s: number, o: any) => s + (o.total_cents ?? 0), 0)

    const { data: tbls } = await supabase.from('tables').select('id,status').eq('establishment_id', estId)
    const occupied = (tbls ?? []).filter((t: any) => t.status === 'occupied').length

    let pending = 0
    const ids = (tbls ?? []).map((t: any) => t.id)
    if (ids.length) {
      const { count } = await supabase
        .from('waiter_calls')
        .select('id', { count: 'exact', head: true })
        .in('table_id', ids)
        .eq('status', 'pending')
      pending = count ?? 0
    }

    setStats({ openCount: open.length, openSum, todaySum, tables: (tbls ?? []).length, occupied, pending })
  }, [estId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!estId) return
    const ch = supabase
      .channel(`dash-${estId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `establishment_id=eq.${estId}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waiter_calls' }, () => load())
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [estId, load])

  if (!stats) return <Spinner />

  const cards = [
    { label: 'Faturado hoje', value: brl(stats.todaySum), hint: 'contas pagas' },
    { label: 'Em aberto', value: brl(stats.openSum), hint: `${stats.openCount} conta(s)` },
    { label: 'Mesas ocupadas', value: `${stats.occupied}/${stats.tables}`, hint: 'agora' },
    { label: 'Chamadas pendentes', value: String(stats.pending), hint: 'aguardando' },
  ]

  return (
    <div>
      <h1 className="text-xl font-extrabold">Painel</h1>
      <p className="text-gray-400 text-sm">Visão em tempo real do salão.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
        {cards.map((c) => (
          <Card key={c.label} className="p-4">
            <div className="text-xs text-gray-400">{c.label}</div>
            <div className="text-2xl font-extrabold mt-1">{c.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{c.hint}</div>
          </Card>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/app/operacao" className="px-4 py-2 rounded-lg bg-brand text-ink font-semibold text-sm">
          Ir para a Operação →
        </Link>
        {stats.pending > 0 && (
          <Link
            to="/app/operacao"
            className="px-4 py-2 rounded-lg border border-amber-500/40 text-amber-300 text-sm"
          >
            🔔 {stats.pending} chamada(s) aguardando
          </Link>
        )}
      </div>
    </div>
  )
}
