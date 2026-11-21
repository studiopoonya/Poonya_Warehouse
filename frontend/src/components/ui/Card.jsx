import { motion } from 'framer-motion'
import { fadeUp } from './motion'

/** Kartu dasar. Ikut animasi stagger dari parent (variants hidden/show). */
export function Card({ className = '', hover = false, children, ...rest }) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={hover ? { y: -3, boxShadow: '0 18px 40px -18px rgba(20,22,20,.25)' } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className={`card ${className}`}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

export function CardHead({ title, sub, right }) {
  return (
    <div className="card-head">
      <div>
        <div className="card-title">{title}</div>
        {sub && <div className="card-sub">{sub}</div>}
      </div>
      {right && <div className="card-head-right">{right}</div>}
    </div>
  )
}
