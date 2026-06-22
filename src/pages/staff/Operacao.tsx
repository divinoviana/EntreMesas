import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { resolveCall } from '@/lib/api'
import { brl, callEmoji, callLabel, timeHM } from '@/lib/format'
import { Badge, Card, Empty, Spinner } from '@/components/ui'
import type { Order, TableRow, WaiterCall } from '@/lib/types'

export default function Operacao() {
  const { establishment } = useAuth()
  const estId = establishment?.id
  const nav = useNavigate()
  const [loading, setLoading] = useState(true)
  const [tables, setTables] = useState<TableRow[]>([])
  const [openByTable, setOpenByTable] = useState<Record<string, Order>>({})
  const [calls, setCalls] = useState<WaiterCall[]>([])

  const load = useCallback(async () => {
    if (!estId) return
    const { data: tbls } = await supabase
      .from('tables')
      .select('*')
      .eq('establishment_id', estId)
      .order('label')
    setTables((tbls as TableRow[]) ?? [])

    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('establishment_id', estId)
      .in('status', ['open', 'closing'])
    const map: Record<string, Order> = {}
    ;(orders as Order[] | null)?.forEach((o) => {
      map[o.table_id] = o
    })
    setOpenByTable(map)

    const ids = (tbls ?? []).map((t: any) => t.id)
    if (ids.length) {
      const { data: c } = await supabase
        .from('waiter_calls')
        .select('*')
        .in('table_id', ids)
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .order('created_at')
      setCalls((c as WaiterCall[]) ?? [])
    } else {
      setCalls([])
    }
    setLoading(false)
  }, [estId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!estId) return
    const ch = supabase
      .channel(`op-${estId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `establishment_id=eq.${estId}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waiter_calls' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables', filter: `establishment_id=eq.${estId}` }, () => load())
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [estId, load])

  const tableLabel = (id: string) => tables.find((t) => t.id === id)?.label ?? '?'

  if (loading) return <Spinner />

  return (
    <div>
      <h1 className="text-xl font-extrabold">Operação</h1>

      {/* Fila de chamadas */}
      <section className="mt-4">
        <h2 className="text-sm font-semibold text-gray-300 mb-2">🔔 Chamadas ({calls.length})</h2>
        {calls.length === 0 ? (
          <div className="text-xs text-gray-500">Nenhuma chamada no momento.</div>
        ) : (
          <div className="space-y-2">
            {calls.map((c) => (
              <Card key={c.id} className="p-3 flex items-center justify-between">
                <div className="text-sm">
                  <span className="mr-2">{callEmoji[c.type] ?? '🔔'}</span>
                  <strong>Mesa {tableLabel(c.table_id)}</strong> — {callLabel[c.type] ?? c.type}
                  <span className="text-gray-500"> · {timeHM(c.created_at)}</span>
                </div>
                <button
                  onClick={() => resolveCall(c.id)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-brand text-ink font-semibold"
                >
                  Atendido
                </button>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Mesas */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-2">🪑 Mesas</h2>
        {tables.length === 0 ? (
          <Empty>Nenhuma mesa cadastrada. Vá em “Mesas & QR”.</Empty>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {tables.map((t) => {
              const o = openByTable[t.id]
              return (
                <button
                  key={t.id}
                  onClick={() => nav(`/app/operacao/${t.id}`)}
                  className={`text-left rounded-2xl border p-4 transition ${
                    o ? 'border-brand/50 bg-brand/5' : 'border-line bg-panel hover:bg-panel2'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold">Mesa {t.label}</div>
                    {o ? <Badge color="green">aberta</Badge> : <Badge>livre</Badge>}
                  </div>
                  <div className="mt-2 text-2xl font-extrabold">{brl(o?.total_cents ?? 0)}</div>
                </button>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
