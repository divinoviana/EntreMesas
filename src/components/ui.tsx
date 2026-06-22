import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function Spinner({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-gray-400 text-sm p-6">
      <span className="inline-block w-4 h-4 border-2 border-gray-600 border-t-brand rounded-full animate-spin" />
      {label}
    </div>
  )
}

type Variant = 'primary' | 'ghost' | 'danger'
export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base = 'px-4 py-2 rounded-lg font-semibold text-sm disabled:opacity-50 transition active:scale-[.98]'
  const v =
    variant === 'primary'
      ? 'bg-brand text-ink hover:opacity-90'
      : variant === 'danger'
        ? 'bg-rose-500 text-white hover:opacity-90'
        : 'border border-line text-gray-200 hover:bg-panel2'
  return <button className={`${base} ${v} ${className}`} {...props} />
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-panel border border-line rounded-2xl ${className}`}>{children}</div>
}

export function Badge({ children, color = 'gray' }: { children: ReactNode; color?: 'gray' | 'green' | 'amber' | 'rose' }) {
  const c = {
    gray: 'bg-panel2 text-gray-300 border-line',
    green: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    rose: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  }[color]
  return <span className={`inline-block text-xs px-2 py-0.5 rounded-full border ${c}`}>{children}</span>
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="text-center text-gray-500 text-sm py-10">{children}</div>
}
