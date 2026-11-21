import { Minus, Plus } from 'lucide-react'

/** Input angka dengan tombol - / +, nyaman dipakai di HP */
export default function QtyInput({ value, onChange, min = 0, max = Infinity, placeholder, invalid, autoFocus }) {
  const num = value === '' || value === null || value === undefined ? null : Number(value)
  const clamp = (v) => Math.min(max, Math.max(min, v))

  return (
    <div className={`qty-input ${invalid ? 'invalid' : ''}`}>
      <button type="button" onClick={() => onChange(clamp((num ?? min) - 1))} disabled={num !== null && num <= min} aria-label="Kurangi">
        <Minus size={13} />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={Number.isFinite(max) ? max : undefined}
        value={num ?? ''}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value === '' ? '' : clamp(Math.floor(Number(e.target.value))))}
        onFocus={(e) => e.target.select()}
      />
      <button type="button" onClick={() => onChange(clamp((num ?? min - 1) + 1))} disabled={num !== null && num >= max} aria-label="Tambah">
        <Plus size={13} />
      </button>
    </div>
  )
}
