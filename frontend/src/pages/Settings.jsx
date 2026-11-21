import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { DatabaseBackup, Download, KeyRound, MapPin, Save, Tags, UserRound, Building2, FileSpreadsheet, Mail as MailIcon, Plus, Trash2 } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import { Card, CardHead } from '../components/ui/Card'
import { Badge, Skeleton } from '../components/ui/Feedback'
import { stagger } from '../components/ui/motion'
import ChangePasswordModal from '../components/forms/ChangePasswordModal'
import { CategoryManager } from '../components/forms/CategoryManager'
import EmailSettings from '../components/forms/EmailSettings'
import VenueCreateModal, { ColorPicker } from '../components/forms/VenueCreateModal'
import Modal from '../components/ui/Modal'
import { Settings as SettingsApi } from '../api/endpoints'
import { blobErrorMessage, downloadFile, errorMessage } from '../api/client'
import { useFetch } from '../hooks/useFetch'
import { useAuth } from '../context/AuthContext'
import { useVenues } from '../context/VenueContext'
import { useToast } from '../context/ToastContext'
import { VenueIcon, venueMeta } from '../utils/venueMeta'
import { fmtBytes, fmtDateTime, timeAgo } from '../utils/format'

function VenueForm({ venue, onSaved }) {
  const toast = useToast()
  const m = venueMeta(venue)
  const [form, setForm] = useState({ name: venue.name, address: venue.address ?? '', description: venue.description ?? '', color: venue.color || m.color })
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const dirty = form.name !== venue.name || form.address !== (venue.address ?? '') || form.description !== (venue.description ?? '') || form.color !== (venue.color || m.color)

  const remove = async () => {
    try {
      await SettingsApi.deleteVenue(venue.id)
      toast(`${venue.name} dihapus`)
      onSaved()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setConfirmDelete(false)
    }
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await SettingsApi.updateVenue(venue.id, form)
      toast(`${form.name} disimpan`)
      onSaved()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="venue-form" onSubmit={save}>
      <div className="row" style={{ marginBottom: 10 }}>
        <span className="venue-icon" style={{ background: form.color, width: 32, height: 32 }}><VenueIcon venue={venue} size={15} /></span>
        <b>{venue.name}</b>
        <span className="row" style={{ marginLeft: 'auto', gap: 6 }}>
          {venue.is_main && <span className="badge dark">Gudang utama</span>}
          <span className="badge">{venue.type_label}</span>
          <button type="button" className="btn btn-ghost btn-sm btn-danger" onClick={() => setConfirmDelete(true)} title="Hapus venue" aria-label="Hapus venue"><Trash2 size={14} /></button>
        </span>
      </div>
      <div className="stack" style={{ gap: 10 }}>
        <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama venue" />
        <div className="input-prefix"><span><MapPin size={14} /></span>
          <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Alamat" />
        </div>
        <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Keterangan (opsional)" />
        <ColorPicker value={form.color} onChange={(c) => setForm({ ...form, color: c })} />
      </div>
      {dirty && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ marginTop: 10 }}>
          <button className="btn btn-dark btn-sm" disabled={saving || !form.name.trim()}><Save size={14} /> {saving ? 'Menyimpan…' : 'Simpan'}</button>
        </motion.div>
      )}
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Hapus ${venue.name}?`}
        width={440}
        footer={<><button type="button" className="btn" onClick={() => setConfirmDelete(false)}>Batal</button><button type="button" className="btn btn-dark" style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={remove}>Hapus</button></>}
      >
        <p>Venue hanya bisa dihapus kalau <b>belum pernah dipakai</b>: belum ada stok, transfer, event, maupun stock opname. Kalau sudah, venue tetap disimpan supaya riwayatnya utuh.</p>
      </Modal>
    </form>
  )
}

export default function Settings() {
  const { user } = useAuth()
  const { venues, refresh } = useVenues()
  const toast = useToast()
  const [pwOpen, setPwOpen] = useState(false)
  const [venueOpen, setVenueOpen] = useState(false)
  const [backingUp, setBackingUp] = useState(false)
  const { data: backups, loading: loadingBackups, reload: reloadBackups } = useFetch(() => SettingsApi.backups(), [])

  useEffect(() => { refresh() }, [refresh])

  const backupNow = async () => {
    setBackingUp(true)
    try {
      const b = await SettingsApi.createBackup()
      toast(`Backup dibuat (${fmtBytes(b.size)})`)
      reloadBackups()
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setBackingUp(false)
    }
  }

  const download = async (path, name) => {
    try { await downloadFile(path, null, name) } catch (e) { toast(await blobErrorMessage(e), 'error') }
  }

  const list = backups?.data || []

  return (
    <>
      <PageHeader title="Pengaturan" sub={['Akun, notifikasi email, data venue, kategori & backup']} />

      <motion.div className="settings-grid" variants={stagger} initial="hidden" animate="show">
        <Card>
          <CardHead title={<span className="row" style={{ gap: 8 }}><UserRound size={16} /> Akun kamu</span>} />
          <div className="row" style={{ alignItems: 'center' }}>
            <span className="avatar" style={{ width: 44, height: 44, fontSize: 15 }}>{user?.name?.slice(0, 2).toUpperCase()}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>{user?.name}</div>
              <div className="muted" style={{ fontSize: 13 }}>{user?.email} · Owner</div>
            </div>
            <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => setPwOpen(true)}><KeyRound size={15} /> Ganti password</button>
          </div>
        </Card>

        <Card>
          <CardHead
            title={<span className="row" style={{ gap: 8 }}><DatabaseBackup size={16} /> Backup data</span>}
            sub={`Otomatis setiap hari jam 02.00 · ${backups?.keep ?? 14} backup terakhir disimpan`}
            right={<button className="btn btn-dark btn-sm" onClick={backupNow} disabled={backingUp}>{backingUp ? 'Membuat…' : 'Backup sekarang'}</button>}
          />
          {loadingBackups && !backups ? <Skeleton height={80} /> : list.length === 0 ? (
            <div className="empty" style={{ padding: 18 }}>Belum ada backup. Klik <b>Backup sekarang</b>.</div>
          ) : (
            <div className="list">
              {list.slice(0, 5).map((b) => (
                <div key={b.name} className="list-item">
                  <div className="li-main">
                    <div className="li-title">{fmtDateTime(b.created_at)} <span className="muted" style={{ fontWeight: 400 }}>· {timeAgo(b.created_at)}</span></div>
                    <div className="li-sub">{fmtBytes(b.size)} · {b.auto ? 'otomatis' : 'manual'}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => download(`/backups/${b.name}`, b.name)} title="Unduh"><Download size={14} /></button>
                </div>
              ))}
            </div>
          )}
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            Simpan file unduhan di tempat lain (Google Drive / laptop) supaya aman kalau server bermasalah.
          </p>
        </Card>

        <Card className="span-2">
          <CardHead title={<span className="row" style={{ gap: 8 }}><MailIcon size={16} /> Notifikasi email</span>} sub="Ringkasan otomatis setiap event selesai & stock opname" />
          <EmailSettings />
        </Card>

        <Card className="span-2">
          <CardHead
            title={<span className="row" style={{ gap: 8 }}><Building2 size={16} /> Venue & gudang</span>}
            sub="Nama, alamat, warna & keterangan tiap lokasi"
            right={<button className="btn btn-dark btn-sm" onClick={() => setVenueOpen(true)}><Plus size={14} /> Tambah venue</button>}
          />
          {venues.length === 0 ? <Skeleton height={120} /> : (
            <div className="grid grid-2">
              {venues.map((v) => <VenueForm key={`${v.id}-${v.name}-${v.address}-${v.color}`} venue={v} onSaved={refresh} />)}
            </div>
          )}
        </Card>

        <Card>
          <CardHead title={<span className="row" style={{ gap: 8 }}><Tags size={16} /> Kategori barang</span>} />
          <CategoryManager />
        </Card>

        <Card>
          <CardHead title={<span className="row" style={{ gap: 8 }}><FileSpreadsheet size={16} /> Export data</span>} sub="File Excel (.xlsx)" />
          <div className="stack" style={{ gap: 8 }}>
            <button className="btn" style={{ justifyContent: 'flex-start' }} onClick={() => download('/items/export', 'inventaris.xlsx')}><Download size={15} /> Inventaris & nilai stok</button>
            <button className="btn" style={{ justifyContent: 'flex-start' }} onClick={() => download('/items/import/template', 'template-import-barang.xlsx')}><Download size={15} /> Template import barang</button>
            <p className="muted" style={{ fontSize: 12.5 }}>Laporan pemakaian event per bulan ada di halaman <b>Logistik Event</b>; hasil opname di detail tiap opname.</p>
          </div>
          <div style={{ marginTop: 12 }}><Badge tone="info">Zona waktu: WIB (Asia/Jakarta)</Badge></div>
        </Card>
      </motion.div>

      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
      <VenueCreateModal open={venueOpen} onClose={() => setVenueOpen(false)} onSaved={refresh} />
    </>
  )
}
