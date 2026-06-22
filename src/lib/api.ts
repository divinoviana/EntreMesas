import { supabase } from './supabase'
import type { Order, Product, CallType } from './types'

/** Conta aberta (ou em fechamento) de uma mesa, se houver. */
export async function getOpenOrder(tableId: string): Promise<Order | null> {
  const { data } = await supabase
    .from('orders')
    .select('*')
    .eq('table_id', tableId)
    .in('status', ['open', 'closing'])
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as Order) ?? null
}

/** Garante uma conta aberta para a mesa (cria se não existir). Uso: equipe. */
export async function ensureOpenOrder(tableId: string, establishmentId: string): Promise<Order> {
  const existing = await getOpenOrder(tableId)
  if (existing) return existing
  const { data, error } = await supabase
    .from('orders')
    .insert({ table_id: tableId, establishment_id: establishmentId, status: 'open' })
    .select('*')
    .single()
  if (error) throw error
  await supabase.from('tables').update({ status: 'occupied' }).eq('id', tableId)
  return data as Order
}

/** Lança um item na conta. O total é recalculado por trigger no banco. */
export async function addItem(order: Order, product: Product, qty = 1): Promise<void> {
  const line = product.price_cents * qty
  const { error } = await supabase.from('order_items').insert({
    order_id: order.id,
    product_id: product.id,
    product_name: product.name,
    quantity: qty,
    unit_price_cents: product.price_cents,
    line_total_cents: line,
    status: 'active',
  })
  if (error) throw error
}

/** Anula (void) um item lançado. */
export async function voidItem(itemId: string): Promise<void> {
  const { error } = await supabase.from('order_items').update({ status: 'voided' }).eq('id', itemId)
  if (error) throw error
}

/** Fecha a conta da mesa e libera a mesa. */
export async function closeOrder(order: Order): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ status: 'paid', closed_at: new Date().toISOString() })
    .eq('id', order.id)
  if (error) throw error
  await supabase.from('tables').update({ status: 'free' }).eq('id', order.table_id)
}

/** Cliente chama o garçom / pede a conta. */
export async function createWaiterCall(tableId: string, type: CallType): Promise<void> {
  const priority = type === 'checkout' ? 2 : type === 'help' ? 1 : 0
  const { error } = await supabase
    .from('waiter_calls')
    .insert({ table_id: tableId, type, status: 'pending', priority })
  if (error) throw error
}

export async function resolveCall(callId: string): Promise<void> {
  const { error } = await supabase
    .from('waiter_calls')
    .update({ status: 'done', handled_at: new Date().toISOString() })
    .eq('id', callId)
  if (error) throw error
}

/**
 * Onboarding: cria o estabelecimento, o staff (owner) e dados de exemplo
 * (cardápio + mesas) para o bar ficar utilizável na hora.
 */
export async function createBarWithDefaults(userId: string, ownerName: string, barName: string) {
  const { data: est, error: e1 } = await supabase
    .from('establishments')
    .insert({ name: barName })
    .select('*')
    .single()
  if (e1) throw e1

  const { error: e2 } = await supabase.from('staff').insert({
    establishment_id: est.id,
    name: ownerName || 'Responsável',
    role: 'owner',
    user_id: userId,
    is_active: true,
  })
  if (e2) throw e2

  const cats: { name: string; items: [string, number][] }[] = [
    { name: 'Cervejas', items: [['Heineken 600ml', 1900], ['Original 600ml', 1700], ['Chopp Pilsen', 1200]] },
    { name: 'Drinks', items: [['Caipirinha', 1900], ['Gin Tônica', 2600]] },
    { name: 'Porções', items: [['Batata Frita', 3500], ['Calabresa Acebolada', 3900], ['Mandioca Frita', 3200]] },
    { name: 'Não Alcoólicos', items: [['Refrigerante', 800], ['Água', 500], ['Suco Natural', 1200]] },
  ]
  for (let i = 0; i < cats.length; i++) {
    const { data: cat } = await supabase
      .from('product_categories')
      .insert({ establishment_id: est.id, name: cats[i].name, sort_order: i })
      .select('*')
      .single()
    if (cat) {
      const rows = cats[i].items.map(([name, price]) => ({
        establishment_id: est.id,
        category_id: cat.id,
        name,
        price_cents: price,
        is_available: true,
      }))
      await supabase.from('products').insert(rows)
    }
  }

  const tableRows = Array.from({ length: 8 }, (_, i) => ({
    establishment_id: est.id,
    label: String(i + 1).padStart(2, '0'),
    status: 'free',
  }))
  await supabase.from('tables').insert(tableRows)

  return est
}
