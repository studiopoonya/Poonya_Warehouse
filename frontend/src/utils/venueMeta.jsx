import { Warehouse, Camera, Aperture, Sparkles } from 'lucide-react'

// Tampilan bawaan 4 venue awal (dicocokkan lewat slug)
const PRESET = {
  warehouse: { icon: Warehouse, color: '#121412' },
  'poonya-box-sat': { icon: Camera, color: '#2f9e5b' },
  'poonya-box-dobro': { icon: Aperture, color: '#d98a0b' },
  'self-studio': { icon: Sparkles, color: '#7c5cdb' },
}

// Venue baru: ikon mengikuti tipe
const TYPE_ICON = { warehouse: Warehouse, booth: Camera, studio: Sparkles }

/** Pilihan warna untuk venue baru */
export const VENUE_COLORS = ['#121412', '#2f9e5b', '#d98a0b', '#7c5cdb', '#3b6fd9', '#0ea5e9', '#e0457b', '#d9443a', '#0d9488', '#8a6d3b']

/** Warna transparan untuk latar lembut (#rrggbb -> rgba) */
const soft = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, .12)`
}

export function venueMeta(venue) {
  const preset = PRESET[venue?.slug]
  const color = venue?.color || preset?.color || '#3b6fd9'
  const icon = preset?.icon || TYPE_ICON[venue?.type] || Warehouse
  return { icon, color, soft: color === '#121412' ? '#e9ebe6' : soft(color) }
}

export function VenueIcon({ venue, size = 16 }) {
  const { icon: Icon } = venueMeta(venue)
  return <Icon size={size} strokeWidth={2} />
}

export function VenueDot({ venue }) {
  return <span className="nav-dot" style={{ background: venueMeta(venue).color }} />
}
