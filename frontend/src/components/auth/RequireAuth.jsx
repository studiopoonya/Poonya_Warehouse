import { Navigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'

/** Layar kecil saat token tersimpan sedang dicek */
export function Splash() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <motion.div
        className="brand-logo"
        style={{ width: 44, height: 44, padding: 10, gap: 4 }}
        animate={{ rotate: [0, 90, 90, 180], scale: [1, 0.9, 0.9, 1] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span /><span /><span /><span />
      </motion.div>
    </div>
  )
}

/** Halaman khusus owner. Staff dialihkan ke `fallback`. */
export function RequireOwner({ children, fallback = '/' }) {
  const { isOwner } = useAuth()
  return isOwner ? children : <Navigate to={fallback} replace />
}

/** Bungkus halaman yang wajib login */
export default function RequireAuth({ children }) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'checking') return <Splash />
  if (status === 'guest') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return children
}
