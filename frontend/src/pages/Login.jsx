import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { motion, useAnimationControls } from 'framer-motion'
import { ArrowRight, Eye, EyeOff, Lock, Mail, CircleAlert } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../api/client'
import { ease, fadeUp, stagger } from '../components/ui/motion'

const VENUES = [
  { name: 'Warehouse', color: '#ffffff' },
  { name: 'Poonya Box SAT', color: '#2f9e5b' },
  { name: 'Poonya Box Dobro', color: '#d98a0b' },
  { name: 'Self Studio', color: '#7c5cdb' },
]

// Grid kotak dekoratif — pola tetap (pseudo-random) supaya tidak berubah tiap render
const COLS = 14
const ROWS = 9
const CELLS = Array.from({ length: COLS * ROWS }, (_, i) => {
  const col = i % COLS
  const row = Math.floor(i / COLS)
  const r = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1
  // makin ke bawah makin "penuh", mirip chart batang
  const height = 0.25 + 0.6 * Math.abs(Math.sin(col * 0.9 + 1.3))
  const filled = (ROWS - row) / ROWS < height
  return { i, col, row, r, filled }
})

function SquareField() {
  return (
    <div className="login-grid" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
      {CELLS.map((c) => (
        <motion.span
          key={c.i}
          className={c.filled ? (c.r > 0.82 ? 'lime' : c.r > 0.45 ? 'on' : 'mid') : ''}
          initial={{ opacity: 0, scale: 0.3 }}
          animate={c.filled && c.r > 0.82
            ? { opacity: [0, 1, 0.35, 1], scale: 1 }
            : { opacity: 1, scale: 1 }}
          transition={c.filled && c.r > 0.82
            ? { delay: 0.3 + c.col * 0.04 + (ROWS - c.row) * 0.03, duration: 3 + c.r * 2, repeat: Infinity, repeatType: 'mirror' }
            : { delay: 0.3 + c.col * 0.04 + (ROWS - c.row) * 0.03, duration: 0.4, ease }}
        />
      ))}
    </div>
  )
}

export default function Login() {
  const { login, status } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const shake = useAnimationControls()

  const [form, setForm] = useState({ email: '', password: '', remember: true })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  if (status === 'authed') return <Navigate to={location.state?.from || '/'} replace />

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login(form)
      navigate(location.state?.from || '/', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
      shake.start({ x: [0, -10, 9, -6, 4, 0], transition: { duration: 0.45 } })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login">
      {/* ---------- Panel brand ---------- */}
      <motion.aside
        className="login-art"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease }}
      >
        <div className="row">
          <div className="brand-logo" style={{ background: '#fff' }}>
            <span /><span style={{ background: 'var(--dark)' }} /><span style={{ background: 'var(--dark)' }} /><span style={{ background: 'var(--dark)' }} />
          </div>
          <div>
            <div className="brand-name">Poonya</div>
            <div style={{ fontSize: 12, color: '#9aa196' }}>Warehouse system</div>
          </div>
        </div>

        <div>
          <motion.h2
            className="login-headline"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7, ease }}
          >
            Stok semua venue,<br /><span>dalam satu layar.</span>
          </motion.h2>
          <motion.p
            style={{ color: '#9aa196', marginTop: 12, maxWidth: 380 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
          >
            Pantau kertas foto, props, dan peralatan dari gudang sampai ke tiap booth. Transfer barang tanpa catatan manual.
          </motion.p>
        </div>

        <SquareField />

        <div className="login-venues">
          {VENUES.map((v, i) => (
            <motion.span
              key={v.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + i * 0.08 }}
            >
              <i style={{ background: v.color }} /> {v.name}
            </motion.span>
          ))}
        </div>
      </motion.aside>

      {/* ---------- Form ---------- */}
      <main className="login-main">
        <motion.form className="login-form" onSubmit={submit} variants={stagger} initial="hidden" animate="show" noValidate>
          <motion.div variants={fadeUp}>
            <h1 className="page-title">Masuk</h1>
            <p className="muted" style={{ marginTop: 6 }}>Masukkan email dan password akun kamu.</p>
          </motion.div>

          <motion.div animate={shake} className="stack" style={{ gap: 14 }}>
            <motion.div variants={fadeUp} className="field">
              <label htmlFor="email">Email</label>
              <div className="input-icon">
                <Mail size={15} />
                <input
                  id="email"
                  type="email"
                  className="input"
                  autoComplete="username"
                  placeholder="nama@poonya.com"
                  value={form.email}
                  onChange={set('email')}
                  autoFocus
                  required
                />
              </div>
            </motion.div>

            <motion.div variants={fadeUp} className="field">
              <label htmlFor="password">Password</label>
              <div className="input-icon">
                <Lock size={15} />
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  className="input"
                  autoComplete="current-password"
                  placeholder="Masukkan password"
                  value={form.password}
                  onChange={set('password')}
                  required
                />
                <button type="button" className="pw-toggle" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? 'Sembunyikan password' : 'Tampilkan password'}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </motion.div>
          </motion.div>

          <motion.label variants={fadeUp} className="checkbox">
            <input type="checkbox" checked={form.remember} onChange={set('remember')} />
            <span>Ingat saya selama 30 hari</span>
          </motion.label>

          {error && (
            <motion.div className="login-error" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <CircleAlert size={15} style={{ flex: 'none' }} /> {error}
            </motion.div>
          )}

          <motion.button
            variants={fadeUp}
            whileTap={{ scale: 0.98 }}
            className="btn btn-dark login-submit"
            disabled={loading || !form.email || !form.password}
          >
            {loading ? (
              <motion.span className="spinner" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
            ) : (
              <>Masuk <ArrowRight size={15} /></>
            )}
          </motion.button>

          <motion.p variants={fadeUp} className="muted" style={{ fontSize: 12, textAlign: 'center' }}>
            <Link to="/forgot-password" className="link-arrow" style={{ fontSize: 13 }}>Lupa password?</Link>
          </motion.p>
        </motion.form>
      </main>
    </div>
  )
}
