import { useState } from 'react'
import { motion } from 'framer-motion'
import VenueCreateModal from '../components/forms/VenueCreateModal'
import { MapPin, Plus } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import VenueBreakdown from '../components/dashboard/VenueBreakdown'
import { Card } from '../components/ui/Card'
import { ApiError, Skeleton } from '../components/ui/Feedback'
import { stagger } from '../components/ui/motion'
import { useVenues } from '../context/VenueContext'
import { VenueIcon, venueMeta } from '../utils/venueMeta'

export default function Venues() {
  const { venues, loading, error, refresh } = useVenues()
  const [open, setOpen] = useState(false)

  return (
    <>
      <PageHeader
        title="Venue"
        sub={[`${venues.length} lokasi`, `${venues.filter((v) => v.type === 'warehouse').length} gudang`]}
        actions={<button className="btn btn-dark" onClick={() => setOpen(true)}><Plus size={15} /> Tambah venue</button>}
      />
      <VenueCreateModal open={open} onClose={() => setOpen(false)} onSaved={refresh} />
      {error && <ApiError onRetry={refresh} />}
      {loading ? (
        <div className="grid grid-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={210} />)}</div>
      ) : (
        <>
          <VenueBreakdown venues={venues} />
          <motion.div className="grid grid-2 mt" variants={stagger} initial="hidden" animate="show">
            {venues.map((v) => {
              const m = venueMeta(v)
              return (
                <Card key={v.id}>
                  <div className="row">
                    <span className="li-icon" style={{ background: m.soft, color: m.color }}><VenueIcon venue={v} /></span>
                    <div>
                      <div className="card-title">{v.name}</div>
                      <div className="card-sub row" style={{ gap: 4 }}><MapPin size={12} /> {v.address || 'Alamat belum diisi'}</div>
                    </div>
                    <span className="badge" style={{ marginLeft: 'auto' }}>{v.type_label}</span>
                  </div>
                  {v.description && <p className="muted" style={{ marginTop: 10, fontSize: 13 }}>{v.description}</p>}
                </Card>
              )
            })}
          </motion.div>
        </>
      )}
    </>
  )
}
