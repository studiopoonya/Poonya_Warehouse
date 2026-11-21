import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, MoveRight, Plus, Send, X, Truck } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import { Card, CardHead } from '../components/ui/Card'
import { ApiError, EmptyState, Skeleton } from '../components/ui/Feedback'
import { stagger } from '../components/ui/motion'
import { Items, Transfers as TransferApi } from '../api/endpoints'
import { errorMessage } from '../api/client'
import { useFetch } from '../hooks/useFetch'
import { useVenues } from '../context/VenueContext'
import { useToast } from '../context/ToastContext'
import { VenueIcon, venueMeta } from '../utils/venueMeta'
import { fmt, fmtDateTime } from '../utils/format'

const newLine = () => ({ key: Math.random().toString(36).slice(2), item_id: '', quantity: 1 })

function TransferForm({ onCreated }) {
  const { venues, myVenues, locked, refresh } = useVenues()
  const toast = useToast()
  const warehouse = venues.find((v) => v.type === 'warehouse')
  // staff hanya boleh mengirim dari venue-nya sendiri
  const origin = locked ? myVenues[0] : warehouse
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [lines, setLines] = useState([newLine()])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const { data: items, reload: reloadItems } = useFetch(() => Items.list(), [])

  // default: owner dari Warehouse ke booth pertama; staff booth dari venue-nya ke Warehouse
  useEffect(() => {
    if (!origin) return
    if (!from) setFrom(String(origin.id))
    if (!to) {
      const dest = origin.id !== warehouse?.id ? warehouse : venues.find((v) => v.id !== origin.id)
      if (dest) setTo(String(dest.id))
    }
  }, [venues, warehouse, origin, from, to])

  const available = useMemo(() => {
    const map = {}
    ;(items || []).forEach((it) => { map[it.id] = it.stocks.find((s) => s.venue_id === Number(from))?.quantity ?? 0 })
    return map
  }, [items, from])

  const fromV = venues.find((v) => v.id === Number(from))
  const toV = venues.find((v) => v.id === Number(to))
  const totalQty = lines.reduce((a, l) => a + (Number(l.quantity) || 0), 0)

  const updateLine = (key, patch) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))

  const submit = async () => {
    setSaving(true)
    setError(null)
    try {
      const t = await TransferApi.create({
        from_venue_id: Number(from),
        to_venue_id: Number(to),
        note,
        items: lines.filter((l) => l.item_id).map((l) => ({ item_id: Number(l.item_id), quantity: Number(l.quantity) })),
      })
      toast(`Transfer ${t.code} berhasil`)
      setLines([newLine()])
      setNote('')
      reloadItems()
      refresh()
      onCreated?.()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHead title="Buat transfer" sub="Pindahkan barang antar venue — stok asal berkurang, stok tujuan bertambah" />

      <div className="route">
        <div className="field">
          <label>Dari</label>
          <select className="select" value={from} onChange={(e) => setFrom(e.target.value)} disabled={locked} title={locked ? 'Staff hanya bisa mengirim dari venue sendiri' : undefined}>
            {myVenues.map((v) => <option key={v.id} value={v.id} disabled={String(v.id) === to}>{v.name}</option>)}
          </select>
        </div>
        <div className="route-arrow"><div className="track" /><ArrowRight size={16} style={{ background: 'var(--surface)', position: 'relative' }} /></div>
        <div className="field">
          <label>Ke</label>
          <select className="select" value={to} onChange={(e) => setTo(e.target.value)}>
            {venues.map((v) => <option key={v.id} value={v.id} disabled={String(v.id) === from}>{v.name}</option>)}
          </select>
        </div>
      </div>

      <div className="field mt">
        <label>Barang</label>
        <AnimatePresence initial={false}>
          {lines.map((l) => {
            const avail = l.item_id ? available[l.item_id] ?? 0 : null
            const over = avail !== null && Number(l.quantity) > avail
            return (
              <motion.div
                key={l.key}
                className="transfer-line"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <select className="select" value={l.item_id} onChange={(e) => updateLine(l.key, { item_id: e.target.value })}>
                  <option value="">Pilih barang</option>
                  {(items || []).map((it) => (
                    <option key={it.id} value={it.id}>{it.name} — tersedia {available[it.id] ?? 0}</option>
                  ))}
                </select>
                <input
                  className="input mono"
                  type="number"
                  min="1"
                  value={l.quantity}
                  style={over ? { borderColor: 'var(--danger)' } : undefined}
                  title={over ? `Maksimal ${avail}` : undefined}
                  onChange={(e) => updateLine(l.key, { quantity: e.target.value })}
                />
                <button className="icon-btn" onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((x) => x.key !== l.key) : ls))} aria-label="Hapus baris">
                  <X size={14} />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
        <button className="btn btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setLines((ls) => [...ls, newLine()])}>
          <Plus size={13} /> Tambah barang
        </button>
      </div>

      <div className="field mt">
        <label>Catatan</label>
        <textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: Restock untuk event weekend" />
      </div>

      {error && <div className="error-text mt">{error}</div>}

      <div className="row mt" style={{ borderTop: '1px dashed var(--border)', paddingTop: 14 }}>
        <div className="venue-flow muted">
          {fromV?.name} <MoveRight size={13} /> {toV?.name} · <b style={{ color: 'var(--text)' }}>{fmt(totalQty)} unit</b>
        </div>
        <motion.button whileTap={{ scale: 0.97 }} className="btn btn-dark" style={{ marginLeft: 'auto' }} onClick={submit} disabled={saving || !from || !to || from === to}>
          <Send size={14} /> {saving ? 'Memproses…' : 'Kirim transfer'}
        </motion.button>
      </div>
    </Card>
  )
}

export default function Transfers() {
  const { activeId } = useVenues()
  const { data, loading, error, reload } = useFetch(() => TransferApi.list({ venue_id: activeId }), [activeId])

  return (
    <>
      <PageHeader title="Transfer antar venue" sub={['Warehouse → Poonya Box SAT, Dobro, Self Studio — dan sebaliknya']} />
      {error && <ApiError message={error} onRetry={reload} />}

      <motion.div className="grid grid-split" variants={stagger} initial="hidden" animate="show">
        <TransferForm onCreated={reload} />

        <Card>
          <CardHead title="Riwayat transfer" sub={data ? `${data.length} transfer terakhir` : ''} />
          {loading && !data ? (
            <div className="stack">{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={56} />)}</div>
          ) : data?.length === 0 ? (
            <EmptyState icon={Truck} title="Belum ada transfer" text="Transfer pertama kamu akan muncul di sini." />
          ) : (
            <div className="list">
              <AnimatePresence initial={false}>
                {(data || []).map((t) => (
                  <motion.div key={t.id} layout className="list-item" initial={{ opacity: 0, y: -10, backgroundColor: '#e5f5e9' }} animate={{ opacity: 1, y: 0, backgroundColor: 'rgba(0,0,0,0)' }} transition={{ duration: 0.8 }} style={{ alignItems: 'flex-start' }}>
                    <span className="li-icon" style={{ background: venueMeta(t.to_venue).soft, color: venueMeta(t.to_venue).color }}>
                      <VenueIcon venue={t.to_venue} size={15} />
                    </span>
                    <div className="li-main">
                      <div className="li-title venue-flow">{t.from_venue.name} <MoveRight size={12} color="var(--muted)" /> {t.to_venue.name}</div>
                      <div className="li-sub">
                        {t.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}
                      </div>
                      {t.note && <div className="li-sub" style={{ fontStyle: 'italic' }}>“{t.note}”</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="badge">{fmt(t.total_qty)} unit</div>
                      <div className="mono muted" style={{ fontSize: 11, marginTop: 4 }}>{t.code}</div>
                      <div className="muted" style={{ fontSize: 11 }}>{fmtDateTime(t.created_at)}</div>
                      {t.user && <div className="muted" style={{ fontSize: 11 }}>oleh {t.user}</div>}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </Card>
      </motion.div>
    </>
  )
}
