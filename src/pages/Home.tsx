import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export default function Home() {
  const { isPlatformAdmin } = useAuth()
  return (
    <div className="min-h-full">
      <div className="max-w-md mx-auto px-5 py-16">
        <div className="text-3xl font-extrabold">
          🍻 Entre<span className="text-brand">Mesas</span>
        </div>
        <p className="text-gray-400 mt-3">
          Consumo em tempo real para bares. O cliente acompanha a conta e chama o garçom pelo
          próprio celular.
        </p>

        <div className="mt-8 space-y-3">
          <div className="bg-panel border border-line rounded-2xl p-5">
            <h2 className="font-bold">📷 Sou cliente</h2>
            <p className="text-sm text-gray-400 mt-1">
              Escaneie o QR Code da sua mesa para abrir a conta e acompanhar os lançamentos.
            </p>
          </div>

          <Link
            to="/login"
            className="block bg-panel border border-line rounded-2xl p-5 hover:border-brand transition"
          >
            <h2 className="font-bold">🧑‍🍳 Equipe do bar →</h2>
            <p className="text-sm text-gray-400 mt-1">
              Entrar para gerenciar mesas, cardápio, lançamentos e chamadas.
            </p>
          </Link>
        </div>

        {isPlatformAdmin && (
          <a
            className="block text-center text-xs text-gray-600 mt-10 hover:text-gray-400"
            href="https://github.com/divinoviana/EntreMesas/tree/main/docs"
            target="_blank"
            rel="noreferrer"
          >
            Documentação do produto ↗
          </a>
        )}
      </div>
    </div>
  )
}
