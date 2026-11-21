import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Menu, Search } from 'lucide-react'
import NotificationBell from './NotificationBell'
import { useVenues } from '../../context/VenueContext'

const TITLES = {
  '': 'Overview',
  inventory: 'Inventaris',
  transfers: 'Transfer',
  movements: 'Riwayat Stok',
  venues: 'Venue',
  users: 'Pengguna',
  events: 'Logistik Event',
  opname: 'Stock Opname',
  settings: 'Pengaturan',
  help: 'Bantuan',
}

export default function Topbar({ onMenu }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { venues, active, error, locked } = useVenues()
  const [q, setQ] = useState('')

  const section = pathname.split('/')[1] || ''
  const venueId = pathname.startsWith('/venues/') ? Number(pathname.split('/')[2]) : null
  const venue = venues.find((v) => v.id === venueId)

  const submit = (e) => {
    e.preventDefault()
    navigate(`/inventory?search=${encodeURIComponent(q)}`)
  }

  return (
    <header className="topbar">
      <button className="icon-btn menu-toggle" onClick={onMenu} aria-label="Menu"><Menu size={16} /></button>

      {/* Versi HP: logo + venue aktif (ketuk untuk buka menu & ganti venue) */}
      <button className="topbar-mobile" onClick={onMenu}>
        <span className="brand-logo" style={{ width: 30, height: 30, padding: 7, gap: 2.5, borderRadius: 9 }}><span /><span /><span /><span /></span>
        <span style={{ minWidth: 0, textAlign: 'left' }}>
          <span className="tm-label">{locked ? 'Venue kamu' : 'Venue aktif'}</span>
          <span className="tm-value">{active ? active.name : 'Semua venue'}</span>
        </span>
      </button>

      <div className="crumbs">
        <span>{active ? active.name : 'Semua venue'}</span>
        <span>/</span>
        <strong>{venue ? venue.name : TITLES[section] || 'Overview'}</strong>
      </div>

      <div className="topbar-right">
        <span className="status-pill" style={error ? { background: 'var(--danger-soft)', color: 'var(--danger)' } : undefined}>
          <span className="pulse" style={error ? { background: 'var(--danger)' } : undefined} />
          {error ? 'API offline' : locked ? `Staff · ${active?.name ?? ''}` : `${venues.length} venue aktif`}
        </span>
        <form className="search" onSubmit={submit}>
          <Search size={14} />
          <input placeholder="Cari barang…" value={q} onChange={(e) => setQ(e.target.value)} />
          <span className="kbd">↵</span>
        </form>
        <NotificationBell />
      </div>
    </header>
  )
}
