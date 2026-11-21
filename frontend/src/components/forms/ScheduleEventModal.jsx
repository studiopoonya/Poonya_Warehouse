import { useEffect, useState } from 'react'
import { UserRound, Users } from 'lucide-react'
import Modal from '../ui/Modal'
import { Events, Users as UsersApi } from '../../api/endpoints'
import { errorMessage } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import { todayISO } from '../../utils/format'
import { useVenues } from '../../context/VenueContext'

const empty = () => ({ name: '', location: '', event_date: todayISO(), crew: '', note: '', user_id: '', source_venue_id: '' })

/** Owner: jadwalkan event baru / ubah jadwal & penanggung jawab (selama belum berangkat) */
export default function ScheduleEventModal({ open, onClose, event, onSaved, defaultDate }) {
  const toast = useToast()
  const { venues } = useVenues()
  const warehouses = venues.filter((v) => v.type === 'warehouse')
  const [form, setForm] = useState(empty)
  const [staff, setStaff] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setForm(event
      ? { name: event.name, location: event.location ?? '', event_date: event.event_date, crew: event.crew ?? '', note: event.note ?? '', user_id: event.user?.id ?? '', source_venue_id: event.source_venue?.id ?? '' }
      : { ...empty(), event_date: defaultDate || todayISO() })
    UsersApi.list().then((us) => setStaff(us.filter((u) => u.role === 'staff' && u.is_active))).catch(() => setStaff([]))
  }, [open, event, defaultDate])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e?.preventDefault()
    setSaving(true)
    setError(null)
    const payload = { ...form, user_id: form.user_id ? Number(form.user_id) : null, source_venue_id: form.source_venue_id ? Number(form.source_venue_id) : null }
    try {
      const saved = event ? await Events.updateSchedule(event.id, payload) : await Events.schedule(payload)
      const who = saved.user?.name
      toast(event ? 'Jadwal event diperbarui' : who ? `Event dijadwalkan untuk ${who}` : 'Event dijadwalkan — bisa diambil semua staff')
      onSaved?.(saved)
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const unassigned = !form.user_id

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={event ? 'Ubah jadwal event' : 'Jadwalkan event'}
      footer={
        <>
          <button className="btn" onClick={onClose}>Batal</button>
          <button className="btn btn-dark" onClick={submit} disabled={saving || !form.name.trim() || !form.event_date}>
            {saving ? 'Menyimpan…' : event ? 'Simpan' : 'Jadwalkan'}
          </button>
        </>
      }
    >
      <form className="form-grid" onSubmit={submit}>
        <div className="field full">
          <label>Nama event *</label>
          <input className="input" value={form.name} onChange={set('name')} placeholder="Misal: Wedding Budi & Ani" autoFocus />
        </div>
        <div className="field">
          <label>Lokasi / venue event</label>
          <input className="input" value={form.location} onChange={set('location')} placeholder="Misal: Hotel Grand Hyatt" />
        </div>
        <div className="field">
          <label>Tanggal event *</label>
          <input className="input" type="date" value={form.event_date} onChange={set('event_date')} />
        </div>

        <div className="field full">
          <label>Penanggung jawab</label>
          <select className="select" value={form.user_id} onChange={set('user_id')}>
            <option value="">Belum ditugaskan — siapa cepat dia dapat</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="assign-hint">
            {unassigned ? <Users size={14} /> : <UserRound size={14} />}
            {unassigned
              ? 'Muncul di semua staff. Staff pertama yang menekan "Ambil event ini" jadi penanggung jawab.'
              : 'Hanya muncul di akun staff ini. Dia yang mencatat barang dibawa & melapor sisa.'}
          </div>
          {staff.length === 0 && <span className="muted" style={{ fontSize: 12 }}>Belum ada akun staff aktif — buat di menu Pengguna.</span>}
        </div>

        {warehouses.length > 1 && (
          <div className="field full">
            <label>Barang diambil dari gudang</label>
            <select className="select" value={form.source_venue_id} onChange={set('source_venue_id')}>
              <option value="">{warehouses.find((w) => w.is_main)?.name ?? 'Gudang utama'} (utama)</option>
              {warehouses.filter((w) => !w.is_main).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
        )}

        <div className="field full">
          <label>Tim yang ikut (opsional)</label>
          <input className="input" value={form.crew} onChange={set('crew')} placeholder="Misal: Andi, Sinta" />
        </div>
        <div className="field full">
          <label>Catatan untuk staff (opsional)</label>
          <textarea className="textarea" value={form.note} onChange={set('note')} placeholder="Misal: paket 3 jam, bawa 2 printer" />
        </div>
        {error && <div className="error-text full">{error}</div>}
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
