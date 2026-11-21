import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Mail, Plus, Send, X, TriangleAlert, CircleCheck } from 'lucide-react'
import { Skeleton } from '../ui/Feedback'
import { Settings as SettingsApi } from '../../api/endpoints'
import { errorMessage } from '../../api/client'
import { useToast } from '../../context/ToastContext'

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="toggle-row">
      <span style={{ flex: 1 }}>
        <span style={{ display: 'block', fontWeight: 500 }}>{label}</span>
        <span className="muted" style={{ fontSize: 12.5 }}>{hint}</span>
      </span>
      <button type="button" role="switch" aria-checked={checked} className={`switch ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}>
        <motion.span layout transition={{ type: 'spring', stiffness: 600, damping: 35 }} />
      </button>
    </label>
  )
}

/** Pengaturan > Notifikasi email: penerima, jenis email, & kirim email tes */
export default function EmailSettings() {
  const toast = useToast()
  const [s, setS] = useState(null)
  const [saved, setSaved] = useState(null)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    SettingsApi.notifications().then((d) => { setS(d); setSaved(d) }).catch((e) => toast(errorMessage(e), 'error'))
  }, [toast])

  if (!s) return <Skeleton height={220} />

  const pick = (x) => [x.emails, x.event_completed, x.opname, x.staff_assigned, x.staff_reminder]
  const dirty = JSON.stringify(pick(s)) !== JSON.stringify(pick(saved))

  const add = (e) => {
    e?.preventDefault()
    const v = input.trim().toLowerCase()
    if (!v) return
    if (!isEmail(v)) return toast('Format email tidak valid', 'error')
    if (!s.emails.includes(v)) setS({ ...s, emails: [...s.emails, v] })
    setInput('')
  }

  const save = async () => {
    setBusy(true)
    try {
      const d = await SettingsApi.updateNotifications({ emails: s.emails, event_completed: s.event_completed, opname: s.opname, staff_assigned: s.staff_assigned, staff_reminder: s.staff_reminder })
      setS(d); setSaved(d)
      toast('Pengaturan email disimpan')
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  const test = async () => {
    setTesting(true)
    try {
      const r = await SettingsApi.testEmail()
      toast(r.message, s.configured ? 'success' : 'error')
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="stack" style={{ gap: 14 }}>
      {s.configured ? (
        <div className="mail-status ok"><CircleCheck size={16} /> Email aktif — dikirim dari <b>{s.from}</b></div>
      ) : (
        <div className="mail-status warn">
          <TriangleAlert size={16} style={{ flex: 'none', marginTop: 1 }} />
          <span>Server belum disambungkan ke layanan email (mode <code>{s.mailer}</code>), jadi email baru tercatat di log dan <b>belum benar-benar terkirim</b>. Isi pengaturan SMTP di <code>backend/.env</code> — panduannya ada di README.</span>
        </div>
      )}

      <div className="field">
        <label>Kirim ke</label>
        <div className="email-chips">
          <AnimatePresence initial={false}>
            {s.emails.map((em) => (
              <motion.span key={em} className="email-chip" layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                <Mail size={12} /> {em}
                <button type="button" onClick={() => setS({ ...s, emails: s.emails.filter((x) => x !== em) })} aria-label={`Hapus ${em}`}><X size={12} /></button>
              </motion.span>
            ))}
          </AnimatePresence>
          <form onSubmit={add} className="email-add">
            <input type="email" inputMode="email" value={input} onChange={(e) => setInput(e.target.value)} onBlur={() => input && add()} placeholder={s.emails.length ? 'Tambah email…' : 'nama@gmail.com'} />
            {input && <button className="icon-btn" style={{ width: 30, height: 30 }} aria-label="Tambah"><Plus size={14} /></button>}
          </form>
        </div>
        {s.emails.length === 0 && <span className="error-text">Belum ada penerima — email tidak akan dikirim.</span>}
      </div>

      <div className="stack" style={{ gap: 8 }}>
        <Toggle checked={s.event_completed} onChange={(v) => setS({ ...s, event_completed: v })}
          label="Event selesai" hint="Saat staff melapor sisa barang: dibawa, sisa, terpakai & nilainya" />
        <Toggle checked={s.opname} onChange={(v) => setS({ ...s, opname: v })}
          label="Stock opname selesai" hint="Jumlah barang yang dihitung, sesuai, selisih & nilai selisih" />
        <div className="muted" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', margin: '8px 2px 0' }}>Email ke staff (ke alamat akun masing-masing)</div>
        <Toggle checked={s.staff_assigned} onChange={(v) => setS({ ...s, staff_assigned: v })}
          label="Saat ditugaskan" hint="Staff dapat email waktu dijadwalkan / dipindah jadi penanggung jawab event" />
        <Toggle checked={s.staff_reminder} onChange={(v) => setS({ ...s, staff_reminder: v })}
          label="Pengingat H-1" hint="Jam 17.00 sehari sebelum event. Event yang belum ditugaskan diingatkan ke owner" />
      </div>

      <div className="row" style={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <button className="btn" onClick={test} disabled={testing || dirty || !s.emails.length} title={dirty ? 'Simpan dulu perubahan' : undefined}>
          <Send size={14} /> {testing ? 'Mengirim…' : 'Kirim email tes'}
        </button>
        <button className="btn btn-dark" onClick={save} disabled={busy || !dirty}>{busy ? 'Menyimpan…' : 'Simpan'}</button>
      </div>
    </div>
  )
}
