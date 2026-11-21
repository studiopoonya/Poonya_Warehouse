import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, ClipboardCheck, TriangleAlert } from 'lucide-react'
import QtyInput from './QtyInput'
import { CONDITIONS } from '../../utils/format'

/**
 * Langkah 2 (bagian peralatan): checklist alat yang dibawa ke event (daftar standar "Booth 1").
 * Stok gudang TIDAK berkurang — alat hanya dicatat dibawa, lalu dicek kembali saat pulang.
 * picked:  { [itemId]: qty }   (alat yang dibawa)
 * checked: { [itemId]: bool }  ("work done": sudah dites / dibersihkan sebelum berangkat)
 */
export default function EquipmentChecklist({ items = [], picked, checked, onPick, onCheck }) {
  const [showOthers, setShowOthers] = useState(false)

  // alat di daftar standar dulu; alat lain (tidak ada di daftar) disembunyikan di bawah
  const kit = useMemo(() => items.filter((i) => i.kit_qty), [items])
  const others = useMemo(() => items.filter((i) => !i.kit_qty && (i.available > 0 || picked[i.id] !== undefined)), [items, picked])

  const pickedIds = items.filter((i) => picked[i.id] !== undefined).map((i) => i.id)
  const checkedCount = pickedIds.filter((id) => checked[id]).length
  const allChecked = pickedIds.length > 0 && checkedCount === pickedIds.length

  const toggle = (item) => {
    if (picked[item.id] !== undefined) onPick(item.id, undefined)
    else onPick(item.id, Math.max(1, Math.min(item.kit_qty || 1, item.available)))
  }

  const row = (item, i) => {
    const selected = picked[item.id] !== undefined
    const qty = picked[item.id]
    const none = item.available <= 0
    const short = item.kit_qty && item.available < item.kit_qty
    const cond = item.condition && item.condition !== 'baik' ? CONDITIONS[item.condition] : null
    return (
      <motion.div
        layout="position"
        key={item.id}
        className={`pick-row ${selected ? 'selected' : ''} ${none && !selected ? 'disabled' : ''}`}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(i, 15) * 0.02 }}
      >
        <button type="button" className="pick-main" onClick={() => (!none || selected) && toggle(item)} disabled={none && !selected}>
          <span className="pick-check">
            <AnimatePresence>
              {selected && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 25 }}>
                  <Check size={13} strokeWidth={3} />
                </motion.span>
              )}
            </AnimatePresence>
          </span>
          <span style={{ minWidth: 0 }}>
            <span className="pick-name">
              {item.name}
              {cond && <span className={`badge ${cond.badge}`} style={{ marginLeft: 6, fontSize: 10.5 }}>{cond.label}</span>}
            </span>
            <span className={`pick-sub ${none || short ? 'warn-text' : ''}`}>
              {item.kit_qty ? `Standar ${item.kit_qty} ${item.unit}` : item.unit}
              {' · '}
              {none
                ? (item.in_use ? 'semua sedang dibawa ke event lain' : 'tidak ada di gudang')
                : `ada ${item.available}${item.in_use ? ` (${item.in_use} di event lain)` : ''}`}
            </span>
          </span>
        </button>
        <AnimatePresence initial={false}>
          {selected && (
            <motion.div className="equip-actions" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.15 }}>
              {(item.kit_qty > 1 || item.available > 1 || qty > 1) && (
                <QtyInput value={qty} min={1} max={item.available} onChange={(v) => onPick(item.id, v)} invalid={qty === '' || qty > item.available} />
              )}
              <button type="button" className={`check-chip ${checked[item.id] ? 'on' : ''}`} onClick={() => onCheck(item.id, !checked[item.id])} aria-pressed={!!checked[item.id]}>
                <Check size={12} strokeWidth={3} /> Dicek
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  }

  return (
    <div>
      <div className="equip-head">
        <span><b>{pickedIds.length}</b> alat dibawa · <b>{checkedCount}</b> sudah dicek</span>
        {pickedIds.length > 0 && (
          <button type="button" className="link-btn" onClick={() => pickedIds.forEach((id) => onCheck(id, !allChecked))}>
            <ClipboardCheck size={13} /> {allChecked ? 'Batalkan semua cek' : 'Tandai semua dicek'}
          </button>
        )}
      </div>
      <div className="pick-list">
        {kit.length === 0 && <div className="empty" style={{ padding: 20 }}>Belum ada daftar peralatan standar. Owner bisa mengisi "Jumlah standar dibawa" di data barang.</div>}
        {kit.map(row)}
      </div>
      {others.length > 0 && (
        <>
          <button type="button" className="link-btn" style={{ marginTop: 10 }} onClick={() => setShowOthers((v) => !v)}>
            <ChevronDown size={13} style={{ transform: showOthers ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} /> Peralatan lain ({others.length})
          </button>
          <AnimatePresence initial={false}>
            {showOthers && (
              <motion.div className="pick-list" style={{ marginTop: 8, overflow: 'hidden' }} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                {others.map(row)}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
      {pickedIds.length > checkedCount && (
        <div className="row muted" style={{ gap: 6, fontSize: 12.5, marginTop: 10 }}>
          <TriangleAlert size={13} /> {pickedIds.length - checkedCount} alat belum dicek. Tes &amp; bersihkan dulu sebelum berangkat.
        </div>
      )}
    </div>
  )
}
