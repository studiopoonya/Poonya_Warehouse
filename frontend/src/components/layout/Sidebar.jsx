import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutGrid, Package, ArrowLeftRight, History, Building2, ChevronsUpDown, Check, Settings, LifeBuoy, Layers, Lock, Users, CalendarCheck, ClipboardCheck,
} from 'lucide-react'
import { useVenues } from '../../context/VenueContext'
import { useAuth } from '../../context/AuthContext'
import UserMenu from './UserMenu'
import { VenueDot, VenueIcon, venueMeta } from '../../utils/venueMeta'

const MAIN_NAV = [
  { to: '/', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/events', label: 'Logistik Event', icon: CalendarCheck },
  { to: '/inventory', label: 'Inventaris', icon: Package },
  { to: '/transfers', label: 'Transfer', icon: ArrowLeftRight },
  { to: '/movements', label: 'Riwayat Stok', icon: History },
  { to: '/opname', label: 'Stock Opname', icon: ClipboardCheck },
]

function NavItem({ to, end, children, onNavigate }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onNavigate}>
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span layoutId="nav-active" className="nav-active-bg" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />
          )}
          {children}
        </>
      )}
    </NavLink>
  )
}

function VenueSwitcher() {
  const { venues, active, select, locked } = useVenues()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const onDoc = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const meta = active ? venueMeta(active) : null

  return (
    <div className="venue-switch" ref={ref}>
      <button
        className="venue-switch-btn"
        onClick={() => !locked && setOpen((o) => !o)}
        style={locked ? { cursor: 'default' } : undefined}
        title={locked ? 'Akun staff terkunci ke venue ini' : undefined}
      >
        <span className="li-icon" style={{ width: 28, height: 28, background: meta?.color || 'var(--surface-2)', color: meta ? '#fff' : 'var(--text-2)', border: meta ? 0 : '1px solid var(--border)' }}>
          {active ? <VenueIcon venue={active} size={14} /> : <Layers size={14} />}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <div className="label">{locked ? 'Venue kamu' : 'Venue aktif'}</div>
          <div className="value">{active?.name || 'Semua venue'}</div>
        </span>
        {locked ? <Lock size={13} color="var(--muted)" /> : <ChevronsUpDown size={14} color="var(--muted)" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="venue-menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
          >
            <button className={!active ? 'active' : ''} onClick={() => { select(null); setOpen(false) }}>
              <Layers size={14} /> Semua venue {!active && <Check size={14} style={{ marginLeft: 'auto' }} />}
            </button>
            {venues.map((v) => (
              <button key={v.id} className={active?.id === v.id ? 'active' : ''} onClick={() => { select(v.id); setOpen(false) }}>
                <VenueDot venue={v} /> {v.name}
                {active?.id === v.id && <Check size={14} style={{ marginLeft: 'auto' }} />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Sidebar({ open, onNavigate }) {
  const { venues, myVenues } = useVenues()
  const { isOwner } = useAuth()

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="brand">
        <div className="brand-logo"><span /><span /><span /><span /></div>
        <div>
          <div className="brand-name">Poonya</div>
          <div className="brand-sub">Warehouse system</div>
        </div>
      </div>

      <VenueSwitcher />

      <nav className="nav-section">
        <div className="nav-title">Menu</div>
        {MAIN_NAV.map(({ to, label, icon: Icon, end }) => (
          <NavItem key={to} to={to} end={end} onNavigate={onNavigate}>
            <Icon size={16} /> <span>{label}</span>
          </NavItem>
        ))}
      </nav>

      <nav className="nav-section">
        <div className="nav-title">{isOwner ? 'Venue' : 'Venue kamu'}</div>
        {isOwner && (
          <NavItem to="/venues" end onNavigate={onNavigate}>
            <Building2 size={16} /> <span>Semua venue</span>
            <span className="nav-count">{venues.length}</span>
          </NavItem>
        )}
        {myVenues.map((v) => (
          <NavItem key={v.id} to={`/venues/${v.id}`} onNavigate={onNavigate}>
            <VenueDot venue={v} /> <span>{v.name}</span>
            {v.low_stock_count > 0 && <span className="nav-count" style={{ color: 'var(--warn)' }}>{v.low_stock_count}</span>}
          </NavItem>
        ))}
      </nav>

      {isOwner && (
        <nav className="nav-section">
          <div className="nav-title">Admin</div>
          <NavItem to="/users" onNavigate={onNavigate}>
            <Users size={16} /> <span>Pengguna</span>
          </NavItem>
        </nav>
      )}

      <div className="sidebar-foot">
        <nav className="nav-section" style={{ padding: 0 }}>
          <NavItem to="/settings" onNavigate={onNavigate}><Settings size={16} /> <span>Pengaturan</span></NavItem>
          <NavItem to="/help" onNavigate={onNavigate}><LifeBuoy size={16} /> <span>Bantuan</span></NavItem>
        </nav>
        <UserMenu />
      </div>
    </aside>
  )
}
