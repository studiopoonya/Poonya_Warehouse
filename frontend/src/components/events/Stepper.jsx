import { Fragment } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

export const EVENT_STEPS = [
  { title: 'Info event', sub: 'Nama, lokasi, tanggal' },
  { title: 'Barang dibawa', sub: 'Diambil dari gudang' },
  { title: 'Barang tersisa', sub: 'Diisi saat pulang' },
]

/**
 * current: index langkah aktif (0-2). done: jumlah langkah yang sudah selesai.
 */
export default function Stepper({ current = 0, done = current, steps = EVENT_STEPS }) {
  return (
    <div className="stepper">
      {steps.map((s, i) => {
        const isDone = i < done
        const isActive = i === current && !isDone
        return (
          <Fragment key={s.title}>
            {i > 0 && (
              <div className="stepper-line">
                <motion.div
                  initial={false}
                  animate={{ scaleX: i <= done ? 1 : 0 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            )}
            <div className={`stepper-step ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}>
              <motion.div
                className="stepper-dot"
                initial={false}
                animate={{ scale: isActive ? 1.08 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                {isDone ? (
                  <motion.span initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>
                    <Check size={14} strokeWidth={3} />
                  </motion.span>
                ) : i + 1}
              </motion.div>
              <div className="stepper-text">
                <div className="stepper-title">{s.title}</div>
                <div className="stepper-sub">{s.sub}</div>
              </div>
            </div>
          </Fragment>
        )
      })}
    </div>
  )
}
