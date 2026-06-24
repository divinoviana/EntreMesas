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

export interface Dispute {
  id: string
  order_item_id: string
  reason: string // not_ordered | wrong_qty | wrong_price | other
  detail: string | null
  status: string // open | accepted | rejected
  created_at: string
  resolved_at?: string | null
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

export type SocialStatus = 'serious' | 'flirt' | 'casual' | 'friends' | 'night' | 'unavailable'

export interface SocialProfile {
  id: string
  user_id: string | null
  establishment_id: string
  table_id: string | null
  nickname: string
  photo_url: string | null
  age_range: string
  bio: string | null
  interests: string[]
  status: SocialStatus
  visible: boolean
  created_at: string
  expires_at: string
}

export interface Conversation {
  id: string
  establishment_id: string
  profile_a: string
  profile_b: string
  status: string // pending | open | declined | closed
  created_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_profile: string
  body: string | null
  moderation_status: string
  created_at: string
}
