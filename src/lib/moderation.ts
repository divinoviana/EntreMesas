// Moderação de mensagens do Social Bar.
// Camada 1 (sempre): heurística no cliente — bloqueia contato pessoal e termos graves.
// Camada 2 (quando publicado na Vercel): IA via /api/moderate. Se indisponível,
// usa o veredito da heurística (fail-safe).

export interface ModerationResult {
  allowed: boolean
  reason?: string
}

// Telefone, e-mail, @handle, links, redes — fere o anonimato do produto
const CONTACT_PATTERNS: RegExp[] = [
  /(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[\s.-]?\d{4}/, // telefone BR
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i, // e-mail
  /\b(?:https?:\/\/|www\.)\S+/i, // links
  /\b(?:instagram|insta|whats|whatsapp|zap|telegram|tiktok|snap(?:chat)?|face(?:book)?)\b/i,
  /(?<![a-z0-9])@[a-z0-9._]{2,}/i, // @handle
]

const HARD_TERMS: RegExp[] = [
  // lista mínima de termos graves (assédio/ódio explícitos). Expandir conforme política.
  /\b(vadia|piranha|viado|bicha|macaco|retardad[oa]|estupr)/i,
]

export function heuristicModerate(text: string): ModerationResult {
  const t = (text ?? '').trim()
  if (!t) return { allowed: false, reason: 'Mensagem vazia.' }
  if (t.length > 1000) return { allowed: false, reason: 'Mensagem muito longa.' }
  for (const re of CONTACT_PATTERNS) {
    if (re.test(t)) {
      return {
        allowed: false,
        reason: 'Para sua segurança, não é permitido trocar telefone, redes ou links aqui. 🙂',
      }
    }
  }
  for (const re of HARD_TERMS) {
    if (re.test(t)) return { allowed: false, reason: 'Mensagem bloqueada pelas regras da comunidade.' }
  }
  return { allowed: true }
}

export async function moderateMessage(text: string): Promise<ModerationResult> {
  // 1) heurística (trava dura, instantânea)
  const local = heuristicModerate(text)
  if (!local.allowed) return local

  // 2) IA (best-effort). Em dev local /api/moderate não existe → cai no catch.
  try {
    const res = await fetch('/api/moderate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) return local
    const data = await res.json()
    if (data && data.allowed === false) {
      return { allowed: false, reason: 'Mensagem bloqueada pela moderação. Vamos manter o respeito. 🙏' }
    }
    return { allowed: true }
  } catch {
    return local // IA indisponível → vale a heurística (que já passou)
  }
}
