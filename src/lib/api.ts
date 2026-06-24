import { supabase } from './supabase'
import type { CallType, Dispute, Order, Product } from './types'

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

/** Contestações de uma lista de itens (cliente e equipe). */
export async function getDisputes(orderItemIds: string[]): Promise<Dispute[]> {
  if (orderItemIds.length === 0) return []
  const { data } = await supabase
    .from('disputes')
    .select('*')
    .in('order_item_id', orderItemIds)
    .order('created_at', { ascending: false })
  return (data as Dispute[]) ?? []
}

/** Cliente abre uma contestação para um item. */
export async function createDispute(orderItemId: string, reason: string, detail: string): Promise<void> {
  const { error } = await supabase
    .from('disputes')
    .insert({ order_item_id: orderItemId, reason, detail: detail.trim() || null, status: 'open' })
  if (error) throw error
}

/** Equipe resolve a contestação. Ao aceitar, o item é anulado (sai do total). */
export async function resolveDispute(dispute: Dispute, accept: boolean): Promise<void> {
  const { error } = await supabase
    .from('disputes')
    .update({ status: accept ? 'accepted' : 'rejected', resolved_at: new Date().toISOString() })
    .eq('id', dispute.id)
  if (error) throw error
  if (accept) {
    await supabase.from('order_items').update({ status: 'voided' }).eq('id', dispute.order_item_id)
  }
}

/**
 * Onboarding controlado: cria o bar a partir de um CÓDIGO DE CONVITE válido.
 * A criação acontece numa função SECURITY DEFINER no banco (atômica e segura);
 * a inserção direta em establishments/staff é bloqueada por RLS.
 */
export async function createBarWithInvite(code: string, barName: string, ownerName: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_bar_with_invite', {
    p_code: code,
    p_bar_name: barName,
    p_owner_name: ownerName,
  })
  if (error) throw error
  return data as string
}
