import { motion } from 'framer-motion'
import { PackageOpen, ServerCrash } from 'lucide-react'

export function Skeleton({ height = 16, width = '100%', style }) {
  return <div className="skeleton" style={{ height, width, ...style }} />
}

export function EmptyState({ icon: Icon = PackageOpen, title = 'Belum ada data', text, action }) {
  return (
    <motion.div className="empty" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
      <div className="empty-icon"><Icon size={20} /></div>
      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{title}</div>
      {text && <div style={{ marginTop: 4 }}>{text}</div>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </motion.div>
  )
}

export function ApiError({ message, onRetry }) {
  return (
    <motion.div className="api-error" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
      <ServerCrash size={18} style={{ flex: 'none', marginTop: 2 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600 }}>{message || 'Gagal memuat data'}</div>
        {(!message || message.includes('terhubung')) && (
          <div style={{ marginTop: 2, fontSize: 13 }}>
            Pastikan backend Laravel jalan: <code>cd backend &amp;&amp; php artisan serve</code>
          </div>
        )}
      </div>
      {onRetry && <button className="btn btn-sm" onClick={onRetry}>Coba lagi</button>}
    </motion.div>
  )
}

export function Badge({ tone = '', dot = false, children }) {
  return (
    <span className={`badge ${tone}`}>
      {dot && <span className="dot" />}
      {children}
    </span>
  )
}
