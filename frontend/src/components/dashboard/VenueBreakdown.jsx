import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { Card } from '../ui/Card'
import AnimatedNumber from '../ui/AnimatedNumber'
import { VenueIcon, venueMeta } from '../../utils/venueMeta'
import { stagger } from '../ui/motion'

export default function VenueBreakdown({ venues = [] }) {
  const navigate = useNavigate()
  const total = venues.reduce((a, v) => a + v.total_units, 0) || 1

  return (
    <motion.div className="grid grid-4" variants={stagger} initial="hidden" animate="show">
      {venues.map((v, i) => {
        const m = venueMeta(v)
        const share = Math.round((v.total_units / total) * 100)
        return (
          <Card key={v.id} className="venue-card" hover onClick={() => navigate(`/venues/${v.id}`)}>
            <div className="glow" style={{ background: m.color }} />
            <div className="row">
              <span className="venue-icon" style={{ background: m.color }}><VenueIcon venue={v} size={18} /></span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{v.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>{v.type_label}</div>
              </div>
              <ArrowUpRight size={16} color="var(--muted)" style={{ marginLeft: 'auto' }} />
            </div>
            <div>
              <div className="row" style={{ alignItems: 'baseline' }}>
                <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-.02em' }}><AnimatedNumber value={v.total_units} /></span>
                <span className="muted" style={{ fontSize: 12 }}>unit · {share}% dari total</span>
              </div>
              <div className="progress" style={{ marginTop: 8 }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${share}%` }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                  style={{ background: m.color }}
                />
              </div>
            </div>
            <div className="venue-meta">
              <div><div className="v">{v.items_count}</div><div className="l">Jenis</div></div>
              <div><div className="v" style={{ color: v.low_stock_count ? 'var(--warn)' : undefined }}>{v.low_stock_count}</div><div className="l">Menipis</div></div>
              <div><div className="v">{v.transfers_in_month ?? 0}</div><div className="l">Transfer</div></div>
            </div>
          </Card>
        )
      })}
    </motion.div>
  )
}
