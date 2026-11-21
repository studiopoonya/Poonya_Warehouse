import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, ChevronsUpDown, KeyRound, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import ChangePasswordModal from '../forms/ChangePasswordModal'

export const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?'

/**
 * Menu akun: ganti password & keluar.
 * variant="card"    -> kartu di bawah sidebar (menu terbuka ke atas)
 * variant="compact" -> tombol avatar di header (menu terbuka ke bawah)
 */
export default function UserMenu({ variant = 'card' }) {
  const { user, logout, isOwner } = useAuth()
  const [open, setOpen] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const ref = useRef(null)
  const compact = variant === 'compact'

  useEffect(() => {
    const onDoc = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const roleLabel = isOwner ? 'Owner' : 'Staff · Logistik event'

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <AnimatePresence>
        {open && (
          <motion.div
            className={`user-menu ${compact ? 'down' : ''}`}
            initial={{ opacity: 0, y: compact ? -6 : 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: compact ? -6 : 6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
          >
            {compact && (
              <div className="user-menu-head">
                <div style={{ fontWeight: 600 }}>{user?.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>{user?.email}</div>
              </div>
            )}
            <button onClick={() => { setOpen(false); setPwOpen(true) }}><KeyRound size={15} /> Ganti password</button>
            <button className="danger" disabled={leaving} onClick={async () => { setLeaving(true); await logout() }}>
              <LogOut size={15} /> {leaving ? 'Keluar…' : 'Keluar'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {compact ? (
        <button className="user-chip" onClick={() => setOpen((o) => !o)} aria-label="Akun">
          <span className="avatar">{initials(user?.name)}</span>
          <span className="user-chip-text">
            <span style={{ fontWeight: 600, fontSize: 13 }}>{user?.name}</span>
            <span className="muted" style={{ fontSize: 11.5 }}>{roleLabel}</span>
          </span>
          <ChevronDown size={14} color="var(--muted)" />
        </button>
      ) : (
        <button className="user-card" onClick={() => setOpen((o) => !o)}>
          <div className="avatar">{initials(user?.name)}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 500, fontSize: 13 }}>{user?.name}</div>
            <div className="muted" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={user?.email}>
              {roleLabel}
            </div>
          </div>
          <ChevronsUpDown size={14} color="var(--muted)" />
        </button>
      )}

      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  )
}
