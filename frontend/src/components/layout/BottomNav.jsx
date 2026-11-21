import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Home, CalendarCheck, Package, Menu, Plus, ArrowLeftRight, ClipboardPlus, X, ChevronRight, ClipboardCheck } from 'lucide-react'
import MovementFormModal from '../forms/MovementFormModal'
import { useVenues } from '../../context/VenueContext'

const TABS = [
  { to: '/', label: 'Beranda', icon: Home, end: true },
  { to: '/events', label: 'Event', icon: CalendarCheck },
  null, // tombol + di tengah
  { to: '/inventory', label: 'Stok', icon: Package },
]

function Tab({ to, label, icon: Icon, end }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `bnav-item ${isActive ? 'active' : ''}`}>
      {({ isActive }) => (
        <>
          {isActive && <motion.span layoutId="bnav-pill" className="bnav-pill" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}
          <Icon size={21} strokeWidth={isActive ? 2.3 : 1.9} />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  )
}

/**
 * Navigasi bawah khusus HP + tombol "+" untuk aksi cepat.
 * Menu lengkap (venue, pengguna, akun) tetap di drawer lewat tab "Menu".
 */
export default function BottomNav({ onMenu }) {
  const navigate = useNavigate()
  const { activeId } = useVenues()
  const [sheet, setSheet] = useState(false)
  const [movementOpen, setMovementOpen] = useState(false)

  const actions = [
    { icon: CalendarCheck, title: 'Event baru', text: 'Catat barang yang dibawa ke event', tone: 'var(--accent)', run: () => navigate('/events/new') },
    { icon: ClipboardPlus, title: 'Catat stok', text: 'Barang masuk, keluar, atau stock opname', tone: 'var(--info)', run: () => setMovementOpen(true) },
    { icon: ClipboardCheck, title: 'Stock opname', text: 'Hitung fisik & samakan stok satu venue', tone: 'var(--dark)', run: () => navigate('/opname/new') },
    { icon: ArrowLeftRight, title: 'Transfer barang', text: 'Kirim barang ke venue lain', tone: 'var(--warn)', run: () => navigate('/transfers') },
  ]

  return (
    <>
      <nav className="bnav" aria-label="Navigasi utama">
        {TABS.map((t, i) => t ? <Tab key={t.to} {...t} /> : (
          <div key={i} className="bnav-fab-wrap">
            <motion.button
              className="bnav-fab"
              whileTap={{ scale: 0.92 }}
              animate={{ rotate: sheet ? 45 : 0 }}
              onClick={() => setSheet((s) => !s)}
              aria-label="Aksi cepat"
            >
              <Plus size={24} strokeWidth={2.4} />
            </motion.button>
          </div>
        ))}
        <button className="bnav-item" onClick={onMenu}>
          <Menu size={21} strokeWidth={1.9} />
          <span>Menu</span>
        </button>
      </nav>

      <AnimatePresence>
        {sheet && (
          <motion.div className="overlay sheet-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSheet(false)}>
            <motion.div
              className="action-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 420, damping: 38 }}
              onClick={(e) => e.stopPropagation()}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => info.offset.y > 80 && setSheet(false)}
            >
              <div className="sheet-handle" />
              <div className="row" style={{ marginBottom: 6 }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>Mau ngapain?</div>
                <button className="icon-btn" style={{ marginLeft: 'auto' }} onClick={() => setSheet(false)} aria-label="Tutup"><X size={16} /></button>
              </div>
              {actions.map((a, i) => (
                <motion.button
                  key={a.title}
                  className="sheet-action"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.05 }}
                  onClick={() => { setSheet(false); a.run() }}
                >
                  <span className="li-icon" style={{ width: 42, height: 42, borderRadius: 13, background: a.tone, color: '#fff' }}><a.icon size={19} /></span>
                  <span style={{ flex: 1, textAlign: 'left' }}>
                    <span style={{ display: 'block', fontWeight: 600 }}>{a.title}</span>
                    <span className="muted" style={{ fontSize: 12.5 }}>{a.text}</span>
                  </span>
                  <ChevronRight size={17} color="var(--muted)" />
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <MovementFormModal open={movementOpen} onClose={() => setMovementOpen(false)} defaultVenueId={activeId} />
    </>
  )
}
