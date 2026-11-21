import { motion } from 'framer-motion'
import { ease } from './motion'

export default function PageHeader({ title, sub = [], actions }) {
  return (
    <div className="page-head">
      <div>
        <motion.h1
          className="page-title"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
        >
          {title}
        </motion.h1>
        {sub.length > 0 && (
          <motion.div className="page-sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
            {sub.filter(Boolean).map((s, i) => (
              <span key={i} style={{ display: 'contents' }}>
                {i > 0 && <span className="sep" />}
                <span>{s}</span>
              </span>
            ))}
          </motion.div>
        )}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}
