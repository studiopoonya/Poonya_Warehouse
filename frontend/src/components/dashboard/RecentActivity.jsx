import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowDownToLine, ArrowRight, ArrowUpFromLine, ArrowLeftRight, SlidersHorizontal, CalendarCheck } from 'lucide-react'
import { Card, CardHead } from '../ui/Card'
import { EmptyState } from '../ui/Feedback'
import { MOVEMENT_TYPES, timeAgo } from '../../utils/format'

const ICONS = {
  in: [ArrowDownToLine, 'var(--accent-soft)', 'var(--accent-strong)'],
  out: [ArrowUpFromLine, 'var(--danger-soft)', 'var(--danger)'],
  transfer_in: [ArrowLeftRight, 'var(--info-soft)', 'var(--info)'],
  transfer_out: [ArrowLeftRight, 'var(--warn-soft)', 'var(--warn)'],
  adjust: [SlidersHorizontal, 'var(--surface-2)', 'var(--text-2)'],
  event_out: [CalendarCheck, 'var(--warn-soft)', 'var(--warn)'],
  event_return: [CalendarCheck, 'var(--info-soft)', 'var(--info)'],
  event_lost: [CalendarCheck, 'var(--danger-soft)', 'var(--danger)'],
}

export default function RecentActivity({ movements = [] }) {
  return (
    <Card>
      <CardHead title="Aktivitas stok terbaru" right={<Link to="/movements" className="link-arrow">Riwayat <ArrowRight size={13} /></Link>} />
      {movements.length === 0 ? <EmptyState title="Belum ada aktivitas" /> : (
        <div className="list">
          {movements.map((m, i) => {
            const [Icon, bg, fg] = ICONS[m.type] || ICONS.adjust
            return (
              <motion.div key={m.id} className="list-item" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }}>
                <span className="li-icon" style={{ background: bg, color: fg }}><Icon size={15} /></span>
                <div className="li-main">
                  <div className="li-title">{m.item.name}</div>
                  <div className="li-sub">{MOVEMENT_TYPES[m.type]?.label} · {m.venue.name} · {timeAgo(m.created_at)}</div>
                </div>
                <span className="mono" style={{ fontWeight: 600, color: m.change > 0 ? 'var(--accent-strong)' : m.change < 0 ? 'var(--danger)' : undefined }}>
                  {m.change > 0 ? '+' : ''}{m.change}
                </span>
              </motion.div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
