import { useEffect } from 'react'
import { Link, useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import UserMenu from './UserMenu'
import { pageTransition } from '../ui/motion'

/**
 * Tampilan staff: hanya form logistik event.
 * Tanpa sidebar / navigasi bawah — cukup header kecil + konten di tengah.
 */
export default function StaffLayout() {
  const location = useLocation()
  const outlet = useOutlet()

  useEffect(() => { window.scrollTo({ top: 0 }) }, [location.pathname])

  return (
    <div className="staff-shell">
      <header className="staff-header">
        <Link to="/events" className="staff-brand">
          <span className="brand-logo" style={{ width: 32, height: 32, padding: 7, gap: 2.5, borderRadius: 10 }}><span /><span /><span /><span /></span>
          <span>
            <span className="brand-name" style={{ display: 'block', lineHeight: 1.2 }}>Poonya</span>
            <span className="brand-sub" style={{ display: 'block' }}>Logistik event</span>
          </span>
        </Link>
        <div style={{ marginLeft: 'auto' }}>
          <UserMenu variant="compact" />
        </div>
      </header>

      <main className="staff-main">
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname} {...pageTransition}>
            {outlet}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
