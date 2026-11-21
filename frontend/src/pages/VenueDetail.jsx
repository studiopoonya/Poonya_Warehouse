import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useVenues } from '../context/VenueContext'
import { motion } from 'framer-motion'
import { ArrowDownToLine, ArrowUpFromLine, Boxes, MapPin, Package, TriangleAlert, Layers, Wrench } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import { Card, CardHead } from '../components/ui/Card'
import { ApiError, Badge, EmptyState, Skeleton } from '../components/ui/Feedback'
import { stagger } from '../components/ui/motion'
import MovementFormModal from '../components/forms/MovementFormModal'
import { Items, Venues as VenueApi } from '../api/endpoints'
import { errorMessage } from '../api/client'
import { useToast } from '../context/ToastContext'
import { useFetch } from '../hooks/useFetch'
import { VenueIcon, venueMeta } from '../utils/venueMeta'
import { CONDITIONS, fmt, fmtDate, MOVEMENT_TYPES, timeAgo } from '../utils/format'

export default function VenueDetail() {
  const { id } = useParams()
  const { locked, activeId } = useVenues()
  // staff yang membuka venue lain langsung dialihkan ke venue-nya sendiri
  const forbidden = locked && activeId && Number(id) !== activeId
  const { data: v, loading, error, reload } = useFetch(() => (forbidden ? Promise.resolve(null) : VenueApi.show(id)), [id, forbidden])
  const [modal, setModal] = useState(null) // 'in' | 'out' | null
  const [savingCond, setSavingCond] = useState(null)
  const toast = useToast()

  if (forbidden) return <Navigate to={`/venues/${activeId}`} replace />
  if (error) return <ApiError message={error} onRetry={reload} />
  if (loading && !v) return <div className="stack"><Skeleton height={60} width={340} /><div className="grid grid-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={130} />)}</div></div>

  const m = venueMeta(v)
  const tools = v.stocks.filter((s) => s.item.kind === 'equipment')
  const consumables = v.stocks.filter((s) => s.item.kind !== 'equipment')
  const broken = tools.filter((s) => s.condition !== 'baik').length

  // ubah kondisi alat ("Status" di sheet lama): baik / rusak / servis
  const setCondition = async (s, condition) => {
    setSavingCond(s.item.id)
    try {
      await Items.setCondition(s.item.id, v.id, condition)
      toast(`${s.item.name}: ${CONDITIONS[condition].label}`)
      reload()
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setSavingCond(null)
    }
  }

  return (
    <>
      <div className="row" style={{ marginBottom: 10 }}>
        <motion.span
          className="venue-icon"
          style={{ background: m.color }}
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
        >
          <VenueIcon venue={v} size={18} />
        </motion.span>
        <Badge>{v.type_label}</Badge>
      </div>
      <PageHeader
        title={v.name}
        sub={[<span className="row" style={{ gap: 4 }} key="a"><MapPin size={13} /> {v.address || 'Alamat belum diisi'}</span>, `${v.items_count} jenis barang tersedia`]}
        actions={
          <>
            <button className="btn" onClick={() => setModal('out')}><ArrowUpFromLine size={15} /> Barang keluar</button>
            <button className="btn btn-dark" onClick={() => setModal('in')}><ArrowDownToLine size={15} /> Barang masuk</button>
          </>
        }
      />

      <motion.div className="grid grid-4" variants={stagger} initial="hidden" animate="show">
        <StatCard variant="highlight" label="Total unit" icon={Boxes} value={v.total_units} />
        <StatCard label="Jenis barang" icon={Package} value={v.items_count} />
        <StatCard label="Stok menipis" icon={TriangleAlert} value={v.low_stock_count} />
        <StatCard variant="dark" label="Transfer bulan ini" icon={Layers} value={v.transfers_in_month} />
      </motion.div>

      <motion.div className="grid grid-main mt" variants={stagger} initial="hidden" animate="show">
        <div className="stack">
        {tools.length > 0 && (
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '18px 18px 0' }}>
              <CardHead title={<span className="row" style={{ gap: 6 }}><Wrench size={15} /> Peralatan</span>} sub={broken ? `${broken} alat perlu perhatian` : 'Semua dalam kondisi baik'} />
            </div>
            <table className="table responsive">
              <thead>
                <tr><th>Alat</th><th className="num">Jumlah</th><th>Kondisi</th></tr>
              </thead>
              <tbody>
                {tools.map((s) => (
                  <tr key={s.item.id}>
                    <td className="cell-main">
                      <div style={{ fontWeight: 500 }}>{s.item.name}</div>
                      <div className="muted" style={{ fontSize: 11.5 }}>{s.item.category}{s.condition_at ? ` · dicek ${fmtDate(s.condition_at, { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}</div>
                    </td>
                    <td data-label="Jumlah" className="num mono"><b>{fmt(s.quantity)}</b> <span className="muted">{s.item.unit}</span></td>
                    <td data-label="Kondisi">
                      <select className={`select cond-select ${s.condition}`} value={s.condition} disabled={savingCond === s.item.id} onChange={(e) => setCondition(s, e.target.value)} aria-label={`Kondisi ${s.item.name}`}>
                        {Object.entries(CONDITIONS).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 18px 0' }}><CardHead title={tools.length ? <span className="row" style={{ gap: 6 }}><Package size={15} /> Barang habis pakai</span> : 'Stok di venue ini'} /></div>
          {consumables.length === 0 ? <EmptyState title="Belum ada barang habis pakai" text="Tambah lewat Barang masuk atau Transfer." /> : (
            <table className="table responsive">
              <thead>
                <tr><th>Barang</th><th>Kategori</th><th className="num">Stok</th><th style={{ width: 160 }}>Level</th></tr>
              </thead>
              <tbody>
                {consumables.map((s, i) => {
                  const pct = Math.min(100, (s.quantity / Math.max(1, s.min_stock * 2)) * 100)
                  const color = s.is_low ? 'var(--danger)' : m.color
                  return (
                    <tr key={s.item.id}>
                      <td className="cell-main">
                        <div style={{ fontWeight: 500 }}>{s.item.name}</div>
                        <div className="mono muted" style={{ fontSize: 11.5 }}>{s.item.sku}</div>
                      </td>
                      <td data-label="Kategori"><Badge>{s.item.category}</Badge></td>
                      <td data-label="Stok" className="num mono" style={{ whiteSpace: 'nowrap' }}>
                        <b style={{ color: s.is_low ? 'var(--danger)' : undefined }}>{fmt(s.quantity)}</b> <span className="muted">/ min {s.min_stock}</span>
                      </td>
                      <td data-label="Level" style={{ alignItems: 'stretch' }}>
                        <div className="progress">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.2 + Math.min(i, 12) * 0.04, duration: 0.8, ease: [0.16, 1, 0.3, 1] }} style={{ background: color }} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Card>
        </div>

        <Card>
          <CardHead title="Aktivitas terakhir" />
          <div className="list">
            {v.recent_movements.length === 0 && <EmptyState title="Belum ada aktivitas" />}
            {v.recent_movements.map((mv, i) => {
              const t = MOVEMENT_TYPES[mv.type] || { label: mv.type }
              return (
                <motion.div key={mv.id} className="list-item" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.05 }}>
                  <div className="li-main">
                    <div className="li-title">{mv.item.name}</div>
                    <div className="li-sub">{t.label} · {timeAgo(mv.created_at)}</div>
                  </div>
                  <span className="mono" style={{ fontWeight: 600, color: mv.change > 0 ? 'var(--accent-strong)' : 'var(--danger)' }}>
                    {mv.change > 0 ? '+' : ''}{mv.change}
                  </span>
                </motion.div>
              )
            })}
          </div>
        </Card>
      </motion.div>

      <MovementFormModal open={!!modal} defaultType={modal || 'in'} defaultVenueId={v.id} onClose={() => setModal(null)} onSaved={reload} />
    </>
  )
}
