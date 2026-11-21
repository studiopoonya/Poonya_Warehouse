import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Card, CardHead } from '../ui/Card'
import Segmented from '../ui/Segmented'
import AnimatedNumber from '../ui/AnimatedNumber'
import { fmt, fmtDate } from '../../utils/format'
import { useIsMobile } from '../../hooks/useMediaQuery'

const ROWS = 16 // tinggi maksimum kolom (jumlah kotak) — selaraskan dengan .mchart di CSS

/**
 * Chart "kotak-kotak": tiap kolom = 1 hari, tiap kotak = sekian unit pergerakan.
 * Hijau tua = masuk, hijau muda = keluar, abu = transfer.
 */
export default function MovementChart({ daily = [] }) {
  const isMobile = useIsMobile()
  // di HP 30 kolom terlalu rapat, mulai dari 14 hari
  const [range, setRange] = useState(() => (isMobile ? 14 : 30))
  const [hover, setHover] = useState(null)

  const data = useMemo(() => daily.slice(-range), [daily, range])

  const { columns, totals } = useMemo(() => {
    const max = Math.max(1, ...data.map((d) => d.in + d.out + d.transfer))
    const totals = data.reduce(
      (a, d) => ({ in: a.in + d.in, out: a.out + d.out, transfer: a.transfer + d.transfer }),
      { in: 0, out: 0, transfer: 0 },
    )
    const toSq = (v) => (v > 0 ? Math.max(1, Math.round((v / max) * ROWS)) : 0)
    const columns = data.map((d) => {
      const sq = [
        ...Array(toSq(d.in)).fill('in'),
        ...Array(toSq(d.out)).fill('out'),
        ...Array(toSq(d.transfer)).fill('transfer'),
      ].slice(0, ROWS)
      while (sq.length < ROWS) sq.push('blank')
      return { ...d, sq }
    })
    return { columns, totals }
  }, [data])

  const labelEvery = range > 14 ? 5 : 2

  return (
    <Card>
      <CardHead
        title="Pergerakan stok per hari"
        sub="Setiap kolom satu hari — stok masuk, keluar, dan transfer antar venue"
        right={
          <Segmented
            value={range}
            onChange={setRange}
            options={[{ value: 7, label: '7 hari' }, { value: 14, label: '14 hari' }, { value: 30, label: '30 hari' }]}
          />
        }
      />

      <div className="legend" style={{ marginBottom: 8 }}>
        <span><i style={{ background: 'var(--accent)' }} /> Masuk</span>
        <span><i style={{ background: '#9bd6a8' }} /> Keluar</span>
        <span><i style={{ background: '#cfd3c8' }} /> Transfer</span>
      </div>

      <div className="mchart" key={range}>
        {columns.map((c, ci) => (
          <div key={c.date} className="mcol" onMouseEnter={() => setHover(ci)} onMouseLeave={() => setHover(null)}>
            {c.sq.map((type, ri) => (
              <motion.div
                key={ri}
                className={`msq ${type}`}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: ci * 0.018 + ri * 0.012, duration: 0.3, ease: 'easeOut' }}
              />
            ))}
            <AnimatePresence>
              {hover === ci && (
                <motion.div
                  className="tooltip"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  style={{ bottom: 'calc(100% + 4px)' }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{fmtDate(c.date, { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                  <div className="t-row"><span>Masuk</span><b>{fmt(c.in)}</b></div>
                  <div className="t-row"><span>Keluar</span><b>{fmt(c.out)}</b></div>
                  <div className="t-row"><span>Transfer</span><b>{fmt(c.transfer)}</b></div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
      <div className="mchart-axis">
        {columns.map((c, i) => (
          <span key={c.date}>{i % labelEvery === 0 ? new Date(c.date).getDate() : ''}</span>
        ))}
      </div>

      <div className="chart-summary">
        <div>
          <div className="v"><AnimatedNumber value={totals.in} /></div>
          <div className="l"><i className="nav-dot" style={{ background: 'var(--accent)' }} /> Unit masuk</div>
        </div>
        <div>
          <div className="v"><AnimatedNumber value={totals.out} /></div>
          <div className="l"><i className="nav-dot" style={{ background: '#9bd6a8' }} /> Unit keluar</div>
        </div>
        <div>
          <div className="v"><AnimatedNumber value={totals.transfer} /></div>
          <div className="l"><i className="nav-dot" style={{ background: '#cfd3c8' }} /> Unit ditransfer</div>
        </div>
      </div>
    </Card>
  )
}
