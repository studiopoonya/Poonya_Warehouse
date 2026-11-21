import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, TriangleAlert } from 'lucide-react'
import { Card } from '../ui/Card'
import AnimatedNumber from '../ui/AnimatedNumber'
import { venueMeta } from '../../utils/venueMeta'

export default function LowStockCard({ count = 0, outCount = 0, items = [] }) {
  return (
    <Card className="dark">
      <div className="row" style={{ marginBottom: 14 }}>
        <div>
          <div className="card-title">Stok menipis</div>
          <div className="card-sub">Di bawah batas minimum</div>
        </div>
        <span className="stat-icon" style={{ marginLeft: 'auto' }}><TriangleAlert size={14} color="#b8f36b" /></span>
      </div>

      <div className="row" style={{ alignItems: 'baseline' }}>
        <div className="bigstat"><AnimatedNumber value={count} /></div>
        <span className="muted">barang</span>
      </div>
      <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
        {outCount > 0 ? `${outCount} di antaranya sudah habis (0 unit)` : 'Tidak ada barang yang habis 🎉'}
      </div>

      <div className="list" style={{ marginTop: 12 }}>
        {items.slice(0, 4).map((it, i) => {
          const pct = Math.min(100, (it.quantity / Math.max(1, it.min_stock)) * 100)
          return (
            <motion.div
              key={`${it.item_id}-${it.venue.id}`}
              className="list-item"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.07 }}
            >
              <div className="li-main">
                <div className="li-title">{it.name}</div>
                <div className="li-sub">{it.venue.name}</div>
                <div className="progress" style={{ marginTop: 6 }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.5 + i * 0.07, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    style={{ background: it.quantity === 0 ? '#ff7a6e' : venueMeta(it.venue).color === '#121412' ? '#b8f36b' : venueMeta(it.venue).color }}
                  />
                </div>
              </div>
              <div className="mono" style={{ fontSize: 13, textAlign: 'right' }}>
                {it.quantity}<span className="muted">/{it.min_stock}</span>
              </div>
            </motion.div>
          )
        })}
      </div>

      <Link to="/inventory?filter=low" className="link-arrow" style={{ marginTop: 8 }}>
        Lihat semua <ArrowRight size={13} />
      </Link>
    </Card>
  )
}
