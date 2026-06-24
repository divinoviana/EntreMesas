// Base pública para os links/QR do cliente.
// Se VITE_PUBLIC_BASE_URL estiver definida (recomendado em produção), usa-a —
// assim o QR aponta sempre para o domínio de produção, mesmo que a equipe
// gere o QR a partir de uma URL de preview/deployment do Vercel.
export function publicBaseUrl(): string {
  const env = import.meta.env.VITE_PUBLIC_BASE_URL as string | undefined
  const base = env && env.trim() ? env.trim() : window.location.origin
  return base.replace(/\/+$/, '')
}

export function tableLink(tableId: string): string {
  return `${publicBaseUrl()}/t/${tableId}`
}
