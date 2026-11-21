import { useEffect, useState } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import BottomNav from './BottomNav'
import { pageTransition } from '../ui/motion'
import { useIsMobile } from '../../hooks/useMediaQuery'

export default function Layout() {
  const location = useLocation()
  const outlet = useOutlet()
  const isMobile = useIsMobile()
  const [menuOpen, setMenuOpen] = useState(false)

  // pindah halaman -> drawer tertutup & scroll kembali ke atas (penting di HP)
  useEffect(() => {
    setMenuOpen(false)
    window.scrollTo({ top: 0 })
    document.querySelector('.main-scroll')?.scrollTo({ top: 0 })
  }, [location.pathname])

  return (
    <div className="app">
      <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} onClose={() => setMenuOpen(false)} />
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="overlay"
            style={{ zIndex: 55 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      <main className="main">
        <Topbar onMenu={() => setMenuOpen(true)} />
        <div className="main-scroll">
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname} {...pageTransition}>
              {outlet}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {isMobile && <BottomNav onMenu={() => setMenuOpen(true)} />}
    </div>
  )
}
