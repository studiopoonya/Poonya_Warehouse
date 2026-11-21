import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CalendarCheck, CalendarDays, CalendarPlus, ChevronRight, ClipboardList, Hourglass, MapPin, Package, Search,
  CheckCheck, Download, Truck, Hand, Zap,
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import Accordion from '../components/ui/Accordion'
import { Card } from '../components/ui/Card'
import { ApiError, Badge, EmptyState, Skeleton } from '../components/ui/Feedback'
import { stagger } from '../components/ui/motion'
import ScheduleEventModal from '../components/forms/ScheduleEventModal'
import EventCalendar, { monthGrid } from '../components/events/EventCalendar'
import Segmented from '../components/ui/Segmented'
import { Events as EventApi } from '../api/endpoints'
import { blobErrorMessage, downloadFile, errorMessage } from '../api/client'
import { useFetch } from '../hooks/useFetch'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { EVENT_STATUS, fmt, fmtDate, fmtRp, timeAgo, todayISO } from '../utils/format'

const FILTERS = [
  { value: '', label: 'Semua' },
  { value: 'scheduled', label: 'Terjadwal' },
  { value: 'ongoing', label: 'Sedang berjalan' },
  { value: 'completed', label: 'Selesai' },
  { value: 'cancelled', label: 'Dibatalkan' },
]

const dateLabel = (d) => {
  const t = todayISO()
  if (d === t) return 'Hari ini'
  const tomorrow = new Date(Date.now() + 864e5).toLocaleDateString('en-CA')
  if (d === tomorrow) return 'Besok'
  return fmtDate(d, { weekday: 'short', day: 'numeric', month: 'short' })
}

/** Kartu event untuk staff: terjadwal (catat barang / ambil) atau berjalan (lapor sisa) */
function EventCard({ ev, kind, onClaim, claiming }) {
  const navigate = useNavigate()
  const cfg = {
    mine: { icon: CalendarCheck, bg: 'var(--info-soft)', fg: 'var(--info)', cls: 'sched-card', cta: <>Catat barang <ChevronRight size={13} /></>, go: `/events/new?event=${ev.id}` },
    open: { icon: Hand, bg: 'var(--accent-soft)', fg: 'var(--accent-strong)', cls: 'open-card', cta: claiming ? 'Mengambil…' : <>Ambil event ini</> },
    ongoing: { icon: Hourglass, bg: 'var(--warn-soft)', fg: 'var(--warn)', cls: 'ongoing-card', cta: <>Lapor sisa <ChevronRight size={13} /></>, go: `/events/${ev.id}` },
  }[kind]
  const Icon = cfg.icon

  const act = (e) => {
    e.stopPropagation()
    if (kind === 'open') onClaim(ev)
    else navigate(cfg.go)
  }

  return (
    <Card className={cfg.cls} hover onClick={() => navigate(`/events/${ev.id}`)} style={{ cursor: 'pointer' }}>
      <div className="ongoing-link">
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <span className="li-icon" style={{ background: cfg.bg, color: cfg.fg }}><Icon size={15} /></span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{ev.name}</div>
            <div className="muted" style={{ fontSize: 12.5 }}>
              <b style={{ color: 'var(--text-2)' }}>{dateLabel(ev.event_date)}</b>{ev.location ? ` · ${ev.location}` : ''}
            </div>
            {ev.note && kind !== 'ongoing' && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>“{ev.note}”</div>}
          </div>
        </div>
        <div className="ongoing-foot">
          <span className="muted" style={{ fontSize: 12.5 }}>
            {kind === 'ongoing' ? [ev.equipment?.items ? `${ev.equipment.items} alat` : null, ev.totals.items ? `${ev.totals.items} barang · ${fmt(ev.totals.out)} unit dibawa` : null].filter(Boolean).join(' · ') || 'Belum ada barang' : ev.crew ? `Tim: ${ev.crew}` : 'Dijadwalkan owner'}
          </span>
          <button className={`btn btn-sm ${kind === 'open' ? 'btn-accent' : 'btn-dark'}`} onClick={act} disabled={claiming}>{cfg.cta}</button>
        </div>
      </div>
    </Card>
  )
}

function Section({ title, count, tone = '', children }) {
  return (
    <section style={{ marginBottom: 22 }}>
      <div className="row" style={{ marginBottom: 10 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600 }}>{title}</h2>
        <span className={`badge ${tone}`}>{count}</span>
      </div>
      <motion.div className="grid grid-3" variants={stagger} initial="hidden" animate="show">{children}</motion.div>
    </section>
  )
}

export default function Events() {
  const { isOwner, user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleDate, setScheduleDate] = useState(null)
  const [params, setParams] = useSearchParams()
  const view = isOwner && params.get('view') === 'calendar' ? 'calendar' : 'list'
  const setView = (v) => { const n = new URLSearchParams(params); if (v === 'calendar') n.set('view', 'calendar'); else n.delete('view'); setParams(n, { replace: true }) }
  const [month, setMonthCal] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [selectedDay, setSelectedDay] = useState(todayISO())
  const grid = monthGrid(month)
  const { data: calData, reload: reloadCal } = useFetch(
    () => (view === 'calendar' ? EventApi.list({ from: grid[0].toLocaleDateString('en-CA'), to: grid[grid.length - 1].toLocaleDateString('en-CA') }) : Promise.resolve(null)),
    [view, month],
  )
  const openSchedule = (date = null) => { setScheduleDate(date); setScheduleOpen(true) }
  const [claimingId, setClaimingId] = useState(null)
  const [exportMonthValue, setMonth] = useState(() => todayISO().slice(0, 7))
  const month_ = exportMonthValue
  const [exporting, setExporting] = useState(false)
  const { data, loading, error, reload } = useFetch(() => EventApi.list({ status, search }), [status, search])

  const events = data?.data || []
  const meta = data?.meta
  const filtering = !!(status || search)

  // kelompok untuk staff
  const mine = events.filter((e) => e.status === 'scheduled' && e.user?.id === user?.id)
  const open = events.filter((e) => e.status === 'scheduled' && !e.user)
  const ongoing = events.filter((e) => e.status === 'ongoing' && e.user?.id === user?.id)
  const history = isOwner || filtering ? events : events.filter((e) => e.status === 'completed' || e.status === 'cancelled')

  const exportMonth = async () => {
    setExporting(true)
    try { await downloadFile('/reports/events', { month: month_ }, `pemakaian-event-${month_}.xlsx`) } catch (e) { toast(await blobErrorMessage(e), 'error') } finally { setExporting(false) }
  }

  const claim = async (ev) => {
    setClaimingId(ev.id)
    try {
      await EventApi.claim(ev.id)
      toast(`${ev.name} sekarang tanggung jawabmu`)
      navigate(`/events/new?event=${ev.id}`)
    } catch (e) {
      toast(errorMessage(e), 'error')
      reload()
    } finally {
      setClaimingId(null)
    }
  }

  return (
    <>
      <PageHeader
        title="Logistik event"
        sub={[isOwner ? 'Jadwalkan event, pantau barang yang dibawa staff & yang terpakai' : 'Pilih event, catat barang sebelum berangkat, laporkan sisa saat pulang']}
        actions={isOwner ? (
          <>
            <div className="export-month hide-mobile">
              <input type="month" className="input" value={month_} onChange={(e) => setMonth(e.target.value)} aria-label="Bulan laporan" />
              <button className="btn" onClick={exportMonth} disabled={exporting || !month_}><Download size={15} /> {exporting ? 'Menyiapkan…' : 'Export Excel'}</button>
            </div>
            <button className="btn btn-dark" onClick={() => openSchedule()}><CalendarPlus size={15} /> Jadwalkan event</button>
          </>
        ) : (
          <Link to="/events/new" className="btn"><Zap size={15} /> Event mendadak</Link>
        )}
      />

      {error && <ApiError message={error} onRetry={reload} />}

      {loading && !data ? (
        <div className="grid grid-3">{[0, 1, 2].map((i) => <Skeleton key={i} height={130} />)}</div>
      ) : data && (
        <>
          {isOwner && meta && (
            <motion.div className="grid grid-4" variants={stagger} initial="hidden" animate="show" style={{ marginBottom: 22 }}>
              <StatCard variant="highlight" label="Terjadwal" icon={CalendarDays} value={meta.scheduled}
                foot={meta.unassigned ? <span className="badge warn">{meta.unassigned} belum ditugaskan</span> : <span>belum berangkat</span>} />
              <StatCard label="Sedang berjalan" icon={Hourglass} value={meta.ongoing} foot={<span>belum lapor sisa</span>} />
              <StatCard label="Selesai bulan ini" icon={CheckCheck} value={meta.completed_this_month} />
              <StatCard variant="dark" label="Unit terpakai bulan ini" icon={Package} value={meta.used_this_month} foot={meta.used_value_this_month ? <span>senilai {fmtRp(meta.used_value_this_month)}</span> : null} />
            </motion.div>
          )}

          {!isOwner && !filtering && (
            <>
              {mine.length > 0 && (
                <Section title="Event untukmu" count={mine.length} tone="info">
                  {mine.map((ev) => <EventCard key={ev.id} ev={ev} kind="mine" />)}
                </Section>
              )}
              {open.length > 0 && (
                <Section title="Bisa diambil" count={open.length} tone="green">
                  {open.map((ev) => <EventCard key={ev.id} ev={ev} kind="open" onClaim={claim} claiming={claimingId === ev.id} />)}
                </Section>
              )}
              {ongoing.length > 0 && (
                <Section title="Belum lapor sisa barang" count={ongoing.length} tone="warn">
                  {ongoing.map((ev) => <EventCard key={ev.id} ev={ev} kind="ongoing" />)}
                </Section>
              )}
              {mine.length + open.length + ongoing.length === 0 && (
                <div className="card" style={{ marginBottom: 22 }}>
                  <EmptyState
                    icon={CalendarCheck}
                    title="Belum ada event untukmu"
                    text="Event yang dijadwalkan owner akan muncul di sini. Ada booking mendadak? Catat lewat tombol di bawah."
                    action={<Link to="/events/new" className="btn btn-dark"><Zap size={15} /> Event mendadak</Link>}
                  />
                </div>
              )}
            </>
          )}

          {isOwner && (
            <div className="toolbar">
              <Segmented value={view} onChange={setView} options={[{ value: 'list', label: 'Daftar' }, { value: 'calendar', label: 'Kalender' }]} />
            </div>
          )}

          {view === 'calendar' ? (
            <div className="card">
              <EventCalendar
                month={month}
                events={calData?.data || []}
                selected={selectedDay}
                onMonthChange={setMonthCal}
                onSelectDay={setSelectedDay}
                onOpen={(e) => navigate(`/events/${e.id}`)}
                onCreate={(d) => openSchedule(d)}
              />
            </div>
          ) : (<>
          <div className="toolbar">
            {!isOwner && <h2 style={{ fontSize: 15, fontWeight: 600, marginRight: 'auto' }}>Riwayat</h2>}
            <div className="search" style={{ minWidth: 240 }}>
              <Search size={14} />
              <input placeholder="Cari nama event, lokasi, kode…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {isOwner && (
              <div className="chips">
                {FILTERS.map((f) => (
                  <button key={f.value} className={`chip ${status === f.value ? 'active' : ''}`} onClick={() => setStatus(f.value)}>{f.label}</button>
                ))}
              </div>
            )}
          </div>

          {history.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={ClipboardList}
                title={filtering ? 'Tidak ada event yang cocok' : isOwner ? 'Belum ada event' : 'Belum ada riwayat'}
                text={filtering ? null : isOwner ? 'Jadwalkan event lalu pilih staff penanggung jawabnya.' : 'Event yang sudah selesai akan tercatat di sini.'}
                action={isOwner && !filtering && <button className="btn btn-dark" onClick={() => openSchedule()}><CalendarPlus size={15} /> Jadwalkan event</button>}
              />
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table responsive">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Tanggal</th>
                    {isOwner && <th>Penanggung jawab</th>}
                    <th className="num">Dibawa</th>
                    <th className="num">Terpakai</th>
                    {isOwner && <th className="num">Nilai terpakai</th>}
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {history.map((ev, i) => {
                    const s = EVENT_STATUS[ev.status]
                    return (
                      <motion.tr
                        key={ev.id}
                        className="clickable"
                        onClick={() => navigate(`/events/${ev.id}`)}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i, 15) * 0.025 }}
                      >
                        <td className="cell-main" style={{ minWidth: 220 }}>
                          <div style={{ fontWeight: 500 }}>
                            {ev.name} {ev.created_by_staff && isOwner && <Badge>dibuat staff</Badge>}
                          </div>
                          <div className="muted" style={{ fontSize: 12 }}>
                            <span className="mono">{ev.code}</span>
                            {ev.location && <> · <MapPin size={11} style={{ verticalAlign: -1 }} /> {ev.location}</>}
                          </div>
                        </td>
                        <td data-label="Tanggal" style={{ whiteSpace: 'nowrap' }}>{fmtDate(ev.event_date)}</td>
                        {isOwner && (
                          <td data-label="Penanggung jawab" style={{ whiteSpace: 'nowrap' }}>
                            {ev.user ? ev.user.name : <Badge tone="warn">Belum ditugaskan</Badge>}
                            {ev.departed_at && <div className="muted" style={{ fontSize: 11.5 }}>berangkat {timeAgo(ev.departed_at)}</div>}
                          </td>
                        )}
                        <td data-label="Dibawa" className="num mono" style={{ whiteSpace: 'nowrap' }}>
                          {ev.status === 'scheduled' || (ev.totals.items === 0 && !ev.equipment?.items) ? <span className="muted">—</span> : <>{fmt(ev.totals.out)} <span className="muted">({ev.totals.items})</span>{ev.equipment?.items ? <div className="muted" style={{ fontSize: 11.5 }}>+ {ev.equipment.items} alat</div> : null}</>}
                        </td>
                        <td data-label="Terpakai" className="num mono">{ev.totals.used ?? <span className="muted">—</span>}</td>
                        {isOwner && <td data-label="Nilai terpakai" className="num mono" style={{ whiteSpace: 'nowrap' }}>{ev.totals.used_value != null ? fmtRp(ev.totals.used_value) : <span className="muted">—</span>}</td>}
                        <td data-label="Status"><Badge tone={s?.badge} dot>{s?.label}</Badge></td>
                        <td className="cell-arrow"><ChevronRight size={15} color="var(--muted)" /></td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          </>)}
        </>
      )}

      {!loading && data && !isOwner && (
        <div style={{ marginTop: 20 }}>
          <Accordion items={[{
            id: 'guide', icon: Truck, title: 'Cara pakai',
            lead: 'Pilih event, catat barang sebelum berangkat, lapor sisa saat pulang.',
            content: (
              <ol className="help-steps">
                <li><b>Event untukmu</b>: event yang dijadwalkan owner untukmu. Tekan <b>Catat barang</b>, centang barang yang dibawa, lalu <b>Berangkat</b>.</li>
                <li><b>Bisa diambil</b>: event yang belum ada penanggung jawabnya. Tekan <b>Ambil event ini</b> kalau kamu yang berangkat.</li>
                <li>Pulang dari event, buka event-nya lalu isi <b>barang tersisa</b>. Terpakai dihitung otomatis.</li>
                <li>Ada booking mendadak yang belum dijadwalkan? Pakai <b>Event mendadak</b>.</li>
              </ol>
            ),
          }]} defaultOpen={events.length === 0 ? 'guide' : null} />
        </div>
      )}

      <ScheduleEventModal open={scheduleOpen} onClose={() => setScheduleOpen(false)} onSaved={() => { reload(); reloadCal() }} defaultDate={scheduleDate} />
    </>
  )
}
