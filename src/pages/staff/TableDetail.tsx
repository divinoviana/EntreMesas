import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { addItem, closeOrder, ensureOpenOrder, getOpenOrder, resolveCall, voidItem } from '@/lib/api'
import { brl, callLabel, timeHM } from '@/lib/format'
import { Button, Card, Spinner } from '@/components/ui'
import { QR } from '@/components/QR'
import type { Category, Order, OrderItem, Product, TableRow, WaiterCall } from '@/lib/types'

export default function TableDetail() {
  const { tableId } = useParams()
  const { establishment } = useAuth()
  const [loading, setLoading] = useState(true)
  const [table, setTable] = useState<TableRow | null>(null)
  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [cats, setCats] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [calls, setCalls] = useState<WaiterCall[]>([])
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const reloadOrder = useCallback(async () => {
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

  const reloadCalls = useCallback(async () => {
    if (!tableId) return
    const { data } = await supabase
      .from('waiter_calls')
      .select('*')
      .eq('table_id', tableId)
      .eq('status', 'pending')
      .order('created_at')
    setCalls((data as WaiterCall[]) ?? [])
  }, [tableId])

  useEffect(() => {
    let alive = true
    async function init() {
      if (!tableId || !establishment) return
      const { data: t } = await supabase.from('tables').select('*').eq('id', tableId).maybeSingle()
      if (!alive) return
      setTable((t as TableRow) ?? null)
      const { data: c } = await supabase
        .from('product_categories')
        .select('*')
        .eq('establishment_id', establishment.id)
        .order('sort_order')
      setCats((c as Category[]) ?? [])
      const { data: p } = await supabase
        .from('products')
        .select('*')
        .eq('establishment_id', establishment.id)
        .eq('is_available', true)
        .order('name')
      setProducts((p as Product[]) ?? [])
      await reloadOrder()
      await reloadCalls()
      if (alive) setLoading(false)
    }
    init()
    return () => {
      alive = false
    }
  }, [tableId, establishment, reloadOrder, reloadCalls])

  useEffect(() => {
    if (!tableId) return
    const ch = supabase.channel(`td-${tableId}-${order?.id ?? 'none'}`)
    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `table_id=eq.${tableId}` }, () => reloadOrder())
    if (order?.id) {
      ch.on('postgres_changes', { event: '*', schema: 'public', table: 'order_items', filter: `order_id=eq.${order.id}` }, () => reloadOrder())
    }
    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'waiter_calls', filter: `table_id=eq.${tableId}` }, () => reloadCalls())
    ch.subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [tableId, order?.id, reloadOrder, reloadCalls])

  const grouped = useMemo(() => {
    return cats
      .map((c) => ({ cat: c, items: products.filter((p) => p.category_id === c.id) }))
      .filter((g) => g.items.length > 0)
  }, [cats, products])

  const customerLink = `${window.location.origin}/t/${tableId}`

  async function handleOpen() {
    if (!tableId || !establishment) return
    setBusy(true)
    try {
      const o = await ensureOpenOrder(tableId, establishment.id)
      setOrder(o)
      await reloadOrder()
    } finally {
      setBusy(false)
    }
  }

  async function handleAdd(p: Product) {
    if (!tableId || !establishment) return
    setBusy(true)
    try {
      let o = order
      if (!o) o = await ensureOpenOrder(tableId, establishment.id)
      await addItem(o, p)
      setOrder(o)
      await reloadOrder()
    } finally {
      setBusy(false)
    }
  }

  async function handleClose() {
    if (!order) return
    if (!window.confirm(`Fechar a conta da Mesa ${table?.label}? Total ${brl(order.total_cents)}.`)) return
    setBusy(true)
    try {
      await closeOrder(order)
      await reloadOrder()
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Spinner />
  if (!table) return <div className="text-gray-400">Mesa não encontrada. <Link className="text-brand" to="/app/operacao">Voltar</Link></div>

  return (
    <div>
      <div className="flex items-center justify-between">
        <Link to="/app/operacao" className="text-sm text-gray-400 hover:text-gray-200">
          ← Operação
        </Link>
      </div>

      <h1 className="text-2xl font-extrabold mt-2">Mesa {table.label}</h1>

      {/* Chamadas */}
      {calls.length > 0 && (
        <div className="mt-3 space-y-2">
          {calls.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between text-sm bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-xl px-3 py-2"
            >
              <span>
                🔔 {callLabel[c.type] ?? c.type} · {timeHM(c.created_at)}
              </span>
              <button onClick={() => resolveCall(c.id)} className="text-xs px-2.5 py-1 rounded-lg bg-amber-400 text-ink font-semibold">
                Atendido
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Conta */}
      <Card className="mt-4 p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-400 uppercase tracking-wide">Total da conta</div>
          {order ? (
            <Button variant="danger" onClick={handleClose} disabled={busy}>
              Fechar conta
            </Button>
          ) : (
            <Button onClick={handleOpen} disabled={busy}>
              Abrir conta
            </Button>
          )}
        </div>
        <div className="text-3xl font-extrabold mt-1">{brl(order?.total_cents ?? 0)}</div>

        {order && items.length > 0 && (
          <div className="mt-3 divide-y divide-line border-t border-line">
            {items.map((it) => (
              <div key={it.id} className="flex items-center justify-between py-2">
                <div className="text-sm">
                  {it.quantity}x {it.product_name}
                  <span className="text-gray-500"> · {brl(it.unit_price_cents)} · {timeHM(it.created_at)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">{brl(it.line_total_cents)}</span>
                  <button
                    onClick={() => window.confirm('Remover este item?') && voidItem(it.id)}
                    className="text-xs text-rose-400 hover:text-rose-300"
                    title="Remover"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {order && items.length === 0 && (
          <div className="text-sm text-gray-500 mt-3">Conta aberta. Lance itens pelo cardápio abaixo. 👇</div>
        )}
      </Card>

      {/* Cardápio para lançar */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-2">Lançar item</h2>
        {grouped.length === 0 ? (
          <div className="text-sm text-gray-500">
            Nenhum produto disponível. Cadastre no <Link to="/app/cardapio" className="text-brand">Cardápio</Link>.
          </div>
        ) : (
          <div className="space-y-5">
            {grouped.map(({ cat, items: prods }) => (
              <div key={cat.id}>
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">{cat.name}</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {prods.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleAdd(p)}
                      disabled={busy}
                      className="text-left bg-panel border border-line rounded-xl p-3 hover:border-brand disabled:opacity-50 transition active:scale-[.98]"
                    >
                      <div className="text-sm font-medium leading-tight">{p.name}</div>
                      <div className="text-xs text-brand mt-1 font-semibold">{brl(p.price_cents)}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Link do cliente */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold text-gray-300 mb-2">Link / QR do cliente</h2>
        <Card className="p-4 flex items-center gap-4">
          <QR value={customerLink} size={96} />
          <div className="min-w-0">
            <div className="text-xs text-gray-400">O cliente abre este link para ver a conta ao vivo:</div>
            <div className="text-xs text-gray-300 break-all mt-1">{customerLink}</div>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(customerLink)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              className="mt-2 text-xs px-3 py-1.5 rounded-lg border border-line hover:bg-panel2"
            >
              {copied ? 'Copiado ✓' : 'Copiar link'}
            </button>
          </div>
        </Card>
      </section>
    </div>
  )
}
