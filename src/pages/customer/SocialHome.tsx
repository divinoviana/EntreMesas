import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  STATUS_META,
  blockUser,
  ensureAnonAuth,
  getMap,
  getMessages,
  getMyProfile,
  leaveSocial,
  listConversations,
  reportUser,
  respondInvite,
  sendInvite,
  sendMessage,
  setStatus,
  upsertProfile,
} from '@/lib/social'
import { timeHM } from '@/lib/format'
import { Button, Spinner } from '@/components/ui'
import type { Conversation, Establishment, Message, SocialProfile, SocialStatus, TableRow } from '@/lib/types'

const AGE_RANGES = ['18-24', '25-34', '35-44', '45+']
const INTEREST_OPTIONS = ['música', 'dança', 'esportes', 'viagem', 'jogos', 'cinema', 'gastronomia', 'arte', 'tech', 'pets']
const STATUS_ORDER: SocialStatus[] = ['serious', 'flirt', 'casual', 'friends', 'night', 'unavailable']

export default function SocialHome() {
  const { tableId } = useParams()
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [table, setTable] = useState<TableRow | null>(null)
  const [est, setEst] = useState<Establishment | null>(null)
  const [profile, setProfile] = useState<SocialProfile | null>(null)
  const [tableLabels, setTableLabels] = useState<Record<string, string>>({})

  // form
  const [nickname, setNickname] = useState('')
  const [ageRange, setAgeRange] = useState(AGE_RANGES[1])
  const [bio, setBio] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [status, setStatusSel] = useState<SocialStatus>('friends')
  const [saving, setSaving] = useState(false)

  // social state
  const [mapProfiles, setMapProfiles] = useState<SocialProfile[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selected, setSelected] = useState<{ conv: Conversation; other: SocialProfile | null } | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement | null>(null)

  const flash = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(null), 3500)
  }

  const reloadSocial = useCallback(async () => {
    if (!est || !profile) return
    const [m, c] = await Promise.all([getMap(est.id, profile.id), listConversations(profile.id)])
    setMapProfiles(m)
    setConversations(c)
  }, [est, profile])

  // init
  useEffect(() => {
    let alive = true
    async function init() {
      if (!tableId) return
      const { data: t } = await supabase.from('tables').select('*').eq('id', tableId).maybeSingle()
      if (!alive) return
      setTable((t as TableRow) ?? null)
      if (!t) {
        setLoading(false)
        return
      }
      const estId = (t as TableRow).establishment_id
      const { data: e } = await supabase.from('establishments').select('*').eq('id', estId).maybeSingle()
      setEst((e as Establishment) ?? null)
      const { data: tbls } = await supabase.from('tables').select('id,label').eq('establishment_id', estId)
      const labels: Record<string, string> = {}
      ;(tbls ?? []).forEach((r: any) => (labels[r.id] = r.label))
      setTableLabels(labels)

      const { error } = await ensureAnonAuth()
      if (error) {
        setAuthError(error)
        setLoading(false)
        return
      }
      const mine = await getMyProfile(estId)
      setProfile(mine)
      if (mine) setStatusSel(mine.status)
      setLoading(false)
    }
    init()
    return () => {
      alive = false
    }
  }, [tableId])

  useEffect(() => {
    reloadSocial()
  }, [reloadSocial])

  // realtime: mapa + conversas
  useEffect(() => {
    if (!est || !profile) return
    const ch = supabase
      .channel(`social-${est.id}-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'social_profiles', filter: `establishment_id=eq.${est.id}` }, () => reloadSocial())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `establishment_id=eq.${est.id}` }, () => reloadSocial())
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [est, profile, reloadSocial])

  // realtime: mensagens da conversa aberta
  const loadMessages = useCallback(async (convId: string) => {
    const m = await getMessages(convId)
    setMessages(m)
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [])

  useEffect(() => {
    if (!selected) return
    loadMessages(selected.conv.id)
    const ch = supabase
      .channel(`chat-${selected.conv.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selected.conv.id}` }, () => loadMessages(selected.conv.id))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `id=eq.${selected.conv.id}` }, () => reloadSocial())
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [selected, loadMessages, reloadSocial])

  // ---- ações ----
  async function createProfile(e: FormEvent) {
    e.preventDefault()
    if (!est || !nickname.trim()) return
    setSaving(true)
    try {
      const p = await upsertProfile({
        establishmentId: est.id,
        tableId: tableId ?? null,
        nickname,
        ageRange,
        bio,
        interests,
        status,
      })
      setProfile(p)
    } catch (err: any) {
      flash(err?.message || 'Erro ao criar perfil')
    } finally {
      setSaving(false)
    }
  }

  async function changeStatus(s: SocialStatus) {
    if (!profile) return
    setStatusSel(s)
    await setStatus(profile.id, s)
    setProfile({ ...profile, status: s, visible: s !== 'unavailable' })
    reloadSocial()
  }

  function profileById(id: string): SocialProfile | null {
    if (profile && id === profile.id) return profile
    return mapProfiles.find((p) => p.id === id) ?? null
  }

  async function openConversation(conv: Conversation) {
    const otherId = conv.profile_a === profile?.id ? conv.profile_b : conv.profile_a
    let other = profileById(otherId)
    if (!other) {
      const { data } = await supabase.from('social_profiles').select('*').eq('id', otherId).maybeSingle()
      other = (data as SocialProfile) ?? null
    }
    setSelected({ conv, other })
  }

  async function invite(target: SocialProfile) {
    if (!est || !profile) return
    try {
      const conv = await sendInvite(est.id, profile.id, target.id)
      flash('Convite enviado! 💬')
      await reloadSocial()
      setSelected({ conv, other: target })
    } catch (err: any) {
      flash(err?.message || 'Não foi possível convidar')
    }
  }

  async function send() {
    if (!selected || !profile || !draft.trim()) return
    const text = draft
    setDraft('')
    try {
      await sendMessage(selected.conv.id, profile.id, text)
    } catch (err: any) {
      setDraft(text)
      flash(err?.message || 'Mensagem bloqueada')
    }
  }

  async function block() {
    if (!selected?.other?.user_id) return
    await blockUser(selected.other.user_id)
    flash('Usuário bloqueado.')
    setSelected(null)
    reloadSocial()
  }

  async function report() {
    if (!est || !selected) return
    await reportUser(est.id, selected.other?.user_id ?? null, 'Denúncia via chat')
    flash('Denúncia enviada. Obrigado por avisar.')
  }

  async function exitSocial() {
    if (!profile) return
    if (!window.confirm('Sair do Social Bar? Seu perfil e conversas serão encerrados.')) return
    await leaveSocial(profile.id)
    setProfile(null)
    setSelected(null)
  }

  // ---- render ----
  if (loading) return <Spinner label="Entrando no Social Bar…" />

  if (!table)
    return <div className="min-h-full grid place-items-center p-6 text-gray-400">Mesa não encontrada.</div>

  if (authError)
    return (
      <div className="min-h-full grid place-items-center p-6 text-center">
        <div className="max-w-sm">
          <div className="text-3xl">🔒</div>
          <p className="text-gray-200 mt-3 font-semibold">Social Bar indisponível</p>
          <p className="text-gray-500 text-sm mt-1">
            Habilite <b>Anonymous sign-ins</b> no Supabase (Authentication → Providers) para ativar o Social Bar.
          </p>
          <Link to={`/t/${tableId}`} className="inline-block mt-4 text-brand text-sm">
            ← Voltar para a conta
          </Link>
        </div>
      </div>
    )

  const header = (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm text-gray-400">{est?.name}</div>
        <h1 className="text-xl font-extrabold">💞 Social Bar</h1>
      </div>
      <Link to={`/t/${tableId}`} className="text-xs text-gray-400 hover:text-gray-200">
        🧾 Minha conta
      </Link>
    </div>
  )

  // 1) Criar perfil
  if (!profile) {
    return (
      <div className="min-h-full max-w-md mx-auto px-4 py-6">
        {header}
        <p className="text-gray-400 text-sm mt-3">
          Crie um perfil <b>anônimo e temporário</b> para conhecer quem está no bar. Ninguém vê seu telefone.
        </p>
        <form onSubmit={createProfile} className="mt-5 space-y-4">
          <div>
            <label className="text-xs text-gray-400">Apelido</label>
            <input
              required
              maxLength={20}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Como querem te chamar?"
              className="mt-1 w-full px-3 py-2.5 rounded-lg bg-panel border border-line outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Faixa etária</label>
            <div className="flex gap-2 mt-1">
              {AGE_RANGES.map((a) => (
                <button
                  type="button"
                  key={a}
                  onClick={() => setAgeRange(a)}
                  className={`px-3 py-1.5 rounded-lg text-sm border ${ageRange === a ? 'bg-brand text-ink border-brand font-semibold' : 'border-line'}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400">Seu status</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {STATUS_ORDER.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setStatusSel(s)}
                  className={`px-3 py-2 rounded-lg text-sm text-left border ${status === s ? 'bg-brand/15 border-brand text-emerald-200' : 'border-line'}`}
                >
                  {STATUS_META[s].emoji} {STATUS_META[s].label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400">Interesses</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {INTEREST_OPTIONS.map((i) => {
                const on = interests.includes(i)
                return (
                  <button
                    type="button"
                    key={i}
                    onClick={() => setInterests(on ? interests.filter((x) => x !== i) : [...interests, i])}
                    className={`px-3 py-1.5 rounded-full text-sm border ${on ? 'bg-brand text-ink border-brand font-semibold' : 'border-line'}`}
                  >
                    {i}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400">Bio (curta)</label>
            <input
              maxLength={80}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Aqui pra rir e dançar 🕺"
              className="mt-1 w-full px-3 py-2.5 rounded-lg bg-panel border border-line outline-none focus:border-brand"
            />
          </div>
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? 'Entrando…' : 'Entrar no Social Bar'}
          </Button>
          <p className="text-xs text-gray-500 text-center">🔒 Telefone, e-mail e nome real nunca são exibidos.</p>
        </form>
        {toast && <Toast text={toast} />}
      </div>
    )
  }

  // 2) Chat aberto
  if (selected) {
    const other = selected.other
    const pending = selected.conv.status === 'pending'
    const iAmTarget = selected.conv.profile_b === profile.id
    return (
      <div className="min-h-full max-w-md mx-auto flex flex-col" style={{ height: '100dvh' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <button onClick={() => setSelected(null)} className="text-sm text-gray-300">
            ← Voltar
          </button>
          <div className="font-semibold text-sm">
            {other ? `${other.nickname} ${STATUS_META[other.status]?.emoji ?? ''}` : 'Usuário'}
          </div>
          <div className="flex gap-3 text-xs">
            <button onClick={block} className="text-gray-400 hover:text-rose-300" title="Bloquear">
              🚫
            </button>
            <button onClick={report} className="text-gray-400 hover:text-amber-300" title="Denunciar">
              🚩
            </button>
          </div>
        </div>

        {pending && iAmTarget && (
          <div className="m-3 p-3 rounded-xl bg-panel border border-line text-sm">
            <b>{other?.nickname ?? 'Alguém'}</b> quer conversar.
            <div className="flex gap-2 mt-2">
              <Button onClick={() => respondInvite(selected.conv.id, true).then(reloadSocial)}>Aceitar</Button>
              <Button variant="ghost" onClick={() => respondInvite(selected.conv.id, false).then(() => setSelected(null))}>
                Recusar
              </Button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto px-3 py-3 space-y-2">
          {messages.length === 0 && (
            <div className="text-center text-xs text-gray-500 mt-6">
              Diga oi 👋 — sem trocar contato. As mensagens somem ao sair do bar.
            </div>
          )}
          {messages.map((m) => {
            const mine = m.sender_profile === profile.id
            return (
              <div key={m.id} className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? 'ml-auto bg-brand text-ink' : 'bg-panel border border-line'}`}>
                {m.body}
                <div className={`text-[10px] mt-0.5 ${mine ? 'text-ink/60' : 'text-gray-500'}`}>{timeHM(m.created_at)}</div>
              </div>
            )
          })}
          <div ref={chatEndRef} />
        </div>

        {(!pending || !iAmTarget) && (
          <div className="border-t border-line p-3 flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={pending ? 'Aguardando aceite…' : 'Mensagem…'}
              className="flex-1 px-3 py-2 rounded-lg bg-panel border border-line outline-none focus:border-brand text-sm"
            />
            <Button onClick={send} disabled={!draft.trim()}>
              ➤
            </Button>
          </div>
        )}
        {toast && <Toast text={toast} />}
      </div>
    )
  }

  // 3) Mapa + status + conversas
  const byTable = groupByTable(mapProfiles)
  const pendingForMe = conversations.filter((c) => c.status === 'pending' && c.profile_b === profile.id)
  const activeConvs = conversations.filter((c) => c.status === 'open' || (c.status === 'pending' && c.profile_a === profile.id))

  return (
    <div className="min-h-full max-w-md mx-auto px-4 py-6 pb-10">
      {header}

      {/* meu status */}
      <div className="mt-4">
        <div className="text-xs text-gray-400 mb-1">Seu status</div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              onClick={() => changeStatus(s)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm border ${status === s ? 'bg-brand text-ink border-brand font-semibold' : 'border-line text-gray-300'}`}
            >
              {STATUS_META[s].emoji} {STATUS_META[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* convites recebidos */}
      {pendingForMe.length > 0 && (
        <div className="mt-5">
          <div className="text-sm font-semibold text-gray-200 mb-2">🔔 Convites</div>
          <div className="space-y-2">
            {pendingForMe.map((c) => (
              <button key={c.id} onClick={() => openConversation(c)} className="w-full text-left bg-panel border border-brand/40 rounded-xl p-3 text-sm">
                Alguém quer conversar — toque para ver
              </button>
            ))}
          </div>
        </div>
      )}

      {/* conversas */}
      {activeConvs.length > 0 && (
        <div className="mt-5">
          <div className="text-sm font-semibold text-gray-200 mb-2">💬 Conversas</div>
          <div className="space-y-2">
            {activeConvs.map((c) => {
              const otherId = c.profile_a === profile.id ? c.profile_b : c.profile_a
              const other = profileById(otherId)
              return (
                <button key={c.id} onClick={() => openConversation(c)} className="w-full text-left bg-panel border border-line rounded-xl p-3 text-sm flex justify-between">
                  <span>{other ? `${other.nickname} ${STATUS_META[other.status]?.emoji ?? ''}` : 'Conversa'}</span>
                  <span className="text-xs text-gray-500">{c.status === 'pending' ? 'enviado' : 'aberta'}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* mapa */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold text-gray-200">🗺️ Quem está no bar</div>
          <span className="text-xs text-gray-500">{mapProfiles.length} pessoas</span>
        </div>
        {mapProfiles.length === 0 ? (
          <div className="bg-panel border border-line rounded-2xl p-5 text-center text-sm text-gray-500">
            Ninguém mais por aqui ainda. Volte em instantes! ✨
          </div>
        ) : (
          <div className="space-y-4">
            {byTable.map(({ tableKey, people }) => (
              <div key={tableKey}>
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                  {tableKey === 'none' ? 'No bar' : `Mesa ${tableLabels[tableKey] ?? '?'}`}
                </div>
                <div className="space-y-2">
                  {people.map((p) => (
                    <div key={p.id} className="bg-panel border border-line rounded-xl p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {p.nickname} <span title={STATUS_META[p.status]?.label}>{STATUS_META[p.status]?.emoji}</span>
                          <span className="text-gray-500 text-xs"> · {p.age_range}</span>
                        </div>
                        {p.bio && <div className="text-xs text-gray-500 truncate">{p.bio}</div>}
                        {p.interests?.length > 0 && (
                          <div className="text-[11px] text-gray-600 truncate">{p.interests.join(' · ')}</div>
                        )}
                      </div>
                      <Button onClick={() => invite(p)} className="shrink-0">
                        💬
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={exitSocial} className="block mx-auto mt-8 text-xs text-gray-600 hover:text-rose-300">
        Sair do Social Bar
      </button>
      {toast && <Toast text={toast} />}
    </div>
  )
}

function Toast({ text }: { text: string }) {
  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-30 bg-emerald-500 text-ink text-sm font-semibold px-4 py-2 rounded-xl shadow-lg">
      {text}
    </div>
  )
}

function groupByTable(profiles: SocialProfile[]): { tableKey: string; people: SocialProfile[] }[] {
  const groups: Record<string, SocialProfile[]> = {}
  for (const p of profiles) {
    const key = p.table_id ?? 'none'
    ;(groups[key] ??= []).push(p)
  }
  return Object.entries(groups).map(([tableKey, people]) => ({ tableKey, people }))
}
