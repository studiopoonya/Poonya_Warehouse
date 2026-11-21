import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ClipboardCheck, Search, Equal, Plus, X } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Modal from '../components/ui/Modal'
import Segmented from '../components/ui/Segmented'
import { ApiError, EmptyState, Skeleton } from '../components/ui/Feedback'
import QtyInput from '../components/events/QtyInput'
import { Items, Opnames } from '../api/endpoints'
import { errorMessage } from '../api/client'
import { useFetch } from '../hooks/useFetch'
import { useVenues } from '../context/VenueContext'
import { useToast } from '../context/ToastContext'
import { VenueDot, venueMeta } from '../utils/venueMeta'
import { fmt } from '../utils/format'

// Hasil hitung disimpan di browser per venue, supaya tidak hilang kalau proses hitungnya lama
const draftKey = (venueId) => `opnameDraft:${venueId}`
const loadDraft = (venueId) => {
  const empty = { counts: {}, note: '', extra: [] }
  try { return { ...empty, ...JSON.parse(localStorage.getItem(draftKey(venueId))) } } catch { return empty }
}
const filled = (v) => v !== '' && v !== undefined && v !== null

function DiffPill({ diff }) {
  if (diff === null) return <span className="qty-pill">—</span>
  if (diff === 0) return <span className="qty-pill zero-used">0</span>
  return <span className={`qty-pill ${diff > 0 ? 'diff-plus' : 'diff-minus'}`}>{diff > 0 ? `+${fmt(diff)}` : fmt(diff)}</span>
}

export default function OpnameNew() {
  const { venues } = useVenues()
  const toast = useToast()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const venueId = Number(params.get('venue')) || venues[0]?.id
  const venue = venues.find((v) => v.id === venueId)

  const [counts, setCounts] = useState({})
  const [note, setNote] = useState('')
  // barang di luar daftar venue yang ditambahkan manual (mis. barang nyasar yang ketemu saat hitung)
  const [extra, setExtra] = useState([])
  const [addOpen, setAddOpen] = useState(false)
  const [addSearch, setAddSearch] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [view, setView] = useState('all')
  const [confirm, setConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const { data: items, loading, error, reload } = useFetch(() => Items.list(), [])

  // ganti venue -> muat draf venue itu
  useEffect(() => {
    if (!venueId) return
    const d = loadDraft(venueId)
    setCounts(d.counts)
    setNote(d.note)
    setExtra(d.extra)
    setAddOpen(false)
    setAddSearch('')
  }, [venueId])

  useEffect(() => {
    if (!venueId) return
    try { localStorage.setItem(draftKey(venueId), JSON.stringify({ counts, note, extra })) } catch { /* abaikan */ }
  }, [counts, note, extra, venueId])

  // Lembar hitung = barang yang tercatat di venue ini (ada stok / punya batas minimum),
  // + barang yang ditambahkan manual atau sudah diisi hitungannya
  const all = useMemo(() => (items || []).map((it) => {
    const stock = it.stocks.find((s) => s.venue_id === venueId)
    const system = stock?.quantity ?? 0
    const c = counts[it.id]
    const listed = system > 0 || (stock?.min_stock ?? 0) > 0
    return { ...it, system, listed, counted: c, diff: filled(c) ? Number(c) - system : null }
  }), [items, venueId, counts])
  const rows = useMemo(() => all.filter((r) => r.listed || extra.includes(r.id) || filled(r.counted)), [all, extra])
  const others = useMemo(() => {
    const q = addSearch.trim().toLowerCase()
    return all.filter((r) => !rows.includes(r) && (!q || r.name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q)))
  }, [all, rows, addSearch])
  const addExtra = (id) => { setExtra((e) => [...new Set([...e, id])]); setAddSearch('') }
  const removeExtra = (id) => { setExtra((e) => e.filter((x) => x !== id)); setCounts((c) => { const n = { ...c }; delete n[id]; return n }) }

  const categories = useMemo(() => [...new Set(rows.map((r) => r.category?.name).filter(Boolean))].sort(), [rows])

  const visible = rows.filter((r) => {
    const q = search.trim().toLowerCase()
    if (q && !r.name.toLowerCase().includes(q) && !r.sku.toLowerCase().includes(q)) return false
    if (category && r.category?.name !== category) return false
    if (view === 'todo') return !filled(r.counted)
    if (view === 'diff') return r.diff !== null && r.diff !== 0
    return true
  })

  const counted = rows.filter((r) => filled(r.counted))
  const diffs = counted.filter((r) => r.diff !== 0)
  const set = (id, v) => setCounts((c) => ({ ...c, [id]: v }))

  const changeVenue = (id) => {
    const next = new URLSearchParams(params)
    next.set('venue', id)
    setParams(next, { replace: true })
  }

  const submit = async () => {
    setSaving(true)
    setSubmitError(null)
    try {
      const op = await Opnames.create({
        venue_id: venueId,
        note,
        items: counted.map((r) => ({ item_id: r.id, counted: Number(r.counted) })),
      })
      try { localStorage.removeItem(draftKey(venueId)) } catch { /* abaikan */ }
      toast(`${op.code} selesai — ${op.totals.mismatched} barang disesuaikan`)
      navigate(`/opname/${op.id}`, { replace: true })
    } catch (e) {
      setSubmitError(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Stock opname"
        sub={['Hitung fisik barang, lalu samakan dengan stok di sistem']}
        actions={counted.length > 0 && (
          <button className="btn btn-ghost" onClick={() => { setCounts({}); setNote(''); setExtra([]) }}>Kosongkan hitungan</button>
        )}
      />

      {/* pilih venue */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-title" style={{ marginBottom: 10 }}>Venue yang dihitung</div>
        <div className="venue-pick">
          {venues.map((v) => {
            const m = venueMeta(v)
            const active = v.id === venueId
            return (
              <button key={v.id} className={`venue-pick-btn ${active ? 'active' : ''}`} onClick={() => changeVenue(v.id)}>
                {active && <motion.span layoutId="venue-pick-bg" className="venue-pick-bg" style={{ borderColor: m.color }} transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}
                <VenueDot venue={v} /> <span>{v.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {error && <ApiError message={error} onRetry={reload} />}

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Lembar hitung — {venue?.name}</div>
            <div className="card-sub">{rows.filter((r) => r.listed).length} barang tercatat di {venue?.name}{rows.some((r) => !r.listed) ? ` + ${rows.filter((r) => !r.listed).length} tambahan` : ''}. Isi jumlah fisik — barang yang tidak diisi tidak diubah stoknya.</div>
          </div>
        </div>

        <div className="toolbar" style={{ marginBottom: 10 }}>
          <div className="search grow">
            <Search size={14} />
            <input placeholder="Cari barang…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: 'all', label: `Semua (${rows.length})` },
              { value: 'todo', label: `Belum (${rows.length - counted.length})` },
              { value: 'diff', label: `Selisih (${diffs.length})` },
            ]}
          />
        </div>
        {categories.length > 0 && (
          <div className="chips" style={{ marginBottom: 12 }}>
            <button className={`chip ${!category ? 'active' : ''}`} onClick={() => setCategory('')}>Semua kategori</button>
            {categories.map((c) => <button key={c} className={`chip ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>{c}</button>)}
          </div>
        )}

        {loading && !items ? (
          <div className="stack">{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={60} />)}</div>
        ) : (items || []).length === 0 ? (
          <EmptyState title="Belum ada barang" text="Tambahkan barang dulu di menu Inventaris." />
        ) : rows.length === 0 ? (
          <div className="empty" style={{ padding: 24 }}>Belum ada barang yang tercatat di {venue?.name}. Kalau ada barang fisik di sana, tambahkan lewat <b>Hitung barang lain</b> di bawah.</div>
        ) : visible.length === 0 ? (
          <div className="empty" style={{ padding: 24 }}>{view === 'todo' ? 'Semua barang sudah dihitung 🎉' : view === 'diff' ? 'Tidak ada selisih.' : 'Tidak ada barang yang cocok.'}</div>
        ) : (
          <>
            <div className="ret-head">
              <span>Barang</span>
              <span className="num">Sistem</span>
              <span className="num">Hitungan fisik</span>
              <span className="num">Selisih</span>
            </div>
            {visible.map((r) => (
              <div key={r.id} className={`ret-row ${filled(r.counted) ? (r.diff === 0 ? 'filled' : 'mismatch') : ''}`}>
                <div className="ret-name">
                  <div style={{ fontWeight: 500 }}>
                    {r.name} <span className="muted" style={{ fontWeight: 400 }}>/ {r.unit}</span>
                    {r.kind === 'equipment' && <span className="kind-tag" style={{ marginLeft: 6 }}>Alat</span>}
                    {!r.listed && <span className="badge info" style={{ marginLeft: 6, fontSize: 10.5 }}>tambahan</span>}
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    <span className="mono">{r.sku}</span>
                    <button type="button" className="link-btn" onClick={() => set(r.id, r.system)}><Equal size={11} style={{ verticalAlign: -1 }} /> Sesuai sistem</button>
                    {!r.listed && <button type="button" className="link-btn danger" onClick={() => removeExtra(r.id)}><X size={11} style={{ verticalAlign: -1 }} /> Hapus dari lembar</button>}
                  </div>
                </div>
                <div className="num ret-out" data-label="Sistem"><span className="qty-pill">{fmt(r.system)}</span></div>
                <div className="num ret-in" data-label="Hitungan fisik">
                  <QtyInput value={r.counted} min={0} placeholder="?" onChange={(v) => set(r.id, v)} />
                </div>
                <div className="num ret-used" data-label="Selisih"><DiffPill diff={r.diff} /></div>
              </div>
            ))}
          </>
        )}

        {items && items.length > 0 && (
          <div className="opname-add">
            {!addOpen ? (
              <button type="button" className="btn btn-sm" onClick={() => setAddOpen(true)} disabled={others.length === 0 && !addSearch}>
                <Plus size={14} /> Hitung barang lain {others.length > 0 && <span className="muted">({others.length})</span>}
              </button>
            ) : (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
                <div className="row" style={{ gap: 8, marginBottom: 8 }}>
                  <div className="search grow">
                    <Search size={14} />
                    <input autoFocus placeholder="Cari barang yang belum ada di daftar…" value={addSearch} onChange={(e) => setAddSearch(e.target.value)} />
                  </div>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setAddOpen(false); setAddSearch('') }}>Tutup</button>
                </div>
                <div className="opname-add-list">
                  {others.length === 0 && <div className="muted" style={{ padding: 10, fontSize: 13 }}>Tidak ada barang yang cocok.</div>}
                  {others.slice(0, 30).map((r) => (
                    <button type="button" key={r.id} className="opname-add-item" onClick={() => addExtra(r.id)}>
                      <span>{r.name} <span className="muted">/ {r.unit}</span>{r.kind === 'equipment' && <span className="kind-tag" style={{ marginLeft: 6 }}>Alat</span>}</span>
                      <Plus size={14} />
                    </button>
                  ))}
                  {others.length > 30 && <div className="muted" style={{ padding: 8, fontSize: 12 }}>+{others.length - 30} lainnya — ketik nama untuk mencari.</div>}
                </div>
              </motion.div>
            )}
          </div>
        )}

        <div className="field mt">
          <label>Catatan (opsional)</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Misal: Opname akhir bulan November" />
        </div>
      </div>

      <div className="wizard-foot sticky">
        <div className="wizard-summary" style={{ marginLeft: 0, marginRight: 'auto' }}>
          <b>{counted.length}</b>/{rows.length} dihitung · <b style={{ color: diffs.length ? 'var(--danger)' : undefined }}>{diffs.length}</b> selisih
        </div>
        <button className="btn btn-dark" disabled={!counted.length} onClick={() => { setSubmitError(null); setConfirm(true) }}>
          <ClipboardCheck size={15} /> Selesaikan opname
        </button>
      </div>

      <Modal
        open={confirm}
        onClose={() => !saving && setConfirm(false)}
        title={`Selesaikan opname ${venue?.name ?? ''}?`}
        footer={
          <>
            <button className="btn" onClick={() => setConfirm(false)} disabled={saving}>Cek lagi</button>
            <button className="btn btn-dark" onClick={submit} disabled={saving}>{saving ? 'Menyimpan…' : 'Ya, sesuaikan stok'}</button>
          </>
        }
      >
        <div className="grid grid-3" style={{ marginBottom: 14 }}>
          <div className="mini-stat"><span>Dihitung</span><b>{counted.length}</b></div>
          <div className="mini-stat"><span>Sesuai</span><b>{counted.length - diffs.length}</b></div>
          <div className="mini-stat"><span>Selisih</span><b style={{ color: diffs.length ? 'var(--danger)' : undefined }}>{diffs.length}</b></div>
        </div>
        {diffs.length > 0 ? (
          <div className="table-wrap" style={{ maxHeight: 260, overflowY: 'auto' }}>
            <table className="table">
              <thead><tr><th>Barang</th><th className="num">Sistem → Fisik</th><th className="num">Selisih</th></tr></thead>
              <tbody>
                {diffs.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td className="num mono" style={{ whiteSpace: 'nowrap' }}>{fmt(r.system)} → {fmt(r.counted)}</td>
                    <td className="num"><DiffPill diff={r.diff} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p>Semua barang yang dihitung sudah sesuai dengan sistem. Tidak ada stok yang diubah, hanya dicatat sebagai laporan.</p>}
        {rows.length - counted.length > 0 && (
          <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>{rows.length - counted.length} barang tidak dihitung dan stoknya tidak diubah.</p>
        )}
        {submitError && <div className="error-text" style={{ marginTop: 8 }}>{submitError}</div>}
      </Modal>
    </>
  )
}
