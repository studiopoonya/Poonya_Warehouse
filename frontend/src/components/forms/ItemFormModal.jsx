import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Package, Wrench } from 'lucide-react'
import Modal from '../ui/Modal'
import { Items } from '../../api/endpoints'
import { errorMessage } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import { useVenues } from '../../context/VenueContext'
import { VenueDot } from '../../utils/venueMeta'
import { ITEM_KINDS } from '../../utils/format'

const KIND_ICONS = { consumable: Package, equipment: Wrench }

const empty = { sku: '', name: '', category_id: '', unit: 'pcs', kind: 'consumable', kit_qty: '', price: '', description: '' }
const UNITS = ['pcs', 'unit', 'set', 'pack', 'roll', 'lembar', 'box', 'botol', 'kartu', 'print', 'lisensi']

/**
 * Tambah / edit barang. Saat tambah, bisa langsung isi stok awal & batas minimum per venue.
 */
export default function ItemFormModal({ open, onClose, item, categories = [], onSaved }) {
  const { venues, refresh } = useVenues()
  const toast = useToast()
  const [form, setForm] = useState(empty)
  const [stocks, setStocks] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (item) {
      setForm({ sku: item.sku, name: item.name, category_id: item.category?.id ?? '', unit: item.unit, kind: item.kind || 'consumable', kit_qty: item.kit_qty ?? '', price: item.price || '', description: item.description ?? '' })
      setStocks(Object.fromEntries(item.stocks.map((s) => [s.venue_id, { quantity: s.quantity, min_stock: s.min_stock }])))
    } else {
      setForm(empty)
      setStocks(Object.fromEntries(venues.map((v) => [v.id, { quantity: 0, min_stock: 0 }])))
    }
  }, [open, item, venues])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const setStock = (venueId, k) => (e) =>
    setStocks((s) => ({ ...s, [venueId]: { ...s[venueId], [k]: Math.max(0, Number(e.target.value)) } }))

  const submit = async (e) => {
    e?.preventDefault()
    setSaving(true)
    setError(null)
    const payload = {
      ...form,
      price: form.price === '' ? 0 : Number(String(form.price).replace(/\D/g, '')),
      kit_qty: form.kind === 'equipment' && form.kit_qty !== '' ? Number(form.kit_qty) : null,
      stocks: Object.entries(stocks).map(([venue_id, s]) => ({ venue_id: Number(venue_id), ...s })),
    }
    try {
      const saved = item ? await Items.update(item.id, payload) : await Items.create(payload)
      toast(item ? 'Barang diperbarui' : 'Barang ditambahkan')
      refresh()
      onSaved?.(saved)
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
      title={item ? 'Edit barang' : 'Tambah barang baru'}
      width={620}
      footer={
        <>
          <button className="btn" onClick={onClose}>Batal</button>
          <button className="btn btn-dark" onClick={submit} disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</button>
        </>
      }
    >
      <form className="form-grid" onSubmit={submit}>
        <div className="field full">
          <label>Jenis barang</label>
          <div className="role-options">
            {Object.entries(ITEM_KINDS).map(([value, k]) => {
              const Icon = KIND_ICONS[value]
              const selected = form.kind === value
              return (
                <button type="button" key={value} className={`role-option ${selected ? 'active' : ''}`} onClick={() => setForm((f) => ({ ...f, kind: value }))}>
                  {selected && <motion.span layoutId="item-kind-bg" className="role-option-bg" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}
                  <span className="row" style={{ gap: 8, fontWeight: 600 }}><Icon size={15} /> {k.label}</span>
                  <span className="muted" style={{ fontSize: 12 }}>{k.hint}</span>
                </button>
              )
            })}
          </div>
        </div>
        {form.kind === 'equipment' && (
          <div className="field full">
            <label>Jumlah standar dibawa ke event <span className="muted" style={{ fontWeight: 400 }}>(daftar Booth 1)</span></label>
            <input className="input mono" type="number" min="0" style={{ maxWidth: 160 }} value={form.kit_qty} onChange={set('kit_qty')} placeholder="Kosong = tidak dibawa" />
            <span className="muted" style={{ fontSize: 12 }}>Alat dengan jumlah standar otomatis tercentang di form staff saat berangkat event.</span>
          </div>
        )}
        <div className="field">
          <label>Nama barang</label>
          <input className="input" value={form.name} onChange={set('name')} placeholder="Misal: COVERFRAME 2R" autoFocus />
        </div>
        <div className="field">
          <label>SKU / Kode <span className="muted" style={{ fontWeight: 400 }}>(opsional)</span></label>
          <input className="input mono" value={form.sku} onChange={set('sku')} placeholder="Otomatis dari nama" />
        </div>
        <div className="field">
          <label>Kategori</label>
          <select className="select" value={form.category_id} onChange={set('category_id')}>
            <option value="">Pilih kategori</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Satuan</label>
          <select className="select" value={form.unit} onChange={set('unit')}>
            {[...new Set([...UNITS, form.unit].filter(Boolean))].map((u) => <option key={u}>{u}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Harga satuan</label>
          <div className="input-prefix">
            <span>Rp</span>
            <input className="input mono" inputMode="numeric" value={form.price === '' ? '' : Number(String(form.price).replace(/\D/g, '')).toLocaleString('id-ID')}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value.replace(/\D/g, '') }))} placeholder="0" />
          </div>
        </div>
        <div className="field">
          <label>Catatan</label>
          <input className="input" value={form.description} onChange={set('description')} placeholder="Opsional" />
        </div>

        <div className="field full">
          <label>{item ? 'Batas minimum per venue' : 'Stok awal & batas minimum per venue'}</label>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Venue</th>
                  {!item && <th className="num">Stok awal</th>}
                  <th className="num">Min. stok</th>
                </tr>
              </thead>
              <tbody>
                {venues.map((v) => (
                  <tr key={v.id}>
                    <td><span className="row"><VenueDot venue={v} /> {v.name}</span></td>
                    {!item && (
                      <td className="num">
                        <input className="input mono" type="number" min="0" style={{ width: 96, height: 32, textAlign: 'right' }}
                          value={stocks[v.id]?.quantity ?? 0} onChange={setStock(v.id, 'quantity')} />
                      </td>
                    )}
                    <td className="num">
                      <input className="input mono" type="number" min="0" style={{ width: 96, height: 32, textAlign: 'right' }}
                        value={stocks[v.id]?.min_stock ?? 0} onChange={setStock(v.id, 'min_stock')} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {item && <span className="muted" style={{ fontSize: 12 }}>Ubah jumlah stok lewat menu Riwayat Stok (masuk/keluar/penyesuaian) atau Transfer.</span>}
        </div>
        {error && <div className="error-text full">{error}</div>}
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
