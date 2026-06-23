import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { getOpenOrder } from '@/lib/api'
import { brl } from '@/lib/format'
import { Button, Card, Spinner } from '@/components/ui'
import type { Order, OrderItem } from '@/lib/types'

type Mode = 'equal' | 'byItem'

export default function SplitBill() {
  const { tableId } = useParams()
  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [mode, setMode] = useState<Mode>('equal')
  const [people, setPeople] = useState(2)
  const [picked, setPicked] = useState<Record<string, number>>({}) // itemId -> unidades minhas

  const load = useCallback(async () => {
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
    setLoading(false)
  }, [tableId])

  useEffect(() => {
    load()
  }, [load])

  // mantém a divisão atualizada se a conta mudar
  useEffect(() => {
    if (!order?.id) return
    const ch = supabase
      .channel(`split-${order.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items', filter: `order_id=eq.${order.id}` }, () => load())
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [order?.id, load])

  const total = order?.total_cents ?? 0

  const equalShares = useMemo(() => {
    const n = Math.max(1, people)
    const base = Math.floor(total / n)
    const remainder = total - base * n // centavos que sobram
    return { base, remainder, n }
  }, [total, people])

  const myItemsTotal = useMemo(
    () => items.reduce((sum, it) => sum + (picked[it.id] ?? 0) * it.unit_price_cents, 0),
    [items, picked],
  )

  function setUnits(it: OrderItem, units: number) {
    const clamped = Math.max(0, Math.min(it.quantity, units))
    setPicked((p) => ({ ...p, [it.id]: clamped }))
  }

  if (loading) return <Spinner label="Carregando a conta…" />

  if (!order || total === 0) {
    return (
      <div className="min-h-full max-w-md mx-auto px-4 py-6">
        <Header tableId={tableId} />
        <Card className="p-6 text-center text-gray-400 text-sm mt-6">
          Ainda não há consumo para dividir nesta mesa.
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-full max-w-md mx-auto px-4 py-6 pb-10">
      <Header tableId={tableId} />

      <Card className="p-5 mt-4">
        <div className="text-xs text-gray-400 uppercase tracking-wide">Total da mesa</div>
        <div className="text-3xl font-extrabold mt-1">{brl(total)}</div>
      </Card>

      {/* modo */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => setMode('equal')}
          className={`flex-1 py-2 rounded-lg text-sm border ${mode === 'equal' ? 'bg-brand text-ink border-brand font-semibold' : 'border-line'}`}
        >
          Igualmente
        </button>
        <button
          onClick={() => setMode('byItem')}
          className={`flex-1 py-2 rounded-lg text-sm border ${mode === 'byItem' ? 'bg-brand text-ink border-brand font-semibold' : 'border-line'}`}
        >
          Por item
        </button>
      </div>

      {mode === 'equal' ? (
        <Card className="p-5 mt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Quantas pessoas?</span>
            <div className="flex items-center gap-3">
              <button onClick={() => setPeople((n) => Math.max(1, n - 1))} className="w-9 h-9 rounded-lg border border-line text-lg">
                −
              </button>
              <span className="w-6 text-center font-bold">{people}</span>
              <button onClick={() => setPeople((n) => n + 1)} className="w-9 h-9 rounded-lg border border-line text-lg">
                +
              </button>
            </div>
          </div>
          <div className="mt-5 text-center">
            <div className="text-xs text-gray-400 uppercase tracking-wide">Cada pessoa paga</div>
            <div className="text-4xl font-extrabold mt-1 text-brand">{brl(equalShares.base + (equalShares.remainder > 0 ? 1 : 0))}</div>
            {equalShares.remainder > 0 && (
              <div className="text-xs text-gray-500 mt-2">
                {equalShares.remainder} pessoa(s) pagam {brl(equalShares.base + 1)} e o restante {brl(equalShares.base)} (acerto dos centavos).
              </div>
            )}
          </div>
        </Card>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-gray-400 mb-2">Marque quantas unidades de cada item são suas:</p>
          <Card className="divide-y divide-line">
            {items.map((it) => {
              const units = picked[it.id] ?? 0
              return (
                <div key={it.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{it.product_name}</div>
                    <div className="text-xs text-gray-500">
                      {brl(it.unit_price_cents)} · {it.quantity} no total
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setUnits(it, units - 1)} className="w-8 h-8 rounded-lg border border-line">
                      −
                    </button>
                    <span className="w-5 text-center text-sm">{units}</span>
                    <button onClick={() => setUnits(it, units + 1)} className="w-8 h-8 rounded-lg border border-line">
                      +
                    </button>
                  </div>
                </div>
              )
            })}
          </Card>
          <div className="mt-4 text-center">
            <div className="text-xs text-gray-400 uppercase tracking-wide">Sua parte</div>
            <div className="text-4xl font-extrabold mt-1 text-brand">{brl(myItemsTotal)}</div>
          </div>
        </div>
      )}

      <div className="mt-6 text-center text-xs text-gray-500">
        💡 Esta é uma calculadora para combinar a divisão. O pagamento é feito no caixa.
      </div>
      <Link to={`/t/${tableId}`} className="block text-center text-sm text-brand mt-4">
        ← Voltar para a conta
      </Link>
    </div>
  )
}

function Header({ tableId }: { tableId?: string }) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-xl font-extrabold">➗ Dividir a conta</h1>
      <Link to={`/t/${tableId}`} className="text-xs text-gray-400 hover:text-gray-200">
        🧾 Conta
      </Link>
    </div>
  )
}
