import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronRight, ClipboardCheck, Plus } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { ApiError, EmptyState, Skeleton } from '../components/ui/Feedback'
import { stagger } from '../components/ui/motion'
import { Opnames as OpnameApi } from '../api/endpoints'
import { useFetch } from '../hooks/useFetch'
import { useVenues } from '../context/VenueContext'
import { VenueDot, VenueIcon, venueMeta } from '../utils/venueMeta'
import { fmt, fmtDateTime, timeAgo } from '../utils/format'

export default function Opnames() {
  const { venues } = useVenues()
  const navigate = useNavigate()
  const { data, loading, error, reload } = useFetch(() => OpnameApi.list(), [])
  const list = data || []
  const lastByVenue = Object.fromEntries(venues.map((v) => [v.id, list.find((o) => o.venue.id === v.id)]))

  return (
    <>
      <PageHeader
        title="Stock opname"
        sub={['Hitung fisik barang per venue dan samakan dengan stok sistem']}
        actions={<Link to="/opname/new" className="btn btn-dark"><Plus size={15} /> Mulai opname</Link>}
      />

      {error && <ApiError message={error} onRetry={reload} />}

      {/* terakhir opname per venue */}
      <motion.div className="grid grid-4" variants={stagger} initial="hidden" animate="show">
        {venues.map((v) => {
          const last = lastByVenue[v.id]
          const m = venueMeta(v)
          return (
            <Card key={v.id} className="venue-card" hover onClick={() => navigate(`/opname/new?venue=${v.id}`)}>
              <div className="row">
                <span className="venue-icon" style={{ background: m.color, width: 34, height: 34 }}><VenueIcon venue={v} size={16} /></span>
                <div style={{ fontWeight: 600 }}>{v.name}</div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: 12 }}>Opname terakhir</div>
                <div style={{ fontWeight: 600, marginTop: 2 }}>{last ? timeAgo(last.created_at) : 'Belum pernah'}</div>
                {last && (
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                    {last.totals.mismatched ? `${last.totals.mismatched} barang selisih` : 'Semua sesuai'}
                  </div>
                )}
              </div>
              <span className="link-arrow">Hitung sekarang <ChevronRight size={13} /></span>
            </Card>
          )
        })}
      </motion.div>

      <h2 style={{ fontSize: 16, fontWeight: 600, margin: '24px 0 12px' }}>Riwayat opname</h2>

      {loading && !data ? (
        <div className="stack">{[0, 1, 2].map((i) => <Skeleton key={i} height={56} />)}</div>
      ) : list.length === 0 ? (
        <div className="card">
          <EmptyState icon={ClipboardCheck} title="Belum ada stock opname" text="Pilih venue di atas untuk mulai menghitung." />
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table responsive">
            <thead>
              <tr><th>Opname</th><th>Venue</th><th>Oleh</th><th className="num">Dihitung</th><th className="num">Selisih</th><th /></tr>
            </thead>
            <tbody>
              {list.map((o, i) => (
                <motion.tr
                  key={o.id}
                  className="clickable"
                  onClick={() => navigate(`/opname/${o.id}`)}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 15) * 0.025 }}
                >
                  <td className="cell-main">
                    <div style={{ fontWeight: 500 }} className="mono">{o.code}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{fmtDateTime(o.created_at)}{o.note ? ` · ${o.note}` : ''}</div>
                  </td>
                  <td data-label="Venue"><span className="row" style={{ gap: 6 }}><VenueDot venue={o.venue} />{o.venue.name}</span></td>
                  <td data-label="Oleh">{o.user ?? '—'}</td>
                  <td data-label="Dihitung" className="num mono">{fmt(o.totals.counted)}</td>
                  <td data-label="Selisih" className="num">
                    {o.totals.mismatched
                      ? <span className="mono"><span style={{ color: 'var(--accent-strong)' }}>+{fmt(o.totals.plus)}</span> / <span style={{ color: 'var(--danger)' }}>{fmt(o.totals.minus)}</span></span>
                      : <span className="badge green">Sesuai</span>}
                  </td>
                  <td className="cell-arrow"><ChevronRight size={15} color="var(--muted)" /></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
