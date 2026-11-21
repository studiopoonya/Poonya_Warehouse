import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Truck, Warehouse, CalendarDays, MapPin, Users, Wrench, Package } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import { ApiError, Skeleton } from '../components/ui/Feedback'
import Stepper from '../components/events/Stepper'
import ItemPicker from '../components/events/ItemPicker'
import EquipmentChecklist from '../components/events/EquipmentChecklist'
import { Events } from '../api/endpoints'
import { errorMessage } from '../api/client'
import { useFetch } from '../hooks/useFetch'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { fmt, fmtDate, todayISO } from '../utils/format'
import { VenueDot, venueMeta } from '../utils/venueMeta'

const emptyInfo = () => ({ name: '', location: '', event_date: todayISO(), crew: '', note: '' })

// Draf disimpan di browser supaya isian tidak hilang kalau halaman ter-refresh
const draftKey = (userId, eventId) => `eventDraft:${userId}${eventId ? `:${eventId}` : ''}`
const loadDraft = (userId, eventId) => {
  try { return JSON.parse(localStorage.getItem(draftKey(userId, eventId))) } catch { return null }
}

const slide = {
  enter: (dir) => ({ opacity: 0, x: dir * 40 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
  exit: (dir) => ({ opacity: 0, x: dir * -40, transition: { duration: 0.15 } }),
}

export default function EventNew() {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  // ?event=ID -> event yang dijadwalkan owner: info sudah ada, langsung pilih barang
  const eventId = Number(params.get('event')) || null
  const draft = useMemo(() => loadDraft(user?.id, eventId), [user?.id, eventId])
  const { data: sched, error: schedError } = useFetch(() => (eventId ? Events.show(eventId) : Promise.resolve(null)), [eventId])

  const [step, setStep] = useState(eventId ? 1 : draft?.step ?? 0)
  const [dir, setDir] = useState(1)
  const [info, setInfo] = useState(draft?.info ?? emptyInfo())
  const [picked, setPicked] = useState(draft?.picked ?? {})
  // "work done": peralatan yang sudah dicek sebelum berangkat
  const [checked, setChecked] = useState(draft?.checked ?? {})
  // daftar standar peralatan sudah dimasukkan otomatis (sekali saja, supaya pilihan staff tidak ditimpa)
  const [kitLoaded, setKitLoaded] = useState(draft?.kitLoaded ?? false)
  // gudang asal barang (null = gudang utama / gudang yang dipilih owner di jadwal)
  const [sourceId, setSourceId] = useState(draft?.sourceId ?? null)
  const [errors, setErrors] = useState({})
  const [confirm, setConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const { data, loading, error, reload } = useFetch(() => Events.availableItems(sourceId), [sourceId])
  const items = data?.data || []
  const byId = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items])
  const equipment = useMemo(() => items.filter((i) => i.kind === 'equipment'), [items])
  const consumables = useMemo(() => items.filter((i) => i.kind !== 'equipment'), [items])

  useEffect(() => {
    try { localStorage.setItem(draftKey(user?.id, eventId), JSON.stringify({ step, info, picked, checked, kitLoaded, sourceId })) } catch { /* abaikan */ }
  }, [step, info, picked, checked, kitLoaded, sourceId, user?.id, eventId])

  // isi otomatis peralatan standar (daftar Booth 1) — staff tinggal hapus yang tidak dibawa
  useEffect(() => {
    if (kitLoaded || !data) return
    const kit = Object.fromEntries(equipment.filter((i) => i.kit_qty && i.available > 0).map((i) => [i.id, Math.min(i.kit_qty, i.available)]))
    setPicked((p) => ({ ...kit, ...p }))
    setKitLoaded(true)
  }, [data, equipment, kitLoaded])

  // event terjadwal: pakai gudang yang dipilih owner
  useEffect(() => {
    if (eventId && sched?.source_venue?.id && sourceId === null) setSourceId(sched.source_venue.id)
  }, [eventId, sched, sourceId])

  // info yang ditampilkan: dari jadwal owner, atau isian staff sendiri
  const shown = eventId ? (sched || {}) : info
  const blocked = eventId && sched && (sched.status !== 'scheduled' || !sched.can_manage)

  const set = (k) => (e) => setInfo((f) => ({ ...f, [k]: e.target.value }))
  const go = (to) => { setDir(to > step ? 1 : -1); setStep(to) }

  const lines = Object.entries(picked).map(([id, qty]) => ({ item: byId[id], item_id: Number(id), quantity: qty })).filter((l) => l.item)
  const toolLines = lines.filter((l) => l.item.kind === 'equipment')
  const usedLines = lines.filter((l) => l.item.kind !== 'equipment')
  // unit yang memotong stok = barang habis pakai saja
  const totalUnits = usedLines.reduce((a, l) => a + (Number(l.quantity) || 0), 0)
  const consPicked = useMemo(() => Object.fromEntries(Object.entries(picked).filter(([id]) => byId[id]?.kind !== 'equipment')), [picked, byId])
  const pickTool = (id, qty) => setPicked((p) => { const n = { ...p }; if (qty === undefined) delete n[id]; else n[id] = qty; return n })
  const pickConsumables = (next) => setPicked((p) => ({ ...Object.fromEntries(Object.entries(p).filter(([id]) => byId[id]?.kind === 'equipment')), ...next }))
  const invalidLine = lines.find((l) => !l.quantity || l.quantity < 1 || l.quantity > l.item.available)

  const nextFromInfo = () => {
    const e = {}
    if (!info.name.trim()) e.name = 'Nama event wajib diisi'
    if (!info.event_date) e.event_date = 'Tanggal wajib diisi'
    setErrors(e)
    if (!Object.keys(e).length) go(1)
  }

  const submit = async () => {
    setSaving(true)
    setSubmitError(null)
    try {
      const payload = lines.map(({ item, item_id, quantity }) => ({ item_id, quantity: Number(quantity), ...(item.kind === 'equipment' ? { checked: !!checked[item_id] } : {}) }))
      const src = sourceId ?? data?.source_venue?.id
      const ev = eventId ? await Events.depart(eventId, payload, src) : await Events.create({ ...info, items: payload, source_venue_id: src })
      try { localStorage.removeItem(draftKey(user?.id, eventId)) } catch { /* abaikan */ }
      toast(`Event ${ev.code} dicatat. Selamat bertugas!`)
      navigate(`/events/${ev.id}`, { replace: true })
    } catch (e) {
      setSubmitError(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const reset = () => { setPicked({}); setChecked({}); setKitLoaded(false); if (!eventId) { setInfo(emptyInfo()); go(0) } }

  return (
    <>
      <PageHeader
        title={eventId ? (sched?.name ?? 'Catat barang') : 'Event mendadak'}
        sub={[eventId ? 'Pilih barang yang dibawa dari gudang' : 'Untuk booking yang belum dijadwalkan owner']}
        actions={((!eventId && info.name) || lines.length > 0) && <button className="btn btn-ghost" onClick={reset}>Mulai ulang</button>}
      />

      <Card className="mt" style={{ marginBottom: 14 }} initial="hidden" animate="show">
        <Stepper current={step} done={step} />
      </Card>

      {error && <ApiError message={error} onRetry={reload} />}
      {schedError && <ApiError message={schedError} />}
      {blocked && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="empty" style={{ padding: 24 }}>
            <div style={{ fontWeight: 600, color: 'var(--text)' }}>{sched.status !== 'scheduled' ? 'Barang untuk event ini sudah dicatat.' : 'Event ini bukan tanggung jawabmu.'}</div>
            <Link to={`/events/${eventId}`} className="btn" style={{ marginTop: 12 }}>Buka event</Link>
          </div>
        </div>
      )}

      {eventId && sched && !blocked && (
        <div className="sched-info">
          <span><CalendarDays size={14} /> {fmtDate(sched.event_date, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          {sched.location && <span><MapPin size={14} /> {sched.location}</span>}
          {sched.crew && <span><Users size={14} /> {sched.crew}</span>}
          {sched.note && <span className="muted">“{sched.note}”</span>}
        </div>
      )}

      {!blocked && (
      <AnimatePresence mode="wait" custom={dir}>
        {step === 0 ? (
          <motion.div key="info" custom={dir} variants={slide} initial="enter" animate="center" exit="exit">
            <div className="card">
              <div className="card-head"><div><div className="card-title">1. Info event</div><div className="card-sub">Nama staff otomatis: <b>{user?.name}</b></div></div></div>
              <form className="form-grid" onSubmit={(e) => { e.preventDefault(); nextFromInfo() }}>
                <div className="field full">
                  <label>Nama event *</label>
                  <input className="input" value={info.name} onChange={set('name')} placeholder="Misal: Wedding Budi & Ani" autoFocus style={errors.name ? { borderColor: 'var(--danger)' } : undefined} />
                  {errors.name && <span className="error-text">{errors.name}</span>}
                </div>
                <div className="field">
                  <label>Lokasi / venue event</label>
                  <input className="input" value={info.location} onChange={set('location')} placeholder="Misal: Hotel Grand Hyatt" />
                </div>
                <div className="field">
                  <label>Tanggal event *</label>
                  <input className="input" type="date" value={info.event_date} onChange={set('event_date')} />
                  {errors.event_date && <span className="error-text">{errors.event_date}</span>}
                </div>
                <div className="field full">
                  <label>Tim yang ikut (opsional)</label>
                  <input className="input" value={info.crew} onChange={set('crew')} placeholder="Misal: Andi, Sinta" />
                </div>
                <div className="field full">
                  <label>Catatan (opsional)</label>
                  <textarea className="textarea" value={info.note} onChange={set('note')} placeholder="Misal: paket 3 jam, unlimited print" />
                </div>
                <button type="submit" hidden />
              </form>
            </div>
            <div className="wizard-foot">
              <button className="btn btn-dark" onClick={nextFromInfo}>Lanjut pilih barang <ArrowRight size={15} /></button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="items" custom={dir} variants={slide} initial="enter" animate="center" exit="exit">
            <div className="card">
              <div className="card-head">
                <div>
                  <div className="card-title">2. Barang dibawa</div>
                  <div className="card-sub row" style={{ gap: 5 }}><Warehouse size={12} /> Diambil dari {data?.source_venue?.name ?? 'gudang'}</div>
                </div>
              </div>
              {data?.warehouses?.length > 1 && (
                <div className="field" style={{ marginBottom: 12 }}>
                  <label>Ambil dari gudang</label>
                  <div className="venue-pick">
                    {data.warehouses.map((w) => {
                      const active = w.id === (sourceId ?? data.source_venue.id)
                      return (
                        <button type="button" key={w.id} className={`venue-pick-btn ${active ? 'active' : ''}`} onClick={() => setSourceId(w.id)}>
                          {active && <motion.span layoutId="src-pick-bg" className="venue-pick-bg" style={{ borderColor: venueMeta(w).color }} transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}
                          <VenueDot venue={w} /> <span>{w.name}</span>{w.is_main && <span className="muted" style={{ fontSize: 11 }}>utama</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              {loading && !data ? (
                <div className="stack">{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={56} />)}</div>
              ) : (
                <>
                  <div className="section-label"><Wrench size={13} /> Peralatan booth</div>
                  <p className="muted" style={{ fontSize: 12.5, margin: '-4px 0 10px' }}>Dibawa pulang lagi, stok tidak berkurang. Sudah terisi daftar standar — hapus centang yang tidak dibawa.</p>
                  <EquipmentChecklist items={equipment} picked={picked} checked={checked} onPick={pickTool} onCheck={(id, v) => setChecked((c) => ({ ...c, [id]: v }))} />
                </>
              )}
            </div>

            <div className="card mt">
              <div className="section-label"><Package size={13} /> Barang habis pakai</div>
              <p className="muted" style={{ fontSize: 12.5, margin: '-4px 0 10px' }}>Stok gudang berkurang saat kamu berangkat, sisanya kembali saat lapor pulang.</p>
              {loading && !data ? (
                <div className="stack">{[0, 1, 2].map((i) => <Skeleton key={i} height={56} />)}</div>
              ) : (
                <ItemPicker items={consumables} picked={consPicked} onChange={pickConsumables} />
              )}
            </div>

            <div className="wizard-foot sticky">
              <button className="btn" onClick={() => (eventId ? navigate('/events') : go(0))}><ArrowLeft size={15} /> Kembali</button>
              <div className="wizard-summary">
                <b>{toolLines.length}</b> alat · <b>{usedLines.length}</b> barang · <b>{fmt(totalUnits)}</b> unit
              </div>
              <button className="btn btn-dark" disabled={!lines.length || !!invalidLine} onClick={() => { setSubmitError(null); setConfirm(true) }}>
                <Truck size={15} /> Berangkat
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      )}

      <Modal
        open={confirm}
        onClose={() => !saving && setConfirm(false)}
        title="Konfirmasi barang dibawa"
        footer={
          <>
            <button className="btn" onClick={() => setConfirm(false)} disabled={saving}>Cek lagi</button>
            <button className="btn btn-dark" onClick={submit} disabled={saving}><Truck size={15} /> {saving ? 'Menyimpan…' : 'Ya, berangkat'}</button>
          </>
        }
      >
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{shown.name}</div>
          <div className="muted" style={{ fontSize: 13 }}>
            {[shown.location, fmtDate(shown.event_date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Barang</th><th className="num">Jumlah</th></tr></thead>
            <tbody>
              {toolLines.length > 0 && <tr><td colSpan={2} className="muted" style={{ fontSize: 11.5, fontWeight: 600 }}>PERALATAN ({toolLines.length})</td></tr>}
              {toolLines.map((l) => (
                <tr key={l.item_id}>
                  <td>{l.item.name} {checked[l.item_id] ? <span className="badge green" style={{ fontSize: 10.5 }}>dicek</span> : <span className="badge warn" style={{ fontSize: 10.5 }}>belum dicek</span>}</td>
                  <td className="num mono">{l.quantity} <span className="muted">{l.item.unit}</span></td>
                </tr>
              ))}
              {usedLines.length > 0 && <tr><td colSpan={2} className="muted" style={{ fontSize: 11.5, fontWeight: 600 }}>BARANG HABIS PAKAI ({usedLines.length})</td></tr>}
              {usedLines.map((l) => (
                <tr key={l.item_id}><td>{l.item.name}</td><td className="num mono">{l.quantity} <span className="muted">{l.item.unit}</span></td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
          {usedLines.length > 0 && <>Stok {data?.source_venue?.name ?? 'gudang'} akan berkurang <b>{fmt(totalUnits)} unit</b>. </>}
          {toolLines.length > 0 && <>Peralatan tidak mengurangi stok, tapi dicek kembali saat pulang. </>}
          Semuanya kamu laporkan nanti saat pulang.
        </p>
        {submitError && <div className="error-text" style={{ marginTop: 8 }}>{submitError}</div>}
      </Modal>
    </>
  )
}
