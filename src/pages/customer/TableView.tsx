import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { createDispute, createWaiterCall, getDisputes, getOpenOrder } from '@/lib/api'
import { brl, callLabel, disputeReasons, timeHM } from '@/lib/format'
import { Button, Spinner } from '@/components/ui'
import type { Establishment, Order, OrderItem, TableRow, WaiterCall } from '@/lib/types'

export default function TableView() {
  const { tableId } = useParams()
  const [loading, setLoading] = useState(true)
  const [table, setTable] = useState<TableRow | null>(null)
  const [est, setEst] = useState<Establishment | null>(null)
  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [calls, setCalls] = useState<WaiterCall[]>([])
  const [openDisputeIds, setOpenDisputeIds] = useState<Set<string>>(new Set())
  const [disputing, setDisputing] = useState<OrderItem | null>(null)
  const [reason, setReason] = useState('not_ordered')
  const [detail, setDetail] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const itemsRef = useRef<OrderItem[]>([])

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  const loadOrderAndItems = useCallback(async () => {
    if (!tableId) return
    const o = await getOpenOrder(tableId)
    setOrder(o)
    if (o) {
      const { data } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', o.id)
        .eq('status', 'active')
        .order('created_at')
      setItems((data as OrderItem[]) ?? [])
    } else {
      setItems([])
    }
  }, [tableId])

  const loadCalls = useCallback(async () => {
    if (!tableId) return
    const { data } = await supabase
      .from('waiter_calls')
      .select('*')
      .eq('table_id', tableId)
      .eq('status', 'pending')
      .order('created_at')
    setCalls((data as WaiterCall[]) ?? [])
  }, [tableId])

  const loadDisputes = useCallback(async (itemIds: string[]) => {
    const ds = await getDisputes(itemIds)
    setOpenDisputeIds(new Set(ds.filter((d) => d.status === 'open').map((d) => d.order_item_id)))
  }, [])

  useEffect(() => {
    loadDisputes(items.map((i) => i.id))
  }, [items, loadDisputes])

  useEffect(() => {
    let alive = true
    async function init() {
      if (!tableId) return
      const { data: t } = await supabase.from('tables').select('*').eq('id', tableId).maybeSingle()
      if (!alive) return
      setTable((t as TableRow) ?? null)
      if (t) {
        const { data: e } = await supabase
          .from('establishments')
          .select('*')
          .eq('id', (t as TableRow).establishment_id)
          .maybeSingle()
        if (alive) setEst((e as Establishment) ?? null)
      }
      await loadOrderAndItems()
      await loadCalls()
      if (alive) setLoading(false)
    }
    init()
    return () => {
      alive = false
    }
  }, [tableId, loadOrderAndItems, loadCalls])

  // Tempo real: itens, conta, chamadas e contestações
  useEffect(() => {
    if (!tableId) return
    const ch = supabase.channel(`table-${tableId}-${order?.id ?? 'none'}`)
    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `table_id=eq.${tableId}` }, () =>
      loadOrderAndItems(),
    )
    if (order?.id) {
      ch.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items', filter: `order_id=eq.${order.id}` },
        () => loadOrderAndItems(),
      )
    }
    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'waiter_calls', filter: `table_id=eq.${tableId}` }, () =>
      loadCalls(),
    )
    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'disputes' }, () =>
      loadDisputes(itemsRef.current.map((i) => i.id)),
    )
    ch.subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [tableId, order?.id, loadOrderAndItems, loadCalls, loadDisputes])

  const flash = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(null), 3500)
  }

  async function call(type: 'service' | 'checkout') {
    if (!tableId) return
    setSending(true)
    try {
      await createWaiterCall(tableId, type)
      flash(type === 'checkout' ? 'Conta solicitada! A equipe foi avisada. 💳' : 'Garçom chamado! Já estão a caminho. 🙋')
      await loadCalls()
    } catch {
      flash('Não foi possível enviar agora. Tente de novo.')
    } finally {
      setSending(false)
    }
  }

  async function submitDispute() {
    if (!disputing) return
    try {
      await createDispute(disputing.id, reason, detail)
      flash('Contestação enviada. A equipe vai revisar. 🚩')
      setDisputing(null)
      setDetail('')
      setReason('not_ordered')
      await loadDisputes(itemsRef.current.map((i) => i.id))
    } catch {
      flash('Não foi possível enviar a contestação.')
    }
  }

  if (loading) return <Spinner label="Abrindo sua mesa…" />

  if (!table) {
    return (
      <div className="min-h-full grid place-items-center p-6 text-center">
        <div>
          <div className="text-4xl">🤔</div>
          <p className="text-gray-300 mt-3 font-semibold">Mesa não encontrada</p>
          <p className="text-gray-500 text-sm mt-1">Confira o QR Code com a equipe do bar.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full max-w-md mx-auto px-4 py-6 pb-40">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-400">{est?.name ?? 'Bar'}</div>
          <h1 className="text-2xl font-extrabold">Mesa {table.label}</h1>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2.5 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> ao vivo
        </span>
      </div>

      <div className="mt-5 bg-panel border border-line rounded-2xl p-5">
        <div className="text-xs text-gray-400 uppercase tracking-wide">Total acumulado</div>
        <div className="text-4xl font-extrabold mt-1">{brl(order?.total_cents ?? 0)}</div>
      </div>

      <Link
        to={`/t/${tableId}/social`}
        className="mt-3 flex items-center justify-between bg-panel border border-line rounded-2xl p-4 hover:border-flirt transition"
      >
        <div>
          <div className="font-semibold">💞 Social Bar</div>
          <div className="text-xs text-gray-400">Veja quem está no bar e faça conexões</div>
        </div>
        <span className="text-gray-500">›</span>
      </Link>

      <div className="mt-5">
        <h2 className="text-sm font-semibold text-gray-300 mb-2">Itens lançados</h2>
        {items.length === 0 ? (
          <div className="bg-panel border border-line rounded-2xl p-5 text-center text-sm text-gray-500">
            Nenhum item ainda. Assim que o garçom lançar algo, aparece aqui na hora. ✨
          </div>
        ) : (
          <div className="bg-panel border border-line rounded-2xl divide-y divide-line">
            {items.map((it) => {
              const disputed = openDisputeIds.has(it.id)
              return (
                <div key={it.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">
                        {it.quantity}x {it.product_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {brl(it.unit_price_cents)} · {timeHM(it.created_at)}
                      </div>
                    </div>
                    <div className="text-sm font-semibold">{brl(it.line_total_cents)}</div>
                  </div>
                  <div className="mt-1">
                    {disputed ? (
                      <span className="text-xs text-amber-300">🚩 em revisão</span>
                    ) : (
                      <button onClick={() => setDisputing(it)} className="text-xs text-gray-500 hover:text-amber-300">
                        Contestar
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {calls.length > 0 && (
        <div className="mt-4 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
          {calls.map((c) => (
            <div key={c.id}>⏳ {callLabel[c.type] ?? c.type} — aguardando atendimento…</div>
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-28 z-20 bg-emerald-500 text-ink text-sm font-semibold px-4 py-2 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {/* Ações fixas */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-line bg-ink/95 backdrop-blur">
        <div className="max-w-md mx-auto px-4 py-3 space-y-2">
          <Link
            to={`/t/${tableId}/dividir`}
            className="block text-center text-sm py-2 rounded-lg border border-line hover:bg-panel2"
          >
            ➗ Dividir a conta
          </Link>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="ghost" disabled={sending} onClick={() => call('service')}>
              🙋 Chamar garçom
            </Button>
            <Button disabled={sending} onClick={() => call('checkout')}>
              💳 Pedir a conta
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de contestação */}
      {disputing && (
        <div className="fixed inset-0 z-40 bg-black/60 grid place-items-center p-5" onClick={() => setDisputing(null)}>
          <div className="bg-panel border border-line rounded-2xl p-5 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="font-bold">Contestar lançamento</div>
            <div className="text-sm text-gray-400 mt-1">
              {disputing.quantity}x {disputing.product_name} — {brl(disputing.line_total_cents)}
            </div>
            <div className="mt-3 space-y-2 text-sm">
              {disputeReasons.map((r) => (
                <label key={r.value} className="flex items-center gap-2">
                  <input type="radio" name="reason" checked={reason === r.value} onChange={() => setReason(r.value)} />
                  {r.label}
                </label>
              ))}
            </div>
            <input
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="Observação (opcional)"
              className="mt-3 w-full px-3 py-2 rounded-lg bg-ink border border-line outline-none focus:border-brand text-sm"
            />
            <div className="flex gap-2 mt-4">
              <Button onClick={submitDispute}>Enviar contestação</Button>
              <Button variant="ghost" onClick={() => setDisputing(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
