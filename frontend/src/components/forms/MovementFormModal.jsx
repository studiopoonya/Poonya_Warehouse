import { useEffect, useMemo, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal } from 'lucide-react'
import Modal from '../ui/Modal'
import Segmented from '../ui/Segmented'
import { Items, Movements } from '../../api/endpoints'
import { errorMessage } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import { useVenues } from '../../context/VenueContext'

const TYPE_HINT = {
  in: { icon: ArrowDownToLine, text: 'Barang baru datang / dibeli dan menambah stok venue.' },
  out: { icon: ArrowUpFromLine, text: 'Barang terpakai, rusak, atau hilang — mengurangi stok.' },
  adjust: { icon: SlidersHorizontal, text: 'Stock opname: set jumlah stok sesuai hitungan fisik.' },
}

/** Catat barang masuk / keluar / penyesuaian di satu venue */
export default function MovementFormModal({ open, onClose, defaultVenueId, defaultType = 'in', onSaved }) {
  const { myVenues: venues, refresh } = useVenues()
  const toast = useToast()
  const [items, setItems] = useState([])
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setForm({ type: defaultType, venue_id: defaultVenueId ?? venues[0]?.id ?? '', item_id: '', quantity: 1, note: '' })
    Items.list().then(setItems).catch(() => setItems([]))
  }, [open, defaultVenueId, defaultType, venues])

  const current = useMemo(() => {
    const it = items.find((i) => i.id === Number(form.item_id))
    return it?.stocks.find((s) => s.venue_id === Number(form.venue_id))?.quantity ?? 0
  }, [items, form.item_id, form.venue_id])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const Hint = TYPE_HINT[form.type] || TYPE_HINT.in

  const after = form.type === 'in' ? current + Number(form.quantity || 0)
    : form.type === 'out' ? current - Number(form.quantity || 0)
      : Number(form.quantity || 0)

  const submit = async (e) => {
    e?.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await Movements.create({ ...form, quantity: Number(form.quantity) })
      toast('Stok berhasil dicatat')
      refresh()
      onSaved?.()
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
      title="Catat pergerakan stok"
      footer={
        <>
          <button className="btn" onClick={onClose}>Batal</button>
          <button className="btn btn-dark" onClick={submit} disabled={saving || !form.item_id}>{saving ? 'Menyimpan…' : 'Simpan'}</button>
        </>
      }
    >
      <form className="form-grid" onSubmit={submit}>
        <div className="field full">
          <Segmented
            value={form.type}
            onChange={(type) => setForm((f) => ({ ...f, type }))}
            options={[{ value: 'in', label: 'Barang masuk' }, { value: 'out', label: 'Barang keluar' }, { value: 'adjust', label: 'Penyesuaian' }]}
          />
          <div className="row muted" style={{ fontSize: 12 }}><Hint.icon size={14} /> {Hint.text}</div>
        </div>
        <div className="field">
          <label>Venue</label>
          <select className="select" value={form.venue_id ?? ''} onChange={set('venue_id')}>
            {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Barang</label>
          <select className="select" value={form.item_id ?? ''} onChange={set('item_id')}>
            <option value="">Pilih barang</option>
            {items.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>)}
          </select>
        </div>
        <div className="field">
          <label>{form.type === 'adjust' ? 'Jumlah stok sebenarnya' : 'Jumlah'}</label>
          <input className="input mono" type="number" min="0" value={form.quantity ?? ''} onChange={set('quantity')} />
        </div>
        <div className="field">
          <label>Stok sekarang → sesudah</label>
          <div className="input mono row" style={{ background: 'var(--surface-2)' }}>
            {current} → <b style={{ color: after < 0 ? 'var(--danger)' : 'var(--accent-strong)' }}>{after}</b>
          </div>
        </div>
        <div className="field full">
          <label>Catatan</label>
          <textarea className="textarea" value={form.note ?? ''} onChange={set('note')} placeholder="Contoh: Pembelian dari supplier / dipakai event wedding" />
        </div>
        {error && <div className="error-text full">{error}</div>}
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
