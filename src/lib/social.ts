import { supabase } from './supabase'
import { moderateMessage } from './moderation'
import type { Conversation, Message, SocialProfile, SocialStatus } from './types'

export const STATUS_META: Record<SocialStatus, { emoji: string; label: string }> = {
  serious: { emoji: '💚', label: 'Relacionamento sério' },
  flirt: { emoji: '❤️', label: 'Paquera' },
  casual: { emoji: '🔥', label: 'Algo casual' },
  friends: { emoji: '🤝', label: 'Amizades' },
  night: { emoji: '🎉', label: 'Curtindo a noite' },
  unavailable: { emoji: '🚫', label: 'Indisponível' },
}

const PROFILE_TTL_HOURS = 6

/** Garante uma sessão (anônima) para o Social Bar. */
export async function ensureAnonAuth(): Promise<{ userId: string | null; error?: string }> {
  const { data } = await supabase.auth.getSession()
  if (data.session?.user) return { userId: data.session.user.id }
  const { data: anon, error } = await supabase.auth.signInAnonymously()
  if (error) return { userId: null, error: error.message }
  return { userId: anon.user?.id ?? null }
}

export async function getMyProfile(establishmentId: string): Promise<SocialProfile | null> {
  const { data: u } = await supabase.auth.getUser()
  if (!u.user) return null
  const { data } = await supabase
    .from('social_profiles')
    .select('*')
    .eq('establishment_id', establishmentId)
    .eq('user_id', u.user.id)
    .maybeSingle()
  return (data as SocialProfile) ?? null
}

export async function upsertProfile(p: {
  establishmentId: string
  tableId: string | null
  nickname: string
  ageRange: string
  bio: string
  interests: string[]
  status: SocialStatus
}): Promise<SocialProfile> {
  const { data: u } = await supabase.auth.getUser()
  if (!u.user) throw new Error('Sessão não encontrada')
  const expires = new Date(Date.now() + PROFILE_TTL_HOURS * 3600 * 1000).toISOString()
  const row = {
    user_id: u.user.id,
    establishment_id: p.establishmentId,
    table_id: p.tableId,
    nickname: p.nickname.trim(),
    age_range: p.ageRange,
    bio: p.bio.trim() || null,
    interests: p.interests,
    status: p.status,
    visible: p.status !== 'unavailable',
    expires_at: expires,
  }
  const { data, error } = await supabase
    .from('social_profiles')
    .upsert(row, { onConflict: 'user_id,establishment_id' })
    .select('*')
    .single()
  if (error) throw error
  return data as SocialProfile
}

export async function setStatus(profileId: string, status: SocialStatus): Promise<void> {
  const { error } = await supabase
    .from('social_profiles')
    .update({ status, visible: status !== 'unavailable' })
    .eq('id', profileId)
  if (error) throw error
}

export async function leaveSocial(profileId: string): Promise<void> {
  await supabase.from('social_profiles').delete().eq('id', profileId)
}

/** Mapa: perfis visíveis (e não expirados) do estabelecimento, exceto o meu. */
export async function getMap(establishmentId: string, myProfileId: string): Promise<SocialProfile[]> {
  const { data } = await supabase
    .from('social_profiles')
    .select('*')
    .eq('establishment_id', establishmentId)
    .eq('visible', true)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
  return ((data as SocialProfile[]) ?? []).filter((p) => p.id !== myProfileId)
}

export async function sendInvite(
  establishmentId: string,
  myProfileId: string,
  targetProfileId: string,
): Promise<Conversation> {
  // Reaproveita conversa existente entre os dois (em qualquer direção)
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .or(
      `and(profile_a.eq.${myProfileId},profile_b.eq.${targetProfileId}),and(profile_a.eq.${targetProfileId},profile_b.eq.${myProfileId})`,
    )
    .maybeSingle()
  if (existing) return existing as Conversation

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      establishment_id: establishmentId,
      profile_a: myProfileId,
      profile_b: targetProfileId,
      status: 'pending',
    })
    .select('*')
    .single()
  if (error) throw error
  return data as Conversation
}

export async function respondInvite(conversationId: string, accept: boolean): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .update({ status: accept ? 'open' : 'declined' })
    .eq('id', conversationId)
  if (error) throw error
}

export async function listConversations(myProfileId: string): Promise<Conversation[]> {
  const { data } = await supabase
    .from('conversations')
    .select('*')
    .or(`profile_a.eq.${myProfileId},profile_b.eq.${myProfileId}`)
    .neq('status', 'declined')
    .order('created_at', { ascending: false })
  return (data as Conversation[]) ?? []
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at')
  return (data as Message[]) ?? []
}

/** Envia mensagem após moderação (heurística + IA). Lança erro com motivo se bloqueada. */
export async function sendMessage(conversationId: string, myProfileId: string, text: string): Promise<void> {
  const verdict = await moderateMessage(text)
  if (!verdict.allowed) throw new Error(verdict.reason || 'Mensagem bloqueada.')
  const { error } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_profile: myProfileId,
    body: text.trim(),
    moderation_status: 'approved',
  })
  if (error) throw error
}

export async function blockUser(targetUserId: string): Promise<void> {
  const { data: u } = await supabase.auth.getUser()
  if (!u.user || !targetUserId) return
  await supabase.from('blocks').insert({ blocker_user: u.user.id, blocked_user: targetUserId })
}

export async function reportUser(establishmentId: string, targetUserId: string | null, detail: string): Promise<void> {
  const { data: u } = await supabase.auth.getUser()
  if (!u.user) return
  await supabase.from('reports').insert({
    establishment_id: establishmentId,
    reporter_user: u.user.id,
    target_user: targetUserId,
    category: 'other',
    detail,
    status: 'open',
  })
}
