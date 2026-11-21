const nf = new Intl.NumberFormat('id-ID')
export const fmt = (n) => nf.format(Number(n) || 0)

/** Rp 1.500.000 (negatif: -Rp 3.000) */
export const fmtRp = (n) => { const v = Number(n) || 0; return `${v < 0 ? '-' : ''}Rp ${nf.format(Math.abs(v))}` }

/** Rp 1,5 jt / Rp 250 rb — untuk angka besar di kartu ringkas */
export const fmtRpShort = (n) => {
  const v = Number(n) || 0
  if (Math.abs(v) >= 1e9) return `Rp ${(v / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`
  if (Math.abs(v) >= 1e6) return `Rp ${(v / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`
  if (Math.abs(v) >= 1e3) return `Rp ${(v / 1e3).toLocaleString('id-ID', { maximumFractionDigits: 0 })} rb`
  return fmtRp(v)
}

export const fmtBytes = (b) => (b >= 1048576 ? `${(b / 1048576).toLocaleString('id-ID', { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

export const fmtDate = (d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  d ? new Intl.DateTimeFormat('id-ID', opts).format(new Date(d)) : '-'

export const fmtDateTime = (d) =>
  d
    ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(d))
    : '-'

export function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return 'baru saja'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} mnt lalu`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} jam lalu`
  const day = Math.floor(h / 24)
  if (day < 30) return `${day} hari lalu`
  return fmtDate(d)
}

export function greeting(date = new Date()) {
  const h = date.getHours()
  if (h < 11) return 'Selamat pagi'
  if (h < 15) return 'Selamat siang'
  if (h < 18) return 'Selamat sore'
  return 'Selamat malam'
}

export const MOVEMENT_TYPES = {
  in: { label: 'Masuk', badge: 'green' },
  out: { label: 'Keluar', badge: 'danger' },
  transfer_in: { label: 'Transfer masuk', badge: 'info' },
  transfer_out: { label: 'Transfer keluar', badge: 'warn' },
  adjust: { label: 'Penyesuaian', badge: '' },
  event_out: { label: 'Dibawa ke event', badge: 'warn' },
  event_return: { label: 'Kembali dari event', badge: 'info' },
  event_lost: { label: 'Hilang di event', badge: 'danger' },
}

/** Kondisi peralatan per venue */
export const CONDITIONS = {
  baik: { label: 'Baik', badge: 'green' },
  rusak: { label: 'Rusak', badge: 'danger' },
  servis: { label: 'Servis', badge: 'warn' },
}

/** Jenis barang */
export const ITEM_KINDS = {
  consumable: { label: 'Habis pakai', hint: 'Stok berkurang sebanyak yang terpakai di event' },
  equipment: { label: 'Peralatan', hint: 'Dibawa & kembali lagi, stok hanya berkurang kalau hilang' },
}

export const EVENT_STATUS = {
  scheduled: { label: 'Terjadwal', badge: 'info' },
  ongoing: { label: 'Sedang berjalan', badge: 'warn' },
  completed: { label: 'Selesai', badge: 'green' },
  cancelled: { label: 'Dibatalkan', badge: 'danger' },
}

/** YYYY-MM-DD hari ini menurut jam lokal */
export const todayISO = () => new Date().toLocaleDateString('en-CA')
