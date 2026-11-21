import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, CalendarDays, ClipboardList, CircleCheck, TriangleAlert, User, Plus, Download } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import Segmented from '../components/ui/Segmented'
import { ApiError, Skeleton } from '../components/ui/Feedback'
import { stagger } from '../components/ui/motion'
import { VenueDot } from '../utils/venueMeta'
import { Opnames } from '../api/endpoints'
import { useFetch } from '../hooks/useFetch'
import { fmt, fmtDateTime, fmtRp } from '../utils/format'
import { blobErrorMessage, downloadFile } from '../api/client'
import { useToast } from '../context/ToastContext'

export default function OpnameDetail() {
  const { id } = useParams()
  const { data: op, loading, error, reload } = useFetch(() => Opnames.show(id), [id])
  const [view, setView] = useState('diff')
  const [exporting, setExporting] = useState(false)
  const toast = useToast()
  const exportXlsx = async () => {
    setExporting(true)
    try { await downloadFile(`/reports/opnames/${id}`, null, `opname-${id}.xlsx`) } catch (e) { toast(await blobErrorMessage(e), 'error') } finally { setExporting(false) }
  }

  if (error) return <ApiError message={error} onRetry={reload} />
  if (loading && !op) return <div className="stack"><Skeleton height={60} width={360} /><Skeleton height={130} /><Skeleton height={300} /></div>

  const t = op.totals
  const rows = view === 'diff' ? op.items.filter((l) => l.difference !== 0) : op.items

  return (
    <>
      <Link to="/opname" className="link-arrow" style={{ marginBottom: 12 }}><ArrowLeft size={13} /> Semua opname</Link>
      <PageHeader
        title={`Opname ${op.venue.name}`}
        sub={[<span key="c" className="mono">{op.code}</span>, t.mismatched ? `${t.mismatched} barang disesuaikan` : 'Semua sesuai']}
        actions={
          <>
            <button className="btn" onClick={exportXlsx} disabled={exporting}><Download size={15} /> {exporting ? 'Menyiapkan…' : 'Export Excel'}</button>
            <Link to={`/opname/new?venue=${op.venue.id}`} className="btn"><Plus size={15} /> Opname lagi</Link>
          </>
        }
      />
      <div className="event-meta">
        <span><CalendarDays size={14} /> {fmtDateTime(op.created_at)}</span>
        <span><VenueDot venue={op.venue} /> {op.venue.name}</span>
        <span><User size={14} /> {op.user ?? '—'}</span>
      </div>
      {op.note && <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>“{op.note}”</p>}

      <motion.div className="grid grid-3 mt" variants={stagger} initial="hidden" animate="show">
        <StatCard label="Barang dihitung" icon={ClipboardList} value={t.counted} />
        <StatCard variant="highlight" label="Sesuai sistem" icon={CircleCheck} value={t.matched} />
        <StatCard variant="dark" label="Ada selisih" icon={TriangleAlert} value={t.mismatched}
          foot={t.mismatched ? <span>+{fmt(t.plus)} / {fmt(t.minus)} unit{t.value_diff ? ` · ${fmtRp(t.value_diff)}` : ''}</span> : <span>tidak ada perubahan stok</span>} />
      </motion.div>

      <div className="card mt">
        <div className="card-head">
          <div>
            <div className="card-title">Hasil hitung</div>
            <div className="card-sub">Stok sistem sudah disamakan dengan hitungan fisik</div>
          </div>
          <div className="card-head-right">
            <Segmented value={view} onChange={setView} options={[{ value: 'diff', label: `Selisih (${t.mismatched})` }, { value: 'all', label: `Semua (${t.counted})` }]} />
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="empty" style={{ padding: 24 }}>Tidak ada selisih — semua hitungan sama dengan sistem 🎉</div>
        ) : (
          <div className="table-wrap">
            <table className="table responsive">
              <thead><tr><th>Barang</th><th className="num">Sistem</th><th className="num">Fisik</th><th className="num">Selisih</th></tr></thead>
              <tbody>
                {rows.map((l) => (
                  <tr key={l.item_id}>
                    <td className="cell-main">
                      <div style={{ fontWeight: 500 }}>{l.name}</div>
                      <div className="muted" style={{ fontSize: 12 }}><span className="mono">{l.sku}</span>{l.category ? ` · ${l.category}` : ''}</div>
                    </td>
                    <td data-label="Sistem" className="num"><span className="qty-pill">{fmt(l.system_qty)}</span></td>
                    <td data-label="Fisik" className="num"><span className="qty-pill">{fmt(l.counted_qty)}</span></td>
                    <td data-label="Selisih" className="num">
                      <span className={`qty-pill ${l.difference > 0 ? 'diff-plus' : l.difference < 0 ? 'diff-minus' : 'zero-used'}`}>
                        {l.difference > 0 ? `+${fmt(l.difference)}` : fmt(l.difference)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
