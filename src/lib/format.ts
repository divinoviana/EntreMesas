export const brl = (cents: number): string =>
  ((cents ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const timeHM = (iso: string): string =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

export const callLabel: Record<string, string> = {
  service: 'Chamar garçom',
  checkout: 'Pedir a conta',
  help: 'Ajuda',
}

export const callEmoji: Record<string, string> = {
  service: '🙋',
  checkout: '💳',
  help: 'ℹ️',
}

export const disputeReasons: { value: string; label: string }[] = [
  { value: 'not_ordered', label: 'Não pedi este item' },
  { value: 'wrong_qty', label: 'Quantidade errada' },
  { value: 'wrong_price', label: 'Preço diferente' },
  { value: 'other', label: 'Outro' },
]

export const disputeReasonLabel = (v: string): string =>
  disputeReasons.find((r) => r.value === v)?.label ?? v
