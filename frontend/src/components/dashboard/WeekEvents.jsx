import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarDays, ChevronRight, MapPin, UserRound } from 'lucide-react'
import { Card, CardHead } from '../ui/Card'
import { Badge } from '../ui/Feedback'
import { EVENT_STATUS, fmt, fmtDate, todayISO } from '../../utils/format'

const dayLabel = (d) => {
  if (d === todayISO()) return 'Hari ini'
  if (d === new Date(Date.now() + 864e5).toLocaleDateString('en-CA')) return 'Besok'
  return fmtDate(d, { weekday: 'long' })
}

/** Dashboard owner: event hari ini s/d 6 hari ke depan, dikelompokkan per hari */
export default function WeekEvents({ events = [], onSchedule }) {
  const byDay = events.reduce((acc, e) => { (acc[e.event_date] ||= []).push(e); return acc }, {})
  const days = Object.keys(byDay).sort()
  const notReady = events.filter((e) => e.status === 'scheduled')
  const unassigned = notReady.filter((e) => !e.staff).length

  return (
    <Card className="week-events">
      <CardHead
        title={<span className="row" style={{ gap: 8 }}><CalendarDays size={16} /> Event 7 hari ke depan</span>}
        sub={events.length
          ? `${events.length} event · ${notReady.length} belum berangkat${unassigned ? ` · ${unassigned} belum ditugaskan` : ''}`
          : 'Belum ada event terjadwal minggu ini'}
        right={<Link to="/events?view=calendar" className="link-arrow">Kalender <ChevronRight size={13} /></Link>}
      />

      {events.length === 0 ? (
        <div className="empty" style={{ padding: '18px 10px' }}>
          <div>Jadwalkan event dan pilih staff penanggung jawabnya.</div>
          {onSchedule && <button className="btn btn-dark btn-sm" style={{ marginTop: 12 }} onClick={onSchedule}>Jadwalkan event</button>}
        </div>
      ) : (
        <div className="week-list">
          {days.map((d, di) => (
            <motion.div key={d} className="week-day" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: di * 0.05 }}>
              <div className={`week-date ${d === todayISO() ? 'today' : ''}`}>
                <b>{dayLabel(d)}</b>
                <span>{fmtDate(d, { day: 'numeric', month: 'short' })}</span>
              </div>
              <div className="week-items">
                {byDay[d].map((e) => {
                  const s = EVENT_STATUS[e.status]
                  return (
                    <Link key={e.id} to={`/events/${e.id}`} className="week-item">
                      <span className={`week-dot ${e.status}`} />
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span className="week-name">{e.name}</span>
                        <span className="week-sub">
                          {e.staff ? <><UserRound size={11} /> {e.staff}</> : <Badge tone="warn">Belum ditugaskan</Badge>}
                          {e.location && <><MapPin size={11} /> {e.location}</>}
                          {e.status !== 'scheduled' && <> · {fmt(e.units)} unit dibawa</>}
                        </span>
                      </span>
                      <Badge tone={s?.badge}>{s?.label}</Badge>
                    </Link>
                  )
                })}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </Card>
  )
}
