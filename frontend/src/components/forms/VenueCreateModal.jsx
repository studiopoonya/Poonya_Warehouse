import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Camera, Check, MapPin, Sparkles, Warehouse } from 'lucide-react'
import Modal from '../ui/Modal'
import { Settings as SettingsApi } from '../../api/endpoints'
import { errorMessage } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import { VENUE_COLORS } from '../../utils/venueMeta'

const TYPES = [
  { value: 'warehouse', label: 'Gudang', icon: Warehouse, text: 'Tempat simpan stok. Bisa jadi asal barang untuk event.' },
  { value: 'booth', label: 'Photobooth', icon: Camera, text: 'Booth Poonya Box di lokasi tetap.' },
  { value: 'studio', label: 'Studio', icon: Sparkles, text: 'Self photo studio.' },
]

export function ColorPicker({ value, onChange }) {
  return (
    <div className="color-picker">
      {VENUE_COLORS.map((c) => (
        <button type="button" key={c} className={`swatch ${value === c ? 'active' : ''}`} style={{ background: c }} onClick={() => onChange(c)} aria-label={`Warna ${c}`}>
          {value === c && <Check size={13} color="#fff" strokeWidth={3} />}
        </button>
      ))}
    </div>
  )
}

const empty = (type) => ({ name: '', type, address: '', description: '', color: type === 'warehouse' ? '#0ea5e9' : '#e0457b' })

/** Tambah venue / gudang baru */
export default function VenueCreateModal({ open, onClose, onSaved, defaultType = 'warehouse' }) {
  const toast = useToast()
  const [form, setForm] = useState(() => empty(defaultType))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { if (open) { setForm(empty(defaultType)); setError(null) } }, [open, defaultType])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e?.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const v = await SettingsApi.createVenue(form)
      toast(`${v.name} ditambahkan`)
      onSaved?.(v)
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tambah venue / gudang"
      footer={
        <>
          <button className="btn" onClick={onClose}>Batal</button>
          <button className="btn btn-dark" onClick={submit} disabled={saving || !form.name.trim()}>{saving ? 'Menyimpan…' : 'Tambah'}</button>
        </>
      }
    >
      <form className="stack" style={{ gap: 14 }} onSubmit={submit}>
        <div className="field">
          <label>Tipe</label>
          <div className="role-options" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            {TYPES.map((t) => {
              const selected = form.type === t.value
              return (
                <button type="button" key={t.value} className={`role-option ${selected ? 'active' : ''}`} onClick={() => setForm((f) => ({ ...f, type: t.value }))}>
                  {selected && <motion.span layoutId="venue-type-bg" className="role-option-bg" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}
                  <span className="row" style={{ gap: 8, fontWeight: 600 }}><t.icon size={15} /> {t.label}</span>
                  <span className="muted" style={{ fontSize: 12 }}>{t.text}</span>
                </button>
              )
            })}
          </div>
        </div>
        <div className="field">
          <label>Nama</label>
          <input className="input" value={form.name} onChange={set('name')} placeholder={form.type === 'warehouse' ? 'Misal: Gudang Bekasi' : 'Misal: Poonya Box BSD'} autoFocus />
        </div>
        <div className="field">
          <label>Alamat (opsional)</label>
          <div className="input-prefix"><span><MapPin size={14} /></span><input className="input" value={form.address} onChange={set('address')} placeholder="Alamat lengkap" /></div>
        </div>
        <div className="field">
          <label>Keterangan (opsional)</label>
          <input className="input" value={form.description} onChange={set('description')} />
        </div>
        <div className="field">
          <label>Warna penanda</label>
          <ColorPicker value={form.color} onChange={(c) => setForm((f) => ({ ...f, color: c }))} />
        </div>
        <p className="muted" style={{ fontSize: 12.5 }}>
          Venue baru langsung muncul di inventaris, transfer, stock opname & riwayat dengan stok 0.
          {form.type === 'warehouse' && ' Isi stoknya lewat transfer dari gudang lain atau stock opname.'}
        </p>
        {error && <div className="error-text">{error}</div>}
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
