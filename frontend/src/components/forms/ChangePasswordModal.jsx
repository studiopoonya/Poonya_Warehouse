import { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import { Auth } from '../../api/endpoints'
import { errorMessage } from '../../api/client'
import { useToast } from '../../context/ToastContext'

const empty = { current_password: '', password: '', password_confirmation: '' }

export default function ChangePasswordModal({ open, onClose }) {
  const toast = useToast()
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) { setForm(empty); setError(null) }
  }, [open])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e?.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await Auth.updatePassword(form)
      toast('Password diganti. Perangkat lain otomatis keluar.')
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
      title="Ganti password"
      width={420}
      footer={
        <>
          <button className="btn" onClick={onClose}>Batal</button>
          <button className="btn btn-dark" onClick={submit} disabled={saving || !form.current_password || !form.password}>
            {saving ? 'Menyimpan…' : 'Simpan'}
          </button>
        </>
      }
    >
      <form className="stack" onSubmit={submit}>
        <div className="field">
          <label>Password lama</label>
          <input className="input" type="password" autoComplete="current-password" value={form.current_password} onChange={set('current_password')} autoFocus />
        </div>
        <div className="field">
          <label>Password baru</label>
          <input className="input" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} placeholder="Minimal 8 karakter" />
        </div>
        <div className="field">
          <label>Ulangi password baru</label>
          <input className="input" type="password" autoComplete="new-password" value={form.password_confirmation} onChange={set('password_confirmation')} />
        </div>
        {error && <div className="error-text">{error}</div>}
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
