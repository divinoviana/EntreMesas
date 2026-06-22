import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Establishment, Staff } from '@/lib/types'

interface AuthContextValue {
  user: User | null
  staff: Staff | null
  establishment: Establishment | null
  isPlatformAdmin: boolean
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>(null as unknown as AuthContextValue)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [staff, setStaff] = useState<Staff | null>(null)
  const [establishment, setEstablishment] = useState<Establishment | null>(null)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  async function loadStaff(uid: string) {
    const { data: s } = await supabase
      .from('staff')
      .select('*')
      .eq('user_id', uid)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()
    setStaff((s as Staff) ?? null)
    if (s) {
      const { data: e } = await supabase
        .from('establishments')
        .select('*')
        .eq('id', (s as Staff).establishment_id)
        .maybeSingle()
      setEstablishment((e as Establishment) ?? null)
    } else {
      setEstablishment(null)
    }
    const { data: pa } = await supabase
      .from('platform_admins')
      .select('user_id')
      .eq('user_id', uid)
      .maybeSingle()
    setIsPlatformAdmin(Boolean(pa))
  }

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(async ({ data }: { data: { session: Session | null } }) => {
      if (!mounted) return
      const u = data.session?.user ?? null
      setUser(u)
      if (u) await loadStaff(u.id)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) await loadStaff(u.id)
      else {
        setStaff(null)
        setEstablishment(null)
        setIsPlatformAdmin(false)
      }
    })
    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message }
  }
  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error?.message }
  }
  const signOut = async () => {
    await supabase.auth.signOut()
  }
  const refresh = async () => {
    if (user) await loadStaff(user.id)
  }

  return (
    <AuthContext.Provider
      value={{ user, staff, establishment, isPlatformAdmin, loading, signIn, signUp, signOut, refresh }}
    >
      {children}
    </AuthContext.Provider>
  )
}
