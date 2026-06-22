import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Button, Card, Empty, Spinner } from '@/components/ui'
import { QR, printTableQR } from '@/components/QR'
import type { TableRow } from '@/lib/types'

export default function MesasAdmin() {
  const { establishment } = useAuth()
  const estId = establishment?.id
  const [loading, setLoading] = useState(true)
  const [tables, setTables] = useState<TableRow[]>([])
  const [label, setLabel] = useState('')
  const [zone, setZone] = useState('')
  const [selected, setSelected] = useState<TableRow | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!estId) return
    const { data } = await supabase.from('tables').select('*').eq('establishment_id', estId).order('label')
    setTables((data as TableRow[]) ?? [])
    setLoading(false)
  }, [estId])

  useEffect(() => {
    load()
  }, [load])

  async function addTable(e: FormEvent) {
    e.preventDefault()
    if (!estId || !label.trim()) return
    const { error } = await supabase
      .from('tables')
      .insert({ establishment_id: estId, label: label.trim(), zone: zone.trim() || null, status: 'free' })
    if (error) {
      window.alert(error.message)
      return
    }
    setLabel('')
    setZone('')
    await load()
  }

  async function removeTable(t: TableRow) {
    if (!window.confirm(`Remover a Mesa ${t.label}?`)) return
    const { error } = await supabase.from('tables').delete().eq('id', t.id)
    if (error) window.alert(error.message)
    else {
      if (selected?.id === t.id) setSelected(null)
      await load()
    }
  }

  const linkFor = (t: TableRow) => `${window.location.origin}/t/${t.id}`

  if (loading) return <Spinner />

  return (
    <div>
      <h1 className="text-xl font-extrabold">Mesas & QR</h1>
      <p className="text-gray-400 text-sm">Crie mesas e gere o QR Code que o cliente escaneia.</p>

      <Card className="p-4 mt-4">
        <form onSubmit={addTable} className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="text-xs text-gray-400">Identificação</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex.: 09 ou Balcão"
              className="block mt-1 px-3 py-2 rounded-lg bg-ink border border-line outline-none focus:border-brand text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Zona (opcional)</label>
            <input
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              placeholder="Ex.: Área externa"
              className="block mt-1 px-3 py-2 rounded-lg bg-ink border border-line outline-none focus:border-brand text-sm"
            />
          </div>
          <Button type="submit">Adicionar mesa</Button>
        </form>
      </Card>

      {tables.length === 0 ? (
        <Empty>Nenhuma mesa ainda.</Empty>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-5">
          {tables.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="font-bold">Mesa {t.label}</div>
                <button onClick={() => removeTable(t)} className="text-xs text-rose-400 hover:text-rose-300">
                  excluir
                </button>
              </div>
              {t.zone && <div className="text-xs text-gray-500">{t.zone}</div>}
              <button
                onClick={() => setSelected(t)}
                className="mt-3 w-full text-xs px-3 py-1.5 rounded-lg border border-line hover:bg-panel2"
              >
                Ver QR / link
              </button>
            </Card>
          ))}
        </div>
      )}

      {/* Modal simples de QR */}
      {selected && (
        <div
          className="fixed inset-0 z-40 bg-black/60 grid place-items-center p-5"
          onClick={() => setSelected(null)}
        >
          <div className="bg-panel border border-line rounded-2xl p-6 max-w-xs w-full text-center" onClick={(e) => e.stopPropagation()}>
            <div className="font-bold">Mesa {selected.label}</div>
            <div className="mt-3 flex justify-center">
              <QR value={linkFor(selected)} size={200} />
            </div>
            <div className="text-xs text-gray-400 break-all mt-3">{linkFor(selected)}</div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(linkFor(selected))
                  setCopied(selected.id)
                  setTimeout(() => setCopied(null), 2000)
                }}
                className="flex-1 text-xs px-3 py-2 rounded-lg border border-line hover:bg-panel2"
              >
                {copied === selected.id ? 'Copiado ✓' : 'Copiar link'}
              </button>
              <button
                onClick={() => printTableQR(linkFor(selected), selected.label)}
                className="flex-1 text-xs px-3 py-2 rounded-lg bg-brand text-ink font-semibold grid place-items-center"
              >
                Imprimir QR
              </button>
            </div>
            <button onClick={() => setSelected(null)} className="mt-4 text-xs text-gray-500 hover:text-gray-300">
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
