import { useState } from 'react'
import { motion } from 'framer-motion'
import { ClipboardPlus, History } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import { ApiError, Badge, EmptyState, Skeleton } from '../components/ui/Feedback'
import MovementFormModal from '../components/forms/MovementFormModal'
import { Movements as MovementApi } from '../api/endpoints'
import { useFetch } from '../hooks/useFetch'
import { useVenues } from '../context/VenueContext'
import { VenueDot } from '../utils/venueMeta'
import { fmtDateTime, MOVEMENT_TYPES } from '../utils/format'

const FILTERS = [
  { value: '', label: 'Semua' },
  { value: 'in', label: 'Masuk' },
  { value: 'out', label: 'Keluar' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'adjust', label: 'Penyesuaian' },
  { value: 'event', label: 'Event' },
]

export default function Movements() {
  const { activeId } = useVenues()
  const [type, setType] = useState('')
  const [open, setOpen] = useState(false)
  const { data, loading, error, reload } = useFetch(() => MovementApi.list({ venue_id: activeId, type }), [activeId, type])

  return (
    <>
      <PageHeader
        title="Riwayat stok"
        sub={['Semua barang masuk, keluar, transfer & stock opname']}
        actions={<button className="btn btn-dark" onClick={() => setOpen(true)}><ClipboardPlus size={15} /> Catat stok</button>}
      />

      <div className="toolbar">
        <div className="chips">
          {FILTERS.map((f) => (
            <button key={f.value} className={`chip ${type === f.value ? 'active' : ''}`} onClick={() => setType(f.value)}>{f.label}</button>
          ))}
        </div>
      </div>

      {error && <ApiError message={error} onRetry={reload} />}

      {loading && !data ? (
        <div className="stack">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} height={44} />)}</div>
      ) : data?.length === 0 ? (
        <div className="card"><EmptyState icon={History} title="Belum ada riwayat" /></div>
      ) : data && (
        <div className="table-wrap">
          <table className="table responsive">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Barang</th>
                <th>Venue</th>
                <th>Jenis</th>
                <th className="num">Jumlah</th>
                <th className="num">Stok akhir</th>
                <th>Catatan</th>
                <th>Oleh</th>
              </tr>
            </thead>
            <tbody>
              {data.map((m, i) => {
                const t = MOVEMENT_TYPES[m.type] || { label: m.type }
                return (
                  <motion.tr key={m.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 20) * 0.02 }}>
                    <td data-label="Waktu" className="mono muted" style={{ fontSize: 12, whiteSpace: 'nowrap', order: 5 }}>{fmtDateTime(m.created_at)}</td>
                    <td className="cell-main" style={{ order: -1 }}>
                      <div style={{ fontWeight: 500 }}>{m.item.name}</div>
                      <div className="mono muted" style={{ fontSize: 11.5 }}>{m.item.sku}</div>
                    </td>
                    <td data-label="Venue" style={{ order: 4 }}><span className="row" style={{ gap: 6 }}><VenueDot venue={m.venue} />{m.venue.name}</span></td>
                    <td data-label="Jenis"><Badge tone={t.badge}>{t.label}</Badge></td>
                    <td data-label="Jumlah" className="num mono" style={{ fontWeight: 600, color: m.change > 0 ? 'var(--accent-strong)' : m.change < 0 ? 'var(--danger)' : undefined }}>
                      {m.change > 0 ? '+' : ''}{m.change}
                    </td>
                    <td data-label="Stok akhir" className="num mono">{m.balance_after}</td>
                    <td data-label="Catatan" className="muted cell-main" style={{ maxWidth: 260, order: 7 }}>{m.note || (m.transfer_code ? `Transfer ${m.transfer_code}` : '—')}</td>
                    <td data-label="Oleh" style={{ whiteSpace: 'nowrap', order: 6 }}>{m.user || <span className="muted">—</span>}</td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <MovementFormModal open={open} onClose={() => setOpen(false)} defaultVenueId={activeId} onSaved={reload} />
    </>
  )
}
