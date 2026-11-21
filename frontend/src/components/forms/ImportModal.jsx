import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Download, FileSpreadsheet, ClipboardPaste, UploadCloud, CircleCheck } from 'lucide-react'
import Modal from '../ui/Modal'
import Segmented from '../ui/Segmented'
import { Badge } from '../ui/Feedback'
import { Items } from '../../api/endpoints'
import { blobErrorMessage, downloadFile, errorMessage } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import { useVenues } from '../../context/VenueContext'
import { fmt, fmtRp } from '../../utils/format'

const STATUS = {
  new: { label: 'Baru', tone: 'green' },
  exists: { label: 'Sudah ada', tone: 'info' },
  error: { label: 'Error', tone: 'danger' },
}

/** Tempelan dari Excel/Google Sheets = baris dipisah enter, kolom dipisah tab (atau ; / ,) */
function parsePaste(text) {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim() !== '')
  if (!lines.length) return []
  const sep = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ','
  return lines.map((l) => l.split(sep).map((c) => c.trim().replace(/^"(.*)"$/, '$1')))
}

export default function ImportModal({ open, onClose, onDone }) {
  const { venues, refresh } = useVenues()
  const toast = useToast()
  const fileRef = useRef(null)
  const [step, setStep] = useState('source') // source | preview | done
  const [mode, setMode] = useState('file')
  const [file, setFile] = useState(null)
  const [paste, setPaste] = useState('')
  const [drag, setDrag] = useState(false)
  const [venueId, setVenueId] = useState('')
  const [preview, setPreview] = useState(null)
  const [updateExisting, setUpdateExisting] = useState(false)
  const [filter, setFilter] = useState('all')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  // reset hanya saat modal baru dibuka (bukan setiap daftar venue di-refresh setelah import)
  useEffect(() => {
    if (!open) return
    setStep('source'); setFile(null); setPaste(''); setPreview(null); setError(null); setResult(null); setFilter('all'); setUpdateExisting(false)
  }, [open])

  useEffect(() => {
    if (open && !venueId) setVenueId(venues.find((v) => v.type === 'warehouse')?.id ?? venues[0]?.id ?? '')
  }, [open, venues, venueId])

  const runPreview = async () => {
    setBusy(true)
    setError(null)
    try {
      const rows = mode === 'paste' ? parsePaste(paste) : null
      if (mode === 'paste' && rows.length < 2) throw new Error('Tempel minimal 2 baris: baris judul kolom + 1 barang.')
      setPreview(await Items.importPreview(mode === 'file' ? { file } : { rows }))
      setStep('preview')
    } catch (e) {
      setError(e.response ? errorMessage(e) : e.message)
    } finally {
      setBusy(false)
    }
  }

  const commit = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await Items.importCommit({ venue_id: Number(venueId), update_existing: updateExisting, rows: preview.rows })
      setResult(res)
      setStep('done')
      refresh()
      onDone?.()
      toast(`${res.created} barang ditambahkan${res.updated ? `, ${res.updated} diperbarui` : ''}`)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const template = async () => {
    try { await downloadFile('/items/import/template', null, 'template-import-barang.xlsx') } catch (e) { toast(await blobErrorMessage(e), 'error') }
  }

  const s = preview?.summary
  const willImport = s ? s.new + (updateExisting ? s.exists : 0) : 0
  const rows = (preview?.rows || []).filter((r) => filter === 'all' || r.status === filter)
  const venueName = venues.find((v) => v.id === Number(venueId))?.name

  const footer = step === 'source' ? (
    <>
      <button className="btn" onClick={onClose}>Batal</button>
      <button className="btn btn-dark" disabled={busy || (mode === 'file' ? !file : !paste.trim())} onClick={runPreview}>
        {busy ? 'Membaca…' : 'Lihat pratinjau'}
      </button>
    </>
  ) : step === 'preview' ? (
    <>
      <button className="btn" onClick={() => setStep('source')}><ArrowLeft size={15} /> Ganti data</button>
      <button className="btn btn-dark" disabled={busy || willImport === 0} onClick={commit}>
        {busy ? 'Menyimpan…' : `Import ${willImport} barang`}
      </button>
    </>
  ) : (
    <button className="btn btn-dark" onClick={onClose}>Selesai</button>
  )

  return (
    <Modal open={open} onClose={() => !busy && onClose()} title="Import barang" width={step === 'preview' ? 860 : 600} footer={footer}>
      <AnimatePresence mode="wait">
        {step === 'source' && (
          <motion.div key="src" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="stack">
            <div className="import-tip">
              <FileSpreadsheet size={18} style={{ flex: 'none' }} />
              <div>
                Baris pertama harus <b>judul kolom</b>: Nama barang (wajib), SKU, Kategori, Jenis (Habis pakai / Peralatan), Satuan, Harga, Stok, Min stok, Standar dibawa.
                Export dari sistem lama (Nama Barang, Qty Stok, Harga Satuan) juga dikenali.
                <button type="button" className="link-btn" style={{ marginLeft: 0, display: 'flex', marginTop: 4 }} onClick={template}>
                  <Download size={13} style={{ marginRight: 4 }} /> Unduh template Excel
                </button>
              </div>
            </div>

            <Segmented value={mode} onChange={setMode} options={[{ value: 'file', label: 'Upload file' }, { value: 'paste', label: 'Tempel dari spreadsheet' }]} />

            {mode === 'file' ? (
              <label
                className={`dropzone ${drag ? 'drag' : ''} ${file ? 'has-file' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); setFile(e.dataTransfer.files[0] || null) }}
              >
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => setFile(e.target.files[0] || null)} />
                <UploadCloud size={28} />
                {file
                  ? <><b>{file.name}</b><span className="muted">{Math.max(1, Math.round(file.size / 1024))} KB · klik untuk ganti</span></>
                  : <><b>Klik atau seret file ke sini</b><span className="muted">Excel (.xlsx / .xls) atau .csv, maks. 5 MB</span></>}
              </label>
            ) : (
              <div className="field">
                <label className="row" style={{ gap: 6 }}><ClipboardPaste size={14} /> Blok tabel di Excel / Google Sheets (termasuk baris judul), salin, lalu tempel di sini</label>
                <textarea className="textarea mono" style={{ minHeight: 170, fontSize: 12.5 }} value={paste} onChange={(e) => setPaste(e.target.value)}
                  placeholder={'Nama barang\tKategori\tHarga\tStok\nCOVERFRAME 2R\tFrame & Album\t1500\t6101\nKeychain Bulat\tSouvenir\t2500\t53'} />
              </div>
            )}

            <div className="field">
              <label>Stok di file masuk ke venue</label>
              <select className="select" value={venueId} onChange={(e) => setVenueId(e.target.value)}>
                {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            {error && <div className="error-text">{error}</div>}
          </motion.div>
        )}

        {step === 'preview' && preview && (
          <motion.div key="pv" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}>
            <div className="grid grid-4" style={{ marginBottom: 12 }}>
              <div className="mini-stat"><span>Total baris</span><b>{s.total}</b></div>
              <div className="mini-stat"><span>Barang baru</span><b style={{ color: 'var(--accent-strong)' }}>{s.new}</b></div>
              <div className="mini-stat"><span>Sudah ada</span><b style={{ color: 'var(--info)' }}>{s.exists}</b></div>
              <div className="mini-stat"><span>Error</span><b style={{ color: s.error ? 'var(--danger)' : undefined }}>{s.error}</b></div>
            </div>

            {s.equipment > 0 && (
              <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}><b>{s.equipment}</b> barang bertipe <b>Peralatan</b> (tidak berkurang saat dibawa ke event).</p>
            )}
            {s.new_categories.length > 0 && (
              <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>Kategori baru akan dibuat: <b>{s.new_categories.join(', ')}</b></p>
            )}
            {s.exists > 0 && (
              <label className="checkbox" style={{ marginBottom: 10 }}>
                <input type="checkbox" checked={updateExisting} onChange={(e) => setUpdateExisting(e.target.checked)} />
                <span>Perbarui {s.exists} barang yang sudah ada (harga, kategori, jenis, satuan). <span className="muted">Stoknya tidak diubah — pakai stock opname.</span></span>
              </label>
            )}

            <div className="toolbar" style={{ marginBottom: 8 }}>
              <Segmented value={filter} onChange={setFilter} options={[
                { value: 'all', label: `Semua (${s.total})` }, { value: 'new', label: `Baru (${s.new})` },
                { value: 'exists', label: `Sudah ada (${s.exists})` }, { value: 'error', label: `Error (${s.error})` },
              ]} />
            </div>

            <div className="table-wrap" style={{ maxHeight: 360, overflow: 'auto' }}>
              <table className="table">
                <thead>
                  <tr><th>Baris</th><th>Nama barang</th><th>Kategori</th><th>Jenis</th><th>Satuan</th><th className="num">Harga</th><th className="num">Stok</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.line} style={r.status === 'error' ? { background: '#fff7f6' } : undefined}>
                      <td className="mono muted">{r.line}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{r.name || <span className="muted">—</span>}</div>
                        <div className="mono muted" style={{ fontSize: 11.5 }}>{r.sku || 'SKU otomatis'}</div>
                      </td>
                      <td>{r.category ? <>{r.category}{r.new_category && <Badge tone="info">baru</Badge>}</> : <span className="muted">—</span>}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {r.kind === 'equipment'
                          ? <span className="kind-tag">Alat{r.kit_qty ? ` · bawa ${r.kit_qty}` : ''}</span>
                          : r.kind === 'consumable' ? <span className="muted">Habis pakai</span>
                          : r.kind ? <span className="error-text">{r.kind}</span>
                          : <span className="muted">{r.status === 'exists' ? 'tetap' : 'Habis pakai'}</span>}
                      </td>
                      <td>{r.unit}</td>
                      <td className="num mono">{typeof r.price === 'number' ? fmtRp(r.price) : r.price ?? '—'}</td>
                      <td className="num mono">{typeof r.stock === 'number' ? fmt(r.stock) : r.stock ?? '—'}</td>
                      <td>
                        <Badge tone={STATUS[r.status].tone} dot>{STATUS[r.status].label}</Badge>
                        {r.message && r.status !== 'new' && <div className="muted" style={{ fontSize: 11.5, marginTop: 3 }}>{r.message}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
              Stok barang baru dicatat sebagai stok awal di <b>{venueName}</b>. Baris error tidak ikut di-import.
            </p>
            {error && <div className="error-text">{error}</div>}
          </motion.div>
        )}

        {step === 'done' && result && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="empty" style={{ padding: '28px 10px' }}>
            <div className="empty-icon" style={{ background: 'var(--accent-soft)', color: 'var(--accent-strong)', borderColor: '#cfe9d5' }}><CircleCheck size={22} /></div>
            <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 16 }}>Import selesai</div>
            <div style={{ marginTop: 6 }}>
              <b>{result.created}</b> barang baru · <b>{result.updated}</b> diperbarui · <b>{result.skipped}</b> dilewati
            </div>
            <div style={{ marginTop: 10, fontSize: 13 }}>Langkah berikutnya: cek stok tiap venue lewat <b>Stock Opname</b>.</div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  )
}
