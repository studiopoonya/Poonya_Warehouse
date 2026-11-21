import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, MoveRight } from 'lucide-react'
import { Card, CardHead } from '../ui/Card'
import { EmptyState } from '../ui/Feedback'
import { VenueIcon, venueMeta } from '../../utils/venueMeta'
import { fmt, timeAgo } from '../../utils/format'

export default function RecentTransfers({ transfers = [] }) {
  return (
    <Card>
      <CardHead title="Transfer terakhir" right={<Link to="/transfers" className="link-arrow">Semua <ArrowRight size={13} /></Link>} />
      {transfers.length === 0 ? (
        <EmptyState title="Belum ada transfer" />
      ) : (
        <div className="list">
          {transfers.slice(0, 5).map((t, i) => (
            <motion.div
              key={t.id}
              className="list-item"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.06 }}
            >
              <span className="li-icon" style={{ background: venueMeta(t.to_venue).soft, color: venueMeta(t.to_venue).color }}>
                <VenueIcon venue={t.to_venue} size={15} />
              </span>
              <div className="li-main">
                <div className="li-title venue-flow">
                  {t.from_venue.name} <MoveRight size={12} color="var(--muted)" /> {t.to_venue.name}
                </div>
                <div className="li-sub">{t.code} · {timeAgo(t.created_at)}</div>
              </div>
              <span className="badge">{fmt(t.total_qty)} unit</span>
            </motion.div>
          ))}
        </div>
      )}
    </Card>
  )
}
