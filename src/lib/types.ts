export interface Establishment {
  id: string
  name: string
  status?: string
}

export interface TableRow {
  id: string
  establishment_id: string
  label: string
  zone?: string | null
  capacity?: number | null
  status: string // free | occupied | reserved | disabled
}

export interface Category {
  id: string
  establishment_id: string
  name: string
  sort_order: number
}

export interface Product {
  id: string
  establishment_id: string
  category_id: string | null
  name: string
  description?: string | null
  price_cents: number
  is_available: boolean
}

export interface Order {
  id: string
  establishment_id: string
  table_id: string
  status: string // open | closing | paid | canceled
  total_cents: number
  opened_at: string
  closed_at?: string | null
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  product_name: string
  quantity: number
  unit_price_cents: number
  line_total_cents: number
  status: string // active | disputed | voided
  created_at: string
}

export interface WaiterCall {
  id: string
  table_id: string
  type: string // service | checkout | help
  status: string // pending | enroute | done
  priority: number
  created_at: string
  handled_at?: string | null
}

export interface Staff {
  id: string
  establishment_id: string
  name: string
  role: string // owner | manager | waiter | cashier
  user_id: string | null
  is_active: boolean
}

export type CallType = 'service' | 'checkout' | 'help'
