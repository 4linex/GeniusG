import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getAccessToken, invokeEdgeFunction } from '@/lib/edgeFunctions'
import type { Profile, RegisterUserPayload, UserRole } from '@/types/database'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  registerUser: (payload: RegisterUserPayload) => Promise<void>
  deleteUser: (userId: string) => Promise<void>
  hasRole: (...roles: UserRole[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)

  const loading = !sessionReady || profileLoading

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Erro ao buscar perfil:', error.message)
      return null
    }
    return data as Profile
  }

  // Sessão: apenas atualizações síncronas no listener (await aqui causa deadlock no Supabase Auth).
  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return
      setSession(s)
      setUser(s?.user ?? null)
      setSessionReady(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return
      setSession(s)
      setUser(s?.user ?? null)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Perfil: efeito separado evita bloquear o lock interno do auth client.
  useEffect(() => {
    let mounted = true
    const userId = user?.id

    if (!sessionReady) return

    if (!userId) {
      setProfile(null)
      setProfileLoading(false)
      return
    }

    setProfileLoading(true)
    fetchProfile(userId).then((p) => {
      if (mounted) {
        setProfile(p)
        setProfileLoading(false)
      }
    })

    return () => {
      mounted = false
    }
  }, [user?.id, sessionReady])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const registerUser = async (payload: RegisterUserPayload) => {
    const token = await getAccessToken()
    await invokeEdgeFunction('register-user', payload, { accessToken: token })
  }

  const deleteUser = async (userId: string) => {
    const token = await getAccessToken()
    await invokeEdgeFunction('delete-user', { user_id: userId }, { accessToken: token })
  }

  const hasRole = (...roles: UserRole[]) => {
    if (!profile) return false
    if (profile.role === 'root') return true
    return roles.includes(profile.role)
  }

  return (
    <AuthContext.Provider
      value={{ user, profile, session, loading, signIn, signOut, registerUser, deleteUser, hasRole }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return context
}
