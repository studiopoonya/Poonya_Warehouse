import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Crown, UserRound } from 'lucide-react'
import Modal from '../ui/Modal'
import { Users } from '../../api/endpoints'
import { errorMessage } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'

const ROLES = [
  { value: 'staff', label: 'Staff', icon: UserRound, text: 'Hanya mengisi logistik event: barang yang dibawa & sisa saat pulang.' },
  { value: 'owner', label: 'Owner', icon: Crown, text: 'Akses penuh: dashboard, stok semua venue, transfer, laporan event, dan kelola akun.' },
]

/** Tambah / edit akun (khusus owner) */
export default function UserFormModal({ open, onClose, account, onSaved }) {
  const { user: me } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const isSelf = account && account.id === me?.id

  useEffect(() => {
    if (!open) return
    setError(null)
    setForm(account
      ? { name: account.name, email: account.email, role: account.role, is_active: account.is_active, password: '' }
      : { name: '', email: '', role: 'staff', is_active: true, password: '' })
  }, [open, account])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const submit = async (e) => {
    e?.preventDefault()
    setSaving(true)
    setError(null)
    const payload = { ...form }
    if (!payload.password) delete payload.password
    try {
      const saved = account ? await Users.update(account.id, payload) : await Users.create(payload)
      toast(account ? 'Akun diperbarui' : `Akun ${saved.name} dibuat`)
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
      title={account ? 'Edit akun' : 'Tambah akun'}
      footer={
        <>
          <button className="btn" onClick={onClose}>Batal</button>
          <button className="btn btn-dark" onClick={submit} disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</button>
        </>
      }
    >
      <form className="form-grid" onSubmit={submit}>
        <div className="field">
          <label>Nama</label>
          <input className="input" value={form.name ?? ''} onChange={set('name')} placeholder="Misal: Andi" autoFocus />
        </div>
        <div className="field">
          <label>Email (untuk login)</label>
          <input className="input" type="email" value={form.email ?? ''} onChange={set('email')} placeholder="nama@poonya.com" autoComplete="off" />
        </div>

        <div className="field full">
          <label>Peran</label>
          <div className="role-options">
            {ROLES.map((r) => {
              const selected = form.role === r.value
              return (
                <button
                  type="button"
                  key={r.value}
                  className={`role-option ${selected ? 'active' : ''}`}
                  onClick={() => !isSelf && setForm((f) => ({ ...f, role: r.value }))}
                  disabled={isSelf && !selected}
                >
                  {selected && <motion.span layoutId="role-bg" className="role-option-bg" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}
                  <span className="row" style={{ gap: 8, fontWeight: 600 }}><r.icon size={15} /> {r.label}</span>
                  <span className="muted" style={{ fontSize: 12 }}>{r.text}</span>
                </button>
              )
            })}
          </div>
          {isSelf && <span className="muted" style={{ fontSize: 12 }}>Kamu tidak bisa mengubah peran akunmu sendiri.</span>}
        </div>


        <div className="field full">
          <label>{account ? 'Password baru' : 'Password'}</label>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            value={form.password ?? ''}
            onChange={set('password')}
            placeholder={account ? 'Kosongkan kalau tidak diganti' : 'Minimal 8 karakter'}
          />
        </div>

        {account && !isSelf && (
          <label className="checkbox full">
            <input type="checkbox" checked={!!form.is_active} onChange={set('is_active')} />
            <span>Akun aktif <span className="muted">— matikan untuk memblokir login tanpa menghapus riwayatnya</span></span>
          </label>
        )}

        {account && !isSelf && (
          <div className="full muted" style={{ fontSize: 12 }}>
            Mengubah peran, venue, password, atau menonaktifkan akun akan mengeluarkan akun ini dari semua perangkat.
          </div>
        )}

        {error && <div className="error-text full">{error}</div>}
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
