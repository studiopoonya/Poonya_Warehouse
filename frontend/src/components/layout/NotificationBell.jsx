import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, CalendarClock, CalendarX, UserPlus, PackageX, TriangleAlert, ClipboardCheck, DatabaseBackup, CircleCheck, Wrench } from 'lucide-react'
import { Notifications } from '../../api/endpoints'

const ICON = {
  event_overdue: CalendarClock,
  event_not_departed: CalendarX,
  event_unassigned: UserPlus,
  stock_out: PackageX,
  stock_low: TriangleAlert,
  equipment_broken: Wrench,
  opname_due: ClipboardCheck,
  backup: DatabaseBackup,
}
const TONE = {
  danger: ['var(--danger-soft)', 'var(--danger)'],
  warn: ['var(--warn-soft)', 'var(--warn)'],
  info: ['var(--info-soft)', 'var(--info)'],
}

/** Lonceng notifikasi owner: dicek tiap 60 detik & setiap pindah halaman */
export default function NotificationBell() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [data, setData] = useState({ data: [], count: 0 })
  const ref = useRef(null)

  useEffect(() => {
    let alive = true
    const load = () => Notifications.list().then((d) => alive && setData(d)).catch(() => {})
    load()
    const t = setInterval(load, 60000)
    return () => { alive = false; clearInterval(t) }
  }, [pathname])

  useEffect(() => {
    const onDoc = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const urgent = data.data.filter((n) => n.tone !== 'info').length

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="icon-btn notif-btn" onClick={() => setOpen((o) => !o)} aria-label={`Notifikasi (${data.count})`}>
        <Bell size={16} />
        <AnimatePresence>
          {data.count > 0 && (
            <motion.span
              key={data.count}
              className={`notif-badge ${urgent ? '' : 'info'}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            >
              {data.count > 9 ? '9+' : data.count}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="notif-panel"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
          >
            <div className="notif-head">
              <b>Perlu perhatian</b>
              <span className="muted" style={{ fontSize: 12 }}>{data.count} hal</span>
            </div>
            {data.count === 0 ? (
              <div className="empty" style={{ padding: '26px 16px' }}>
                <CircleCheck size={22} color="var(--accent)" style={{ marginBottom: 6 }} />
                <div>Semua aman, tidak ada yang perlu ditindaklanjuti.</div>
              </div>
            ) : (
              <div className="notif-list">
                {data.data.map((n) => {
                  const Icon = ICON[n.type] || Bell
                  const [bg, fg] = TONE[n.tone] || TONE.info
                  return (
                    <button key={n.id} className="notif-item" onClick={() => { setOpen(false); navigate(n.link) }}>
                      <span className="li-icon" style={{ background: bg, color: fg, width: 34, height: 34 }}><Icon size={16} /></span>
                      <span style={{ minWidth: 0, textAlign: 'left' }}>
                        <span style={{ display: 'block', fontWeight: 600, fontSize: 13 }}>{n.title}</span>
                        <span className="muted" style={{ display: 'block', fontSize: 12 }}>{n.text}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
