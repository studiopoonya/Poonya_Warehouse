import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, CalendarDays, MapPin, Users, User, Ban, ClipboardCheck, Pencil, Hourglass, PackageCheck, PackageOpen, Package, Truck, Hand, CalendarClock, TriangleAlert, Wrench, Check } from 'lucide-react'
import ScheduleEventModal from '../components/forms/ScheduleEventModal'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import Modal from '../components/ui/Modal'
import { ApiError, Badge, Skeleton } from '../components/ui/Feedback'
import { stagger } from '../components/ui/motion'
import Stepper from '../components/events/Stepper'
import ReturnForm, { hasOverflow } from '../components/events/ReturnForm'
import { Events } from '../api/endpoints'
import { errorMessage } from '../api/client'
import { useFetch } from '../hooks/useFetch'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { EVENT_STATUS, fmtDate, fmtDateTime, fmtRp, timeAgo } from '../utils/format'

export default function EventDetail() {
  const { id } = useParams()
  const { isOwner, user } = useAuth()
  const toast = useToast()
  const { data: ev, loading, error, reload, setData } = useFetch(() => Events.show(id), [id])

  const [values, setValues] = useState({})
  const [damaged, setDamaged] = useState({})
  const [reportNote, setReportNote] = useState('')
  const [editing, setEditing] = useState(false) // owner mengoreksi laporan yang sudah selesai
  const [confirm, setConfirm] = useState(null) // 'report' | 'cancel'
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)
  const [editOpen, setEditOpen] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const navigate = useNavigate()

  // isi awal form sisa: kosong (wajib dihitung) atau nilai lama saat koreksi
  useEffect(() => {
    if (!ev) return
    // peralatan: anggap semua kembali (staff tinggal ubah yang rusak/hilang); habis pakai: wajib dihitung
    setValues(Object.fromEntries(ev.items.map((l) => [l.item_id, l.qty_returned ?? (l.is_equipment ? l.qty_out : '')])))
    setDamaged(Object.fromEntries(ev.items.map((l) => [l.item_id, l.qty_damaged || ''])))
    setReportNote(ev.report_note ?? '')
  }, [ev, editing])

  if (error) return <ApiError message={error} onRetry={reload} />
  if (loading && !ev) return <div className="stack"><Skeleton height={60} width={360} /><Skeleton height={90} /><Skeleton height={300} /></div>

  const status = EVENT_STATUS[ev.status]
  // Form sisa hanya untuk staff yang membawa barang. Owner cukup melihat laporan
  // (kecuali owner sendiri yang mencatat event ini, atau sedang mengoreksi laporan).
  const isCreator = ev.user?.id === user?.id
  const showForm = (ev.status === 'ongoing' && isCreator) || (ev.status === 'completed' && editing && isOwner)
  const waitingReport = ev.status === 'ongoing' && !isCreator
  const missing = ev.items.filter((l) => values[l.item_id] === '' || values[l.item_id] === undefined).length
  const tools = ev.items.filter((l) => l.is_equipment)
  const consumables = ev.items.filter((l) => !l.is_equipment)
  const eq = ev.equipment || {}
  // alat yang akan tercatat hilang kalau laporan disimpan
  const lostNow = tools.reduce((a, l) => a + Math.max(0, l.qty_out - (Number(values[l.item_id]) || 0) - (Number(damaged[l.item_id]) || 0)), 0)

  const submitReport = async () => {
    setSaving(true)
    setFormError(null)
    try {
      const updated = await Events.report(ev.id, ev.items.map((l) => ({ item_id: l.item_id, qty_returned: Number(values[l.item_id]), qty_damaged: Number(damaged[l.item_id]) || 0 })), reportNote)
      setData(updated)
      setEditing(false)
      setConfirm(null)
      toast(editing ? 'Laporan dikoreksi, stok gudang disesuaikan' : 'Sisa barang dilaporkan & kembali ke stok gudang')
    } catch (e) {
      setFormError(errorMessage(e))
      setConfirm(null)
    } finally {
      setSaving(false)
    }
  }

  const claim = async () => {
    setClaiming(true)
    try {
      await Events.claim(ev.id)
      toast('Event ini sekarang tanggung jawabmu')
      navigate(`/events/new?event=${ev.id}`)
    } catch (e) {
      toast(errorMessage(e), 'error')
      reload()
    } finally {
      setClaiming(false)
    }
  }

  const scheduled = ev.status === 'scheduled'

  const cancelEvent = async () => {
    setSaving(true)
    try {
      setData(await Events.cancel(ev.id))
      toast(scheduled ? 'Jadwal event dibatalkan' : 'Event dibatalkan, semua barang kembali ke gudang')
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setSaving(false)
      setConfirm(null)
    }
  }

  return (
    <>
      <Link to="/events" className="link-arrow" style={{ marginBottom: 12 }}><ArrowLeft size={13} /> Semua event</Link>

      <PageHeader
        title={ev.name}
        sub={[
          <span key="c" className="mono">{ev.code}</span>,
          <Badge key="s" tone={status?.badge} dot>{status?.label}</Badge>,
        ]}
        actions={isOwner && (
          <>
            {scheduled && <button className="btn" onClick={() => setEditOpen(true)}><Pencil size={15} /> Ubah jadwal</button>}
            {(scheduled || ev.status === 'ongoing') && <button className="btn btn-danger" onClick={() => setConfirm('cancel')}><Ban size={15} /> Batalkan event</button>}
            {ev.status === 'completed' && !editing && <button className="btn" onClick={() => setEditing(true)}><Pencil size={15} /> Koreksi laporan</button>}
          </>
        )}
      />

      <div className="event-meta">
        <span><CalendarDays size={14} /> {fmtDate(ev.event_date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        {ev.location && <span><MapPin size={14} /> {ev.location}</span>}
        <span><User size={14} /> {ev.user ? <>Penanggung jawab: <b>{ev.user.name}</b></> : <Badge tone="warn">Belum ditugaskan</Badge>}</span>
        {ev.created_by_staff && <span><Badge>dibuat staff</Badge></span>}
        {ev.crew && <span><Users size={14} /> {ev.crew}</span>}
      </div>
      {ev.note && <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>“{ev.note}”</p>}
      {ev.report_note && ev.status === 'completed' && (
        <div className="report-note mt"><b>Catatan laporan{ev.returned_by ? ` dari ${ev.returned_by}` : ''}:</b> {ev.report_note}</div>
      )}

      {ev.status !== 'cancelled' && (
        <div className="card mt">
          <Stepper current={scheduled ? 1 : 2} done={scheduled ? 1 : ev.status === 'completed' ? 3 : 2} />
        </div>
      )}

      {scheduled && (
        <div className="card mt sched-panel">
          <span className="li-icon" style={{ width: 44, height: 44, background: 'var(--info-soft)', color: 'var(--info)' }}><CalendarClock size={20} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>
              {ev.can_manage && !isOwner ? 'Event ini untukmu' : ev.can_claim ? 'Event ini belum ada penanggung jawabnya' : ev.user ? `Menunggu ${ev.user.name} mencatat barang` : 'Belum ditugaskan ke staff'}
            </div>
            <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
              {ev.can_manage && !isOwner
                ? 'Sebelum berangkat, catat barang yang dibawa dari gudang.'
                : ev.can_claim
                  ? 'Kalau kamu yang berangkat, ambil event ini supaya tercatat atas namamu.'
                  : isOwner && !ev.user
                    ? 'Semua staff bisa melihat & mengambil event ini. Atau pilih penanggung jawab lewat Ubah jadwal.'
                    : 'Stok gudang baru berkurang setelah barang dicatat.'}
            </div>
          </div>
          {ev.can_manage && !isOwner && (
            <Link to={`/events/new?event=${ev.id}`} className="btn btn-dark"><Truck size={15} /> Catat barang & berangkat</Link>
          )}
          {ev.can_claim && (
            <button className="btn btn-accent" onClick={claim} disabled={claiming}><Hand size={15} /> {claiming ? 'Mengambil…' : 'Ambil event ini'}</button>
          )}
        </div>
      )}

      {ev.status === 'cancelled' && (
        <div className="api-error mt" style={{ background: 'var(--danger-soft)', borderColor: '#f6cdc9', color: 'var(--danger)' }}>
          <Ban size={18} style={{ flex: 'none' }} />
          <div>Event ini dibatalkan.{ev.items.length > 0 && <> Semua barang yang dibawa sudah dikembalikan ke stok {ev.source_venue?.name}.</>}</div>
        </div>
      )}

      {waitingReport && (
        <>
          <div className="report-wait mt">
            <Hourglass size={18} style={{ flex: 'none' }} />
            <div>
              <div style={{ fontWeight: 600 }}>Menunggu laporan sisa barang dari {ev.user?.name ?? 'staff'}</div>
              <div style={{ fontSize: 13, marginTop: 2 }}>
                Barang keluar dari {ev.source_venue?.name} {timeAgo(ev.departed_at)}. Angka tersisa &amp; terpakai muncul setelah staff melapor.
              </div>
            </div>
          </div>
          <motion.div className="grid grid-3 mt" variants={stagger} initial="hidden" animate="show">
            <StatCard label="Dibawa" icon={PackageOpen} value={ev.totals.out} suffix="unit" foot={<span>{ev.totals.items} jenis barang</span>} />
            <StatCard label="Kembali ke gudang" icon={PackageCheck} value={0} foot={<span>belum dilaporkan</span>} />
            <StatCard variant="dark" label="Terpakai" icon={Package} value={0} foot={<span>belum dilaporkan</span>} />
          </motion.div>
        </>
      )}

      {ev.status === 'completed' && !editing && (
        <motion.div className={`grid ${ev.totals.damaged ? 'grid-4' : 'grid-3'} mt`} variants={stagger} initial="hidden" animate="show">
          <StatCard label="Dibawa" icon={PackageOpen} value={ev.totals.out} suffix="unit" foot={<span>{ev.totals.items} jenis barang</span>} />
          <StatCard label="Kembali ke gudang" icon={PackageCheck} value={ev.totals.returned} suffix="unit" />
          {ev.totals.damaged > 0 && (
            <StatCard variant="danger-card" label="Rusak / hilang" icon={TriangleAlert} value={ev.totals.damaged} suffix="unit" foot={ev.totals.damaged_value ? <span>senilai {fmtRp(ev.totals.damaged_value)}</span> : null} />
          )}
          <StatCard variant="dark" label="Terpakai" icon={Package} value={ev.totals.used} suffix="unit" foot={ev.totals.used_value != null ? <span>senilai {fmtRp(ev.totals.used_value)}</span> : null} />
        </motion.div>
      )}
      {ev.status === 'completed' && !editing && eq.items > 0 && (
        <div className={`equip-banner mt ${eq.lost ? 'bad' : eq.damaged ? 'warn' : ''}`}>
          <Wrench size={16} style={{ flex: 'none' }} />
          <div>
            <b>Peralatan: {eq.items} alat ({eq.out} unit)</b>{' — '}
            {!eq.lost && !eq.damaged
              ? 'semua kembali dalam kondisi baik.'
              : [eq.damaged ? `${eq.damaged} rusak (ditandai di inventaris)` : null, eq.lost ? `${eq.lost} hilang (stok dikurangi${eq.lost_value ? `, senilai ${fmtRp(eq.lost_value)}` : ''})` : null].filter(Boolean).join(' · ')}
          </div>
        </div>
      )}

      {!scheduled && (
      <div className="card mt">
        <div className="card-head">
          <div>
            <div className="card-title">
              {showForm ? (editing ? 'Koreksi barang tersisa' : '3. Barang tersisa') : 'Laporan barang'}
            </div>
            <div className="card-sub">
              {showForm
                ? (tools.length ? 'Cek peralatan yang kembali, lalu hitung sisa barang habis pakai. ' : '') + 'Barang habis pakai: terpakai = dibawa − tersisa − rusak/hilang.'
                : ev.status === 'completed'
                  ? `Dilaporkan ${ev.returned_by ? `oleh ${ev.returned_by} ` : ''}${fmtDateTime(ev.returned_at)}`
                  : `Berangkat ${fmtDateTime(ev.departed_at)} dari ${ev.source_venue?.name}`}
            </div>
          </div>
        </div>

        {showForm ? (
          <>
            <ReturnForm lines={ev.items} values={values} onChange={setValues} damaged={damaged} onDamagedChange={setDamaged} />
            <div className="field mt">
              <label>Catatan laporan (opsional)</label>
              <textarea className="textarea" value={reportNote} onChange={(e) => setReportNote(e.target.value)} placeholder="Misal: kamera jatuh dari tripod, 2 frame sobek" />
            </div>
            {formError && <div className="error-text mt">{formError}</div>}
            <div className="wizard-foot sticky" style={{ marginTop: 16 }}>
              {editing && <button className="btn" onClick={() => setEditing(false)}>Batal</button>}
              <button className="btn btn-dark" disabled={missing > 0 || saving || hasOverflow(ev.items, values, damaged)} onClick={() => setConfirm('report')}>
                <ClipboardCheck size={15} /> {editing ? 'Simpan koreksi' : 'Simpan laporan'}
              </button>
            </div>
          </>
        ) : (
          <>
          {tools.length > 0 && (
            <div className="table-wrap" style={{ marginBottom: consumables.length ? 18 : 0 }}>
              <div className="section-label"><Wrench size={13} /> Peralatan · {eq.checked}/{eq.items} dicek sebelum berangkat</div>
              <table className="table responsive">
                <thead>
                  <tr>
                    <th>Alat</th>
                    <th className="num">Dibawa</th>
                    <th className="num">Dicek</th>
                    {ev.status === 'completed' && <><th className="num">Kembali baik</th><th className="num">Rusak</th><th className="num">Hilang</th></>}
                  </tr>
                </thead>
                <tbody>
                  {tools.map((l) => (
                    <tr key={l.item_id}>
                      <td className="cell-main"><div style={{ fontWeight: 500 }}>{l.name}</div><div className="muted mono" style={{ fontSize: 11.5 }}>{l.sku}</div></td>
                      <td data-label="Dibawa" className="num"><span className="qty-pill">{l.qty_out}</span></td>
                      <td data-label="Dicek" className="num">{l.checked ? <span className="badge green"><Check size={11} /> dicek</span> : <span className="badge warn">belum</span>}</td>
                      {ev.status === 'completed' && (
                        <>
                          <td data-label="Kembali baik" className="num"><span className="qty-pill">{l.qty_returned}</span></td>
                          <td data-label="Rusak" className="num"><span className={`qty-pill ${l.qty_damaged ? 'warn-pill' : 'zero-used'}`}>{l.qty_damaged || 0}</span></td>
                          <td data-label="Hilang" className="num"><span className={`qty-pill ${l.qty_lost ? 'diff-minus' : 'zero-used'}`}>{l.qty_lost || 0}</span></td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {consumables.length > 0 && (
          <div className="table-wrap">
            {tools.length > 0 && <div className="section-label"><Package size={13} /> Barang habis pakai</div>}
            <table className="table responsive">
              <thead>
                <tr>
                  <th>Barang</th>
                  <th className="num">Dibawa</th>
                  {(ev.status === 'completed' || waitingReport) && <><th className="num">Tersisa</th>{ev.totals.damaged > 0 && <th className="num">Rusak/hilang</th>}<th className="num">Terpakai</th></>}
                </tr>
              </thead>
              <tbody>
                {consumables.map((l, i) => (
                  <motion.tr key={l.item_id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 15) * 0.03 }}>
                    <td className="cell-main">
                      <div style={{ fontWeight: 500 }}>{l.name}</div>
                      <div className="muted mono" style={{ fontSize: 11.5 }}>{l.sku}</div>
                    </td>
                    <td data-label="Dibawa" className="num"><span className="qty-pill">{l.qty_out}</span></td>
                    {waitingReport && (
                      <>
                        <td data-label="Tersisa" className="num"><span className="muted">—</span></td>
                        <td data-label="Terpakai" className="num"><span className="muted">—</span></td>
                      </>
                    )}
                    {ev.status === 'completed' && (
                      <>
                        <td data-label="Tersisa" className="num"><span className="qty-pill">{l.qty_returned}</span></td>
                        {ev.totals.damaged > 0 && <td data-label="Rusak/hilang" className="num"><span className={`qty-pill ${l.qty_damaged ? 'diff-minus' : 'zero-used'}`}>{l.qty_damaged || 0}</span></td>}
                        <td data-label="Terpakai" className="num"><span className={`qty-pill ${l.qty_used > 0 ? 'used' : 'zero-used'}`}>{l.qty_used}</span></td>
                      </>
                    )}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
          </>
        )}

      </div>
      )}

      <Modal
        open={confirm === 'report'}
        onClose={() => !saving && setConfirm(null)}
        title={editing ? 'Simpan koreksi?' : 'Simpan laporan sisa?'}
        width={440}
        footer={
          <>
            <button className="btn" onClick={() => setConfirm(null)} disabled={saving}>Cek lagi</button>
            <button className="btn btn-dark" onClick={submitReport} disabled={saving}>{saving ? 'Menyimpan…' : 'Ya, simpan'}</button>
          </>
        }
      >
        <p>
          {editing
            ? 'Stok gudang akan disesuaikan sebesar selisih dari laporan sebelumnya.'
            : <>Barang yang tersisa akan dikembalikan ke stok <b>{ev.source_venue?.name}</b>. Setelah disimpan, laporan hanya bisa diubah oleh owner.</>}
        </p>
        {lostNow > 0 && (
          <p className="error-text" style={{ marginTop: 10 }}><TriangleAlert size={13} style={{ verticalAlign: -2 }} /> {lostNow} unit peralatan tercatat <b>hilang</b> dan akan dikurangi dari stok gudang.</p>
        )}
      </Modal>

      <Modal
        open={confirm === 'cancel'}
        onClose={() => !saving && setConfirm(null)}
        title="Batalkan event?"
        width={440}
        footer={
          <>
            <button className="btn" onClick={() => setConfirm(null)} disabled={saving}>Tidak</button>
            <button className="btn btn-dark" style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={cancelEvent} disabled={saving}>Ya, batalkan</button>
          </>
        }
      >
        <p>{scheduled
          ? <>Jadwal <b>{ev.name}</b> dibatalkan{ev.user ? ` dan hilang dari akun ${ev.user.name}` : ''}. Stok tidak berubah karena barang belum dibawa.</>
          : <>Semua barang yang dibawa ({ev.totals.out} unit) akan dikembalikan ke stok {ev.source_venue?.name}. Event tidak bisa dilanjutkan lagi.</>}</p>
      </Modal>
      <ScheduleEventModal open={editOpen} onClose={() => setEditOpen(false)} event={ev} onSaved={(e) => setData(e)} />
    </>
  )
}
