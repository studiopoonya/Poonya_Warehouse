import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Auth } from '../api/endpoints'
import { setUnauthorizedHandler, tokenStore } from '../api/client'
import { useToast } from './ToastContext'

const AuthContext = createContext(null)

/**
 * status: 'checking' (cek token tersimpan) | 'authed' | 'guest'
 */
export function AuthProvider({ children }) {
  const toast = useToast()
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState(() => (tokenStore.get() ? 'checking' : 'guest'))

  const reset = useCallback(() => {
    tokenStore.clear()
    setUser(null)
    setStatus('guest')
  }, [])

  // Token ditolak server di tengah pemakaian -> kembali ke login
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (tokenStore.get()) toast('Sesi berakhir, silakan login lagi', 'error')
      reset()
    })
  }, [reset, toast])

  // Saat app dibuka: validasi token yang tersimpan
  useEffect(() => {
    if (status !== 'checking') return
    Auth.me()
      .then((u) => { setUser(u); setStatus('authed') })
      .catch(() => reset())
  }, [status, reset])

  const login = async ({ email, password, remember }) => {
    const res = await Auth.login({ email, password, remember })
    tokenStore.set(res.token, remember)
    setUser(res.user)
    setStatus('authed')
    return res.user
  }

  const logout = async () => {
    try { await Auth.logout() } catch { /* token mungkin sudah tidak valid */ }
    reset()
  }

  return (
    <AuthContext.Provider value={{ user, status, login, logout, isOwner: user?.role === 'owner' }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
