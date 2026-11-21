import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus } from 'lucide-react'

/**
 * items: [{ id, title, lead?, content }]
 * Satu bagian terbuka dalam satu waktu (klik lagi untuk menutup).
 */
export default function Accordion({ items, defaultOpen = null }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="accordion">
      {items.map((it) => {
        const isOpen = open === it.id
        return (
          <div key={it.id} className={`acc-item ${isOpen ? 'open' : ''}`}>
            <button className="acc-head" onClick={() => setOpen(isOpen ? null : it.id)} aria-expanded={isOpen}>
              {it.icon && <span className="acc-icon"><it.icon size={17} /></span>}
              <span className="acc-title">{it.title}</span>
              <motion.span className="acc-toggle" animate={{ rotate: isOpen ? 45 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
                <Plus size={18} />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  className="acc-body"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="acc-inner">
                    {it.lead && <div className="acc-lead">{it.lead}</div>}
                    {it.content}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
