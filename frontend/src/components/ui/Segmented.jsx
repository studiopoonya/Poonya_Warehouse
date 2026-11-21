import { useId } from 'react'
import { motion } from 'framer-motion'

/** Tab kecil dengan background yang "meluncur" ke opsi aktif */
export default function Segmented({ options, value, onChange }) {
  const id = useId()
  return (
    <div className="segmented">
      {options.map((o) => (
        <button type="button" key={o.value} className={value === o.value ? 'active' : ''} onClick={() => onChange(o.value)}>
          {value === o.value && (
            <motion.span layoutId={`seg-${id}`} className="seg-bg" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />
          )}
          {o.label}
        </button>
      ))}
    </div>
  )
}
