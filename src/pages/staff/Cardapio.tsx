import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { brl } from '@/lib/format'
import { Button, Card, Empty, Spinner } from '@/components/ui'
import type { Category, Product } from '@/lib/types'

function reaisToCents(v: string): number {
  const n = parseFloat(v.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? Math.round(n * 100) : NaN
}

export default function Cardapio() {
  const { establishment } = useAuth()
  const estId = establishment?.id
  const [loading, setLoading] = useState(true)
  const [cats, setCats] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])

  const [catName, setCatName] = useState('')
  const [pName, setPName] = useState('')
  const [pPrice, setPPrice] = useState('')
  const [pCat, setPCat] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!estId) return
    const { data: c } = await supabase.from('product_categories').select('*').eq('establishment_id', estId).order('sort_order')
    const { data: p } = await supabase.from('products').select('*').eq('establishment_id', estId).order('name')
    setCats((c as Category[]) ?? [])
    setProducts((p as Product[]) ?? [])
    if (!pCat && c && c.length) setPCat((c as Category[])[0].id)
    setLoading(false)
  }, [estId, pCat])

  useEffect(() => {
    load()
  }, [load])

  async function addCategory(e: FormEvent) {
    e.preventDefault()
    if (!estId || !catName.trim()) return
    const { error } = await supabase
      .from('product_categories')
      .insert({ establishment_id: estId, name: catName.trim(), sort_order: cats.length })
    if (error) return setErr(error.message)
    setCatName('')
    await load()
  }

  async function addProduct(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!estId || !pName.trim() || !pCat) return
    const cents = reaisToCents(pPrice)
    if (!Number.isFinite(cents) || cents < 0) return setErr('Preço inválido. Use algo como 19,90')
    const { error } = await supabase.from('products').insert({
      establishment_id: estId,
      category_id: pCat,
      name: pName.trim(),
      price_cents: cents,
      is_available: true,
    })
    if (error) return setErr(error.message)
    setPName('')
    setPPrice('')
    await load()
  }

  async function toggleAvail(p: Product) {
    await supabase.from('products').update({ is_available: !p.is_available }).eq('id', p.id)
    await load()
  }

  async function removeProduct(id: string) {
    if (!window.confirm('Remover este produto?')) return
    await supabase.from('products').delete().eq('id', id)
    await load()
  }

  if (loading) return <Spinner />

  return (
    <div>
      <h1 className="text-xl font-extrabold">Cardápio</h1>

      <div className="grid md:grid-cols-2 gap-3 mt-4">
        <Card className="p-4">
          <h2 className="font-semibold text-sm">Nova categoria</h2>
          <form onSubmit={addCategory} className="mt-2 flex gap-2">
            <input
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="Ex.: Drinks"
              className="flex-1 px-3 py-2 rounded-lg bg-ink border border-line outline-none focus:border-brand text-sm"
            />
            <Button type="submit">Adicionar</Button>
          </form>
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold text-sm">Novo produto</h2>
          <form onSubmit={addProduct} className="mt-2 grid grid-cols-2 gap-2">
            <input
              value={pName}
              onChange={(e) => setPName(e.target.value)}
              placeholder="Nome"
              className="col-span-2 px-3 py-2 rounded-lg bg-ink border border-line outline-none focus:border-brand text-sm"
            />
            <input
              value={pPrice}
              onChange={(e) => setPPrice(e.target.value)}
              placeholder="Preço (19,90)"
              inputMode="decimal"
              className="px-3 py-2 rounded-lg bg-ink border border-line outline-none focus:border-brand text-sm"
            />
            <select
              value={pCat}
              onChange={(e) => setPCat(e.target.value)}
              className="px-3 py-2 rounded-lg bg-ink border border-line outline-none focus:border-brand text-sm"
            >
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Button type="submit" className="col-span-2" disabled={cats.length === 0}>
              {cats.length === 0 ? 'Crie uma categoria primeiro' : 'Adicionar produto'}
            </Button>
          </form>
        </Card>
      </div>

      {err && <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg p-2 mt-3">{err}</p>}

      <div className="mt-6 space-y-5">
        {cats.length === 0 && <Empty>Comece criando uma categoria.</Empty>}
        {cats.map((c) => {
          const prods = products.filter((p) => p.category_id === c.id)
          return (
            <div key={c.id}>
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">{c.name}</div>
              {prods.length === 0 ? (
                <div className="text-xs text-gray-600">Sem produtos nesta categoria.</div>
              ) : (
                <Card className="divide-y divide-line">
                  {prods.map((p) => (
                    <div key={p.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <div className={`text-sm font-medium ${p.is_available ? '' : 'line-through text-gray-500'}`}>{p.name}</div>
                        <div className="text-xs text-brand font-semibold">{brl(p.price_cents)}</div>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <button onClick={() => toggleAvail(p)} className="text-gray-300 hover:text-white">
                          {p.is_available ? 'Pausar' : 'Ativar'}
                        </button>
                        <button onClick={() => removeProduct(p.id)} className="text-rose-400 hover:text-rose-300">
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))}
                </Card>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
