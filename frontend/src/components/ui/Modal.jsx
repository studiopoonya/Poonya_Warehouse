import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useIsMobile } from '../../hooks/useMediaQuery'

/** Dialog di desktop, bottom sheet (muncul dari bawah, bisa diusap turun) di HP */
export default function Modal({ open, onClose, title, children, footer, width = 560 }) {
  const isMobile = useIsMobile()

  // kunci scroll halaman di belakang selama modal terbuka
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
        >
          <motion.div
            className="modal"
            style={isMobile ? undefined : { maxWidth: width }}
            initial={isMobile ? { y: '100%' } : { opacity: 0, y: 24, scale: 0.97 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
            exit={isMobile ? { y: '100%' } : { opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: isMobile ? 38 : 32 }}
          >
            {isMobile && (
              <motion.div
                className="sheet-grab"
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.5 }}
                onDragEnd={(_, info) => info.offset.y > 60 && onClose?.()}
              >
                <div className="sheet-handle" />
              </motion.div>
            )}
            <div className="modal-head">
              <h3>{title}</h3>
              <button className="icon-btn" style={{ marginLeft: 'auto' }} onClick={onClose} aria-label="Tutup">
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-foot">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
