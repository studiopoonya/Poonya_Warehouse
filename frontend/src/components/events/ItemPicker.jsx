import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Search } from 'lucide-react'
import QtyInput from './QtyInput'
import { fmt } from '../../utils/format'

/**
 * Langkah 2: pilih barang yang dibawa dari gudang.
 * picked: { [itemId]: qty }
 */
export default function ItemPicker({ items = [], picked, onChange }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [onlyPicked, setOnlyPicked] = useState(false)

  const categories = useMemo(() => [...new Set(items.map((i) => i.category).filter(Boolean))].sort(), [items])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((i) =>
      (!q || i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q))
      && (!category || i.category === category)
      && (!onlyPicked || picked[i.id] !== undefined))
  }, [items, search, category, onlyPicked, picked])

  const toggle = (item) => {
    const next = { ...picked }
    if (next[item.id] !== undefined) delete next[item.id]
    else next[item.id] = 1
    onChange(next)
  }

  const setQty = (id, qty) => onChange({ ...picked, [id]: qty })
  const pickedCount = Object.keys(picked).length

  return (
    <div>
      <div className="toolbar" style={{ marginBottom: 10 }}>
        <div className="search" style={{ flex: 1, minWidth: 200 }}>
          <Search size={14} />
          <input placeholder="Cari barang…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button type="button" className={`chip ${onlyPicked ? 'active' : ''}`} onClick={() => setOnlyPicked((v) => !v)}>
          Dipilih ({pickedCount})
        </button>
      </div>
      <div className="chips" style={{ marginBottom: 12 }}>
        <button type="button" className={`chip ${!category ? 'active' : ''}`} onClick={() => setCategory('')}>Semua</button>
        {categories.map((c) => (
          <button type="button" key={c} className={`chip ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>{c}</button>
        ))}
      </div>

      <div className="pick-list">
        {visible.length === 0 && <div className="empty" style={{ padding: 24 }}>Tidak ada barang yang cocok.</div>}
        {visible.map((item) => {
          const selected = picked[item.id] !== undefined
          const empty = item.available <= 0
          const qty = picked[item.id]
          return (
            <motion.div
              layout="position"
              key={item.id}
              className={`pick-row ${selected ? 'selected' : ''} ${empty ? 'disabled' : ''}`}
            >
              <button type="button" className="pick-main" onClick={() => !empty && toggle(item)} disabled={empty}>
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
                  <span className="pick-name">{item.name} <span className="muted" style={{ fontWeight: 400 }}>/ {item.unit}</span></span>
                  <span className="pick-sub">
                    {empty ? 'Stok gudang habis' : `Stok gudang: ${fmt(item.available)}`}
                    {item.category ? ` · ${item.category}` : ''}
                  </span>
                </span>
              </button>
              <AnimatePresence initial={false}>
                {selected && (
                  <motion.div
                    className="pick-qty"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <QtyInput value={qty} min={1} max={item.available} onChange={(v) => setQty(item.id, v)} invalid={qty === '' || qty > item.available} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
