import { motion } from 'framer-motion'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Card } from './Card'
import AnimatedNumber from './AnimatedNumber'

/**
 * Kartu KPI: label + ikon, angka besar animasi, delta, dan sparkline kecil.
 */
export default function StatCard({ label, icon: Icon, value, prefix, suffix, delta, deltaLabel, foot, spark = [], variant = '' }) {
  const max = Math.max(1, ...spark)
  const up = (delta ?? 0) >= 0

  return (
    <Card className={variant} hover>
      <div className="stat-label">
        {Icon && <span className="stat-icon"><Icon size={14} /></span>}
        {label}
      </div>
      <div className="stat-value">
        {prefix && <span style={{ fontSize: '0.6em', marginRight: 4, fontWeight: 600 }}>{prefix}</span>}
        <AnimatedNumber value={value} />
        {suffix && <span style={{ fontSize: 15, color: 'var(--muted)', marginLeft: 4 }}>{suffix}</span>}
      </div>
      <div className="stat-foot">
        {delta !== undefined && delta !== null && (
          <span className={`delta ${up ? 'up' : 'down'}`}>
            {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(delta)}%
          </span>
        )}
        {deltaLabel && <span>{deltaLabel}</span>}
        {foot}
      </div>

      {spark.length > 0 && (
        <div className="spark">
          {spark.map((v, i) => (
            <motion.span
              key={i}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: 0.3 + i * 0.04, type: 'spring', stiffness: 260, damping: 20 }}
              style={{ height: `${Math.max(12, (v / max) * 100)}%`, opacity: 0.35 + (v / max) * 0.65 }}
            />
          ))}
        </div>
      )}
    </Card>
  )
}
