import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarPlus, ChevronLeft, ChevronRight, MapPin, UserRound } from 'lucide-react'
import { Badge } from '../ui/Feedback'
import { EVENT_STATUS, fmtDate, todayISO } from '../../utils/format'

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const iso = (d) => d.toLocaleDateString('en-CA')

/** Tanggal-tanggal yang tampil di grid bulan (mulai Senin, termasuk sisa minggu bulan sebelum/sesudah) */
export function monthGrid(month) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const start = new Date(first)
  start.setDate(1 - ((first.getDay() + 6) % 7)) // mundur ke Senin
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const end = new Date(last)
  end.setDate(last.getDate() + (6 - ((last.getDay() + 6) % 7))) // maju ke Minggu
  const days = []
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(new Date(d))
  return days
}

/**
 * Kalender bulanan.
 * - klik event -> onOpen(event)
 * - klik tanggal -> onSelectDay(iso); owner bisa langsung menjadwalkan (onCreate)
 */
export default function EventCalendar({ month, events = [], selected, onMonthChange, onSelectDay, onOpen, onCreate }) {
  const days = useMemo(() => monthGrid(month), [month])
  const byDay = useMemo(() => events.reduce((acc, e) => { (acc[e.event_date] ||= []).push(e); return acc }, {}), [events])
  const today = todayISO()
  const shift = (n) => onMonthChange(new Date(month.getFullYear(), month.getMonth() + n, 1))
  const selectedEvents = selected ? byDay[selected] || [] : []

  return (
    <div className="calendar">
      <div className="cal-head">
        <button className="icon-btn" onClick={() => shift(-1)} aria-label="Bulan sebelumnya"><ChevronLeft size={16} /></button>
        <AnimatePresence mode="wait">
          <motion.b key={month.toISOString()} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.15 }} className="cal-title">
            {fmtDate(month, { month: 'long', year: 'numeric' })}
          </motion.b>
        </AnimatePresence>
        <button className="icon-btn" onClick={() => shift(1)} aria-label="Bulan berikutnya"><ChevronRight size={16} /></button>
        <button className="btn btn-sm" style={{ marginLeft: 8 }} onClick={() => { onMonthChange(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); onSelectDay(today) }}>Hari ini</button>
        <div className="cal-legend hide-mobile">
          {['scheduled', 'ongoing', 'completed'].map((s) => <span key={s}><i className={`week-dot ${s}`} /> {EVENT_STATUS[s].label}</span>)}
        </div>
      </div>

      <div className="cal-grid">
        {WEEKDAYS.map((w) => <div key={w} className="cal-wd">{w}</div>)}
        {days.map((d, i) => {
          const key = iso(d)
          const list = byDay[key] || []
          const outside = d.getMonth() !== month.getMonth()
          return (
            <motion.div
              key={key}
              className={`cal-cell ${outside ? 'outside' : ''} ${key === today ? 'today' : ''} ${key === selected ? 'selected' : ''}`}
              onClick={() => onSelectDay(key)}
              onDoubleClick={() => onCreate?.(key)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: Math.min(i, 41) * 0.006 }}
            >
              <div className="cal-num">
                <span>{d.getDate()}</span>
                {onCreate && !outside && (
                  <button className="cal-add" onClick={(e) => { e.stopPropagation(); onCreate(key) }} title="Jadwalkan event di tanggal ini" aria-label="Jadwalkan">
                    <CalendarPlus size={12} />
                  </button>
                )}
              </div>
              <div className="cal-events">
                {list.slice(0, 3).map((e) => (
                  <button key={e.id} className={`cal-chip ${e.status}`} onClick={(ev) => { ev.stopPropagation(); onOpen(e) }} title={`${e.name} · ${e.user?.name ?? 'belum ditugaskan'}`}>
                    {e.name}
                  </button>
                ))}
                {list.length > 3 && <span className="cal-more">+{list.length - 3} lagi</span>}
              </div>
              {/* HP: cukup titik */}
              <div className="cal-dots">{list.slice(0, 4).map((e) => <i key={e.id} className={`week-dot ${e.status}`} />)}</div>
            </motion.div>
          )
        })}
      </div>

      {selected && (
        <div className="cal-day-list">
          <div className="row" style={{ marginBottom: 8 }}>
            <b>{fmtDate(selected, { weekday: 'long', day: 'numeric', month: 'long' })}</b>
            {onCreate && <button className="btn btn-sm" style={{ marginLeft: 'auto' }} onClick={() => onCreate(selected)}><CalendarPlus size={13} /> Jadwalkan di tanggal ini</button>}
          </div>
          {selectedEvents.length === 0 ? (
            <div className="muted" style={{ fontSize: 13 }}>Tidak ada event.</div>
          ) : selectedEvents.map((e) => (
            <button key={e.id} className="week-item" onClick={() => onOpen(e)} style={{ width: '100%' }}>
              <span className={`week-dot ${e.status}`} />
              <span style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
                <span className="week-name">{e.name}</span>
                <span className="week-sub">
                  {e.user ? <><UserRound size={11} /> {e.user.name}</> : <Badge tone="warn">Belum ditugaskan</Badge>}
                  {e.location && <><MapPin size={11} /> {e.location}</>}
                </span>
              </span>
              <Badge tone={EVENT_STATUS[e.status]?.badge}>{EVENT_STATUS[e.status]?.label}</Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
