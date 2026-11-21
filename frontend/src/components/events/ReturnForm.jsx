import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Package, TriangleAlert, Wrench } from 'lucide-react'
import QtyInput from './QtyInput'
import AnimatedNumber from '../ui/AnimatedNumber'

const filled = (v) => v !== '' && v !== undefined && v !== null

/**
 * Langkah 3: isi sisa per barang.
 * values:  { [itemId]: qtyTersisa | '' }          — kembali dalam kondisi baik (masuk lagi ke stok)
 * damaged: { [itemId]: qtyRusakHilang | '' }      — opsional, tidak kembali ke stok
 * Terpakai = dibawa − tersisa − rusak/hilang (hanya-baca)
 *
 * Peralatan (is_equipment): values = kembali baik, damaged = kembali tapi rusak,
 * hilang = dibawa − kembali − rusak (hanya yang hilang mengurangi stok).
 */
export default function ReturnForm({ lines: allLines = [], values, onChange, damaged = {}, onDamagedChange }) {
  const lines = useMemo(() => allLines.filter((l) => !l.is_equipment), [allLines])
  const tools = useMemo(() => allLines.filter((l) => l.is_equipment), [allLines])
  const set = (id, v) => onChange({ ...values, [id]: v })
  const setBad = (id, v) => onDamagedChange?.({ ...damaged, [id]: v })
  // baris yang kolom rusak/hilang-nya dibuka (atau sudah ada isinya)
  const [openBad, setOpenBad] = useState(() => new Set(Object.keys(damaged).filter((k) => Number(damaged[k]) > 0).map(Number)))

  const totals = useMemo(() => lines.reduce((t, l) => {
    const r = values[l.item_id]
    const b = Number(damaged[l.item_id]) || 0
    return {
      out: t.out + l.qty_out,
      returned: t.returned + (filled(r) ? Number(r) : 0),
      damaged: t.damaged + b,
      used: t.used + (filled(r) ? Math.max(0, l.qty_out - Number(r) - b) : 0),
      missing: t.missing + (filled(r) ? 0 : 1),
      over: t.over + (filled(r) && Number(r) + b > l.qty_out ? 1 : 0),
    }
  }, { out: 0, returned: 0, damaged: 0, used: 0, missing: 0, over: 0 }), [lines, values, damaged])

  return (
    <div>
      {tools.length > 0 && (
        <EquipmentReturn tools={tools} values={values} damaged={damaged} set={set} setBad={setBad} canDamage={!!onDamagedChange} />
      )}
      {lines.length > 0 && tools.length > 0 && (
        <div className="section-label" style={{ marginTop: 22 }}><Package size={13} /> Barang habis pakai</div>
      )}
      {lines.length > 0 && (
      <>
      <div className="ret-head">
        <span>Barang</span>
        <span className="num">Dibawa</span>
        <span className="num">Tersisa (baik)</span>
        <span className="num">Terpakai</span>
      </div>

      {lines.map((l, i) => {
        const r = values[l.item_id]
        const b = Number(damaged[l.item_id]) || 0
        const over = filled(r) && Number(r) + b > l.qty_out
        const used = filled(r) ? l.qty_out - Number(r) - b : null
        const showBad = openBad.has(l.item_id)
        return (
          <motion.div
            key={l.item_id}
            className={`ret-row ${over ? 'mismatch' : filled(r) ? 'filled' : ''}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i, 15) * 0.03 }}
          >
            <div className="ret-name">
              <div style={{ fontWeight: 500 }}>{l.name}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {l.category || l.sku}
                <button type="button" className="link-btn" onClick={() => set(l.item_id, Math.max(0, l.qty_out - b))}>Kembali utuh</button>
                <button type="button" className="link-btn" onClick={() => set(l.item_id, 0)}>Habis</button>
                {onDamagedChange && !showBad && (
                  <button type="button" className="link-btn danger" onClick={() => setOpenBad((s) => new Set(s).add(l.item_id))}>Ada yang rusak/hilang?</button>
                )}
              </div>
            </div>
            <div className="num ret-out" data-label="Dibawa">
              <span className="qty-pill">{l.qty_out}</span>
            </div>
            <div className="num ret-in" data-label="Tersisa (baik)">
              <QtyInput value={r} min={0} max={l.qty_out} placeholder="?" onChange={(v) => set(l.item_id, v)} invalid={over} />
            </div>
            <div className="num ret-used" data-label="Terpakai">
              <motion.span
                key={used ?? 'x'}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`qty-pill ${used === null ? '' : used < 0 ? 'diff-minus' : used > 0 ? 'used' : 'zero-used'}`}
              >
                {used ?? '—'}
              </motion.span>
            </div>

            <AnimatePresence initial={false}>
              {showBad && (
                <motion.div
                  className="ret-bad"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <span className="row" style={{ gap: 6, color: 'var(--danger)', fontWeight: 500, fontSize: 13 }}>
                    <TriangleAlert size={14} /> Rusak / hilang
                  </span>
                  <QtyInput value={Number(damaged[l.item_id]) || 0} min={0} max={l.qty_out} placeholder="0" onChange={(v) => setBad(l.item_id, v)} invalid={over} />
                  <button type="button" className="link-btn" onClick={() => { setBad(l.item_id, ''); setOpenBad((s) => { const n = new Set(s); n.delete(l.item_id); return n }) }}>Batal</button>
                  {over && <span className="error-text" style={{ flexBasis: '100%' }}>Tersisa + rusak/hilang melebihi jumlah yang dibawa ({l.qty_out}).</span>}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )
      })}

      <div className="ret-total" style={{ gridTemplateColumns: `repeat(${totals.damaged > 0 ? 4 : 3}, minmax(0, 1fr))` }}>
        <div><span className="muted">Dibawa</span><b><AnimatedNumber value={totals.out} duration={0.4} /></b></div>
        <div><span className="muted">Tersisa</span><b><AnimatedNumber value={totals.returned} duration={0.4} /></b></div>
        {totals.damaged > 0 && <div><span className="muted">Rusak/hilang</span><b style={{ color: 'var(--danger)' }}><AnimatedNumber value={totals.damaged} duration={0.4} /></b></div>}
        <div><span className="muted">Terpakai</span><b style={{ color: 'var(--accent-strong)' }}><AnimatedNumber value={totals.used} duration={0.4} /></b></div>
        {totals.missing > 0 && <div className="badge warn">{totals.missing} barang belum diisi</div>}
      </div>
      </>
      )}
    </div>
  )
}

/**
 * Cek peralatan saat pulang. Default: semua kembali utuh (tampil ringkas).
 * Kalau ada yang rusak / hilang, staff buka daftarnya dan ubah per alat.
 */
function EquipmentReturn({ tools, values, damaged, set, setBad, canDamage }) {
  const back = (l) => (filled(values[l.item_id]) ? Number(values[l.item_id]) : 0)
  const bad = (l) => Number(damaged[l.item_id]) || 0
  const sum = tools.reduce((t, l) => ({
    out: t.out + l.qty_out,
    bad: t.bad + bad(l),
    lost: t.lost + Math.max(0, l.qty_out - back(l) - bad(l)),
  }), { out: 0, bad: 0, lost: 0 })
  const allBack = sum.bad === 0 && sum.lost === 0
  // daftar terbuka kalau laporan tersimpan sudah mencatat rusak/hilang (mis. saat owner mengoreksi)
  const [open, setOpen] = useState(() => tools.some((l) => l.qty_returned !== null && (l.qty_damaged || l.qty_lost)))
  const [openBad, setOpenBad] = useState(() => new Set(tools.filter((l) => bad(l) > 0).map((l) => l.item_id)))
  const checked = tools.filter((l) => l.checked).length

  return (
    <div>
      <div className="section-label"><Wrench size={13} /> Peralatan · {tools.length} alat</div>
      <div className={`equip-sum-card ${allBack ? '' : sum.lost ? 'bad' : 'warn'}`}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>
            {allBack ? `Semua ${sum.out} unit kembali utuh` : [sum.bad ? `${sum.bad} rusak` : null, sum.lost ? `${sum.lost} hilang` : null].filter(Boolean).join(' · ')}
          </div>
          <div style={{ fontSize: 12.5, opacity: 0.85 }}>
            {allBack ? `${checked}/${tools.length} alat dicek sebelum berangkat` : 'Rusak tetap kembali ke gudang (ditandai rusak). Hilang mengurangi stok.'}
          </div>
        </div>
        <button type="button" className="btn btn-sm" onClick={() => setOpen((v) => !v)}>
          {open ? 'Tutup daftar' : 'Ada yang rusak / hilang?'}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
            <div className="ret-head" style={{ marginTop: 12 }}>
              <span>Alat</span>
              <span className="num">Dibawa</span>
              <span className="num">Kembali</span>
              <span className="num">Hilang</span>
            </div>
            {tools.map((l) => {
              const b = bad(l)
              const r = values[l.item_id]
              const over = filled(r) && Number(r) + b > l.qty_out
              const lost = filled(r) ? l.qty_out - Number(r) - b : null
              const showBad = openBad.has(l.item_id)
              return (
                <div key={l.item_id} className={`ret-row ${over ? 'mismatch' : lost > 0 ? 'lost' : b > 0 ? 'mismatch' : 'filled'}`}>
                  <div className="ret-name">
                    <div style={{ fontWeight: 500 }}>{l.name}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {l.checked ? 'dicek sebelum berangkat' : 'belum dicek saat berangkat'}
                      {(lost !== 0 || b > 0) && <button type="button" className="link-btn" onClick={() => { set(l.item_id, l.qty_out); setBad(l.item_id, ''); setOpenBad((x) => { const n = new Set(x); n.delete(l.item_id); return n }) }}>Kembali utuh</button>}
                      {canDamage && !showBad && <button type="button" className="link-btn danger" onClick={() => setOpenBad((x) => new Set(x).add(l.item_id))}>Ada yang rusak?</button>}
                    </div>
                  </div>
                  <div className="num ret-out" data-label="Dibawa"><span className="qty-pill">{l.qty_out}</span></div>
                  <div className="num ret-in" data-label="Kembali">
                    <QtyInput value={r} min={0} max={l.qty_out} placeholder="?" onChange={(v) => set(l.item_id, v)} invalid={over} />
                  </div>
                  <div className="num ret-used" data-label="Hilang">
                    <span className={`qty-pill ${lost === null ? '' : lost !== 0 ? 'diff-minus' : 'zero-used'}`}>{lost ?? '—'}</span>
                  </div>
                  <AnimatePresence initial={false}>
                    {showBad && (
                      <motion.div className="ret-bad" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                        <span className="row" style={{ gap: 6, color: 'var(--danger)', fontWeight: 500, fontSize: 13 }}><TriangleAlert size={14} /> Kembali tapi rusak</span>
                        <QtyInput
                          value={Number(damaged[l.item_id]) || 0} min={0} max={l.qty_out} placeholder="0" invalid={over}
                          onChange={(v) => {
                            setBad(l.item_id, v)
                            // yang rusak dipindah dari "kembali baik", bukan dianggap hilang
                            const n = Number(v) || 0
                            if (filled(r) && Number(r) + n > l.qty_out) set(l.item_id, Math.max(0, l.qty_out - n))
                          }}
                        />
                        <button type="button" className="link-btn" onClick={() => { setBad(l.item_id, ''); setOpenBad((x) => { const n = new Set(x); n.delete(l.item_id); return n }) }}>Batal</button>
                        {over && <span className="error-text" style={{ flexBasis: '100%' }}>Kembali + rusak melebihi jumlah yang dibawa ({l.qty_out}).</span>}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export const hasOverflow = (lines, values, damaged) =>
  lines.some((l) => filled(values[l.item_id]) && Number(values[l.item_id]) + (Number(damaged[l.item_id]) || 0) > l.qty_out)
