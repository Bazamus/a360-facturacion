import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const initialized = useRef(false)

  useEffect(() => {
    // Evitar doble inicialización en Strict Mode
    if (initialized.current) return
    initialized.current = true

    let mounted = true

    // Timeout de seguridad para evitar loading infinito
    const loadingTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth timeout - forzando fin de loading')
        setLoading(false)
      }
    }, 5000) // 5 segundos máximo

    // Obtener sesión inicial
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error obteniendo sesión:', error)
          if (mounted) setLoading(false)
          return
        }

        if (mounted) {
          setUser(session?.user ?? null)
          
          if (session?.user) {
            // No bloquear el loading por el perfil
            fetchProfile(session.user.id).catch(console.error)
          }
          
          setLoading(false)
        }
      } catch (error) {
        console.error('Error obteniendo sesión:', error)
        if (mounted) setLoading(false)
      }
    }

    getInitialSession()

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        
        console.log('Auth event:', event)
        
        setUser(session?.user ?? null)
        
        if (session?.user) {
          fetchProfile(session.user.id).catch(console.error)
        } else {
          setProfile(null)
        }
        
        // Solo cambiar loading si es un evento de sign in/out
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          setLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      clearTimeout(loadingTimeout)
      subscription.unsubscribe()
    }
  }, [])

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        // Si no existe el perfil, puede ser un usuario nuevo
        if (error.code === 'PGRST116') {
          console.log('Perfil no encontrado, puede ser un usuario nuevo')
        } else {
          console.error('Error obteniendo perfil:', error)
        }
        return
      }

      setProfile(data)
    } catch (error) {
      console.error('Error en fetchProfile:', error)
    }
  }

  const signIn = async (email, password) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) throw error
      return data
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email, password, nombreCompleto) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre_completo: nombreCompleto
        }
      }
    })
    
    if (error) throw error
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
    setProfile(null)
  }

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user,
    isAdmin: profile?.rol === 'admin'
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return context
}
