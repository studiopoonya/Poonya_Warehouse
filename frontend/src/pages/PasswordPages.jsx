import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Eye, EyeOff, Lock, Mail, MailCheck, CircleAlert } from 'lucide-react'
import { api, errorMessage } from '../api/client'
import { useToast } from '../context/ToastContext'
import { fadeUp, stagger } from '../components/ui/motion'

/** Kerangka sederhana untuk halaman lupa / reset password */
function Shell({ children }) {
  return (
    <div className="auth-shell">
      <motion.div className="auth-card" variants={stagger} initial="hidden" animate="show">
        <motion.div variants={fadeUp} className="row" style={{ marginBottom: 22 }}>
          <span className="brand-logo"><span /><span /><span /><span /></span>
          <span>
            <span className="brand-name" style={{ display: 'block' }}>Poonya</span>
            <span className="brand-sub" style={{ display: 'block' }}>Warehouse system</span>
          </span>
        </motion.div>
        {children}
      </motion.div>
    </div>
  )
}

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { data } = await api.post('/auth/forgot-password', { email })
      setSent(data.message)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Shell>
      {sent ? (
        <motion.div variants={fadeUp} className="stack" style={{ gap: 12 }}>
          <span className="li-icon" style={{ width: 48, height: 48, background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}><MailCheck size={22} /></span>
          <h1 className="page-title" style={{ fontSize: 24 }}>Cek email kamu</h1>
          <p className="muted">{sent}</p>
          <p className="muted" style={{ fontSize: 13 }}>Link berlaku 60 menit. Tidak masuk juga? Minta owner untuk reset password lewat menu Pengguna.</p>
          <Link to="/login" className="btn btn-dark" style={{ marginTop: 6 }}>Kembali ke login</Link>
        </motion.div>
      ) : (
        <form onSubmit={submit} className="stack" style={{ gap: 16 }}>
          <motion.div variants={fadeUp}>
            <h1 className="page-title" style={{ fontSize: 26 }}>Lupa password?</h1>
            <p className="muted" style={{ marginTop: 6 }}>Masukkan email akunmu. Kami kirim link untuk membuat password baru.</p>
          </motion.div>
          <motion.div variants={fadeUp} className="field">
            <label htmlFor="email">Email</label>
            <div className="input-icon">
              <Mail size={15} />
              <input id="email" type="email" className="input" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@poonya.com" autoFocus required />
            </div>
          </motion.div>
          {error && <div className="login-error"><CircleAlert size={15} style={{ flex: 'none' }} /> {error}</div>}
          <motion.button variants={fadeUp} className="btn btn-dark login-submit" disabled={busy || !email}>{busy ? 'Mengirim…' : 'Kirim link reset'}</motion.button>
          <motion.div variants={fadeUp} style={{ textAlign: 'center' }}>
            <Link to="/login" className="link-arrow"><ArrowLeft size={13} /> Kembali ke login</Link>
          </motion.div>
        </form>
      )}
    </Shell>
  )
}

export function ResetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const token = params.get('token') || ''
  const email = params.get('email') || ''
  const [form, setForm] = useState({ password: '', password_confirmation: '' })
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { data } = await api.post('/auth/reset-password', { token, email, ...form })
      toast(data.message)
      navigate('/login', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (!token || !email) {
    return (
      <Shell>
        <h1 className="page-title" style={{ fontSize: 24 }}>Link tidak lengkap</h1>
        <p className="muted" style={{ marginTop: 8 }}>Buka link langsung dari email, atau minta link baru.</p>
        <Link to="/forgot-password" className="btn btn-dark" style={{ marginTop: 16 }}>Minta link baru</Link>
      </Shell>
    )
  }

  return (
    <Shell>
      <form onSubmit={submit} className="stack" style={{ gap: 16 }}>
        <motion.div variants={fadeUp}>
          <h1 className="page-title" style={{ fontSize: 26 }}>Buat password baru</h1>
          <p className="muted" style={{ marginTop: 6 }}>Untuk akun <b>{email}</b></p>
        </motion.div>
        {['password', 'password_confirmation'].map((k, i) => (
          <motion.div variants={fadeUp} className="field" key={k}>
            <label>{i ? 'Ulangi password baru' : 'Password baru'}</label>
            <div className="input-icon">
              <Lock size={15} />
              <input type={show ? 'text' : 'password'} className="input" autoComplete="new-password" value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })} placeholder={i ? '' : 'Minimal 8 karakter'} autoFocus={!i} required />
              {!i && (
                <button type="button" className="pw-toggle" onClick={() => setShow((s) => !s)} aria-label="Tampilkan password">
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              )}
            </div>
          </motion.div>
        ))}
        {error && (
          <div className="login-error" style={{ flexWrap: 'wrap' }}>
            <CircleAlert size={15} style={{ flex: 'none' }} /> {error}
            {error.includes('kedaluwarsa') && <Link to="/forgot-password" style={{ textDecoration: 'underline' }}>Minta link baru</Link>}
          </div>
        )}
        <motion.button variants={fadeUp} className="btn btn-dark login-submit" disabled={busy || form.password.length < 8 || form.password !== form.password_confirmation}>
          {busy ? 'Menyimpan…' : 'Simpan password baru'}
        </motion.button>
        {form.password_confirmation && form.password !== form.password_confirmation && <span className="error-text">Konfirmasi password belum sama.</span>}
      </form>
    </Shell>
  )
}
