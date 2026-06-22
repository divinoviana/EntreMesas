// Vercel Serverless Function — moderação de mensagens do Social Bar por IA.
// Roda SOMENTE no servidor (a ANTHROPIC_API_KEY nunca vai ao navegador).
// Usa o SDK oficial da Anthropic. Em dev local (vite) esta rota não existe;
// o cliente usa a moderação heurística como fallback.
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic() // lê ANTHROPIC_API_KEY do ambiente

const SYSTEM = `Você é um moderador de um chat anônimo entre pessoas presentes num bar (Social Bar).
Avalie a MENSAGEM do usuário e decida se deve ser bloqueada.
Bloqueie se contiver: assédio, discurso de ódio, conteúdo sexual explícito, ameaças/violência,
spam/golpe, ou tentativa de trocar contato pessoal (telefone, e-mail, @, links, redes sociais) —
a regra do produto é manter o anonimato. Mensagens normais de paquera, amizade e networking são permitidas.
Responda APENAS com uma palavra na primeira linha: "ALLOW" se estiver tudo bem, ou "BLOCK" se deve ser bloqueada.
Não escreva mais nada.`

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }
  // Sem chave configurada → não bloqueia (a heurística do cliente é a trava dura)
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(200).json({ allowed: true, source: 'no_key' })
    return
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {})
    const text: string = (body.text ?? '').toString()
    if (!text.trim()) {
      res.status(400).json({ error: 'text_required' })
      return
    }

    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 16,
      system: SYSTEM,
      messages: [{ role: 'user', content: `MENSAGEM: ${text.slice(0, 1000)}` }],
    })

    if (response.stop_reason === 'refusal') {
      res.status(200).json({ allowed: false, source: 'ai' })
      return
    }
    const out = response.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join(' ')
      .trim()
      .toUpperCase()
    const blocked = out.startsWith('BLOCK')
    res.status(200).json({ allowed: !blocked, source: 'ai' })
  } catch {
    // Falha de IA não derruba o chat: a heurística do cliente já filtrou o pior
    res.status(200).json({ allowed: true, source: 'error' })
  }
}
