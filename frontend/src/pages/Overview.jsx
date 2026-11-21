import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Boxes, Package, TriangleAlert, Plus, Download, ClipboardPlus, Wallet, CalendarClock, ChevronRight } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import { ApiError, Skeleton } from '../components/ui/Feedback'
import { stagger } from '../components/ui/motion'
import MovementChart from '../components/dashboard/MovementChart'
import LowStockCard from '../components/dashboard/LowStockCard'
import RecentTransfers from '../components/dashboard/RecentTransfers'
import VenueBreakdown from '../components/dashboard/VenueBreakdown'
import RecentActivity from '../components/dashboard/RecentActivity'
import MovementFormModal from '../components/forms/MovementFormModal'
import ScheduleEventModal from '../components/forms/ScheduleEventModal'
import WeekEvents from '../components/dashboard/WeekEvents'
import { Dashboard } from '../api/endpoints'
import { useFetch } from '../hooks/useFetch'
import { useVenues } from '../context/VenueContext'
import { useAuth } from '../context/AuthContext'
import { fmt, fmtDate, greeting, timeAgo } from '../utils/format'

const pctChange = (now, before) => (before ? Math.round(((now - before) / before) * 100) : null)

function exportCsv(data) {
  const rows = [['Tanggal', 'Masuk', 'Keluar', 'Transfer'], ...data.daily.map((d) => [d.date, d.in, d.out, d.transfer])]
  const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `pergerakan-stok-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
}

export default function Overview() {
  const { activeId, active } = useVenues()
  const { user } = useAuth()
  const { data, loading, error, reload } = useFetch(() => Dashboard.get({ venue_id: activeId }), [activeId])
  const [movementOpen, setMovementOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)

  const s = data?.stats
  const spark = (key) => (data?.daily || []).slice(-12).map((d) => d[key])

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user?.name?.split(' ')[0] ?? ''}`}
        sub={[
          fmtDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' }),
          active ? active.name : 'Semua venue',
          s && `${fmt(s.transfers_this_month)} transfer bulan ini`,
        ]}
        actions={
          <>
            <button className="btn hide-mobile" onClick={() => data && exportCsv(data)} disabled={!data}><Download size={15} /> Export</button>
            <button className="btn" onClick={() => setMovementOpen(true)}><ClipboardPlus size={15} /> Catat stok</button>
            <Link to="/transfers" className="btn btn-dark"><Plus size={15} /> Transfer baru</Link>
          </>
        }
      />

      {error && <ApiError message={error} onRetry={reload} />}

      {data?.overdue_events?.length > 0 && (
        <motion.div className="overdue-banner" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <CalendarClock size={18} style={{ flex: 'none' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>{data.overdue_events.length} event belum lapor sisa barang lebih dari 1 hari</b>
            <div className="overdue-links">
              {data.overdue_events.map((e) => (
                <Link key={e.id} to={`/events/${e.id}`}>{e.name} · {e.staff ?? 'staff'} · {timeAgo(e.departed_at)} <ChevronRight size={12} /></Link>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {loading && !data ? (
        <div className="grid grid-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={130} />)}</div>
      ) : data && (
        <>
          {!activeId && (
            <motion.div variants={stagger} initial="hidden" animate="show" style={{ marginBottom: 14 }}>
              <WeekEvents events={data.events_week} onSchedule={() => setScheduleOpen(true)} />
            </motion.div>
          )}
          <motion.div className="grid grid-4" variants={stagger} initial="hidden" animate="show">
            <StatCard
              variant="highlight"
              label="Total unit stok"
              icon={Boxes}
              value={s.total_units}
              delta={pctChange(s.in_this_month, s.in_last_month)}
              deltaLabel="unit masuk vs bulan lalu"
              spark={spark('in')}
            />
            <StatCard label="Jenis barang" icon={Package} value={s.total_items} foot={<span>{s.total_categories} kategori</span>} />
            <StatCard
              label="Stok menipis"
              icon={TriangleAlert}
              value={s.low_stock_count}
              foot={<span className={s.out_of_stock_count ? 'badge danger' : 'badge green'}>{s.out_of_stock_count} habis</span>}
            />
            <StatCard
              variant="dark"
              label="Nilai stok"
              icon={Wallet}
              prefix="Rp"
              value={s.total_value}
              foot={<span>{fmt(s.transfers_this_month)} transfer bulan ini</span>}
            />
          </motion.div>

          <motion.div className="grid grid-main mt" variants={stagger} initial="hidden" animate="show">
            <MovementChart daily={data.daily} />
            <LowStockCard count={s.low_stock_count} outCount={s.out_of_stock_count} items={data.low_stock} />
          </motion.div>

          <motion.div className="grid grid-2 mt" variants={stagger} initial="hidden" animate="show">
            <RecentTransfers transfers={data.recent_transfers} />
            <RecentActivity movements={data.recent_movements} />
          </motion.div>

          {!activeId && (
            <div className="mt-lg">
              <div className="row" style={{ marginBottom: 12 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600 }}>Ringkasan per venue</h2>
                <Link to="/venues" className="link-arrow" style={{ marginLeft: 'auto' }}>Kelola venue</Link>
              </div>
              <VenueBreakdown venues={data.venues} />
            </div>
          )}
        </>
      )}

      <ScheduleEventModal open={scheduleOpen} onClose={() => setScheduleOpen(false)} onSaved={reload} />
      <MovementFormModal open={movementOpen} onClose={() => setMovementOpen(false)} defaultVenueId={activeId} onSaved={reload} />
    </>
  )
}
