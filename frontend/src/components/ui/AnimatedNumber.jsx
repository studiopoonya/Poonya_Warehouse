import { useEffect, useRef, useState } from 'react'
import { animate } from 'framer-motion'
import { fmt } from '../../utils/format'
import { ease } from './motion'

/** Angka yang "menghitung" dari nilai lama ke nilai baru */
export default function AnimatedNumber({ value = 0, duration = 1 }) {
  const [display, setDisplay] = useState(0)
  const prev = useRef(0)

  useEffect(() => {
    const controls = animate(prev.current, Number(value) || 0, {
      duration,
      ease,
      onUpdate: (v) => setDisplay(v),
    })
    prev.current = Number(value) || 0
    return () => controls.stop()
  }, [value, duration])

  return <span className="tnum">{fmt(Math.round(display))}</span>
}
