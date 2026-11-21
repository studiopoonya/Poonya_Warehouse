import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Crown, Pencil, Plus, Trash2, UserRound, Users as UsersIcon, Power } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import Modal from '../components/ui/Modal'
import { ApiError, Badge, EmptyState, Skeleton } from '../components/ui/Feedback'
import { stagger } from '../components/ui/motion'
import UserFormModal from '../components/forms/UserFormModal'
import { Users } from '../api/endpoints'
import { errorMessage } from '../api/client'
import { useFetch } from '../hooks/useFetch'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { timeAgo } from '../utils/format'

const FILTERS = [
  { value: '', label: 'Semua' },
  { value: 'owner', label: 'Owner' },
  { value: 'staff', label: 'Staff' },
  { value: 'inactive', label: 'Nonaktif' },
]

const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?'

export default function UsersPage() {
  const { user: me } = useAuth()
  const toast = useToast()
  const { data, loading, error, reload } = useFetch(() => Users.list(), [])
  const [filter, setFilter] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const list = useMemo(() => (data || []).filter((u) => {
    if (filter === 'inactive') return !u.is_active
    return !filter || u.role === filter
  }), [data, filter])

  const stats = useMemo(() => {
    const all = data || []
    return {
      total: all.length,
      owners: all.filter((u) => u.role === 'owner').length,
      staff: all.filter((u) => u.role === 'staff' && u.is_active).length,
      inactive: all.filter((u) => !u.is_active).length,
    }
  }, [data])

  const toggleActive = async (u) => {
    try {
      await Users.update(u.id, { name: u.name, email: u.email, role: u.role, is_active: !u.is_active })
      toast(u.is_active ? `${u.name} dinonaktifkan` : `${u.name} diaktifkan lagi`)
      reload()
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  const confirmDelete = async () => {
    try {
      await Users.remove(deleting.id)
      toast('Akun dihapus')
      setDeleting(null)
      reload()
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  return (
    <>
      <PageHeader
        title="Pengguna"
        sub={['Owner mengelola semuanya, staff hanya mengisi logistik event']}
        actions={<button className="btn btn-dark" onClick={() => { setEditing(null); setFormOpen(true) }}><Plus size={15} /> Tambah akun</button>}
      />

      {error && <ApiError message={error} onRetry={reload} />}

      {loading && !data ? (
        <div className="stack">{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={56} />)}</div>
      ) : data && (
        <>
          <motion.div className="grid grid-4" variants={stagger} initial="hidden" animate="show">
            <StatCard variant="highlight" label="Total akun" icon={UsersIcon} value={stats.total} />
            <StatCard label="Owner" icon={Crown} value={stats.owners} />
            <StatCard label="Staff aktif" icon={UserRound} value={stats.staff} />
            <StatCard variant="dark" label="Nonaktif" icon={Power} value={stats.inactive} />
          </motion.div>

          <div className="toolbar mt-lg">
            <div className="chips">
              {FILTERS.map((f) => (
                <button key={f.value} className={`chip ${filter === f.value ? 'active' : ''}`} onClick={() => setFilter(f.value)}>{f.label}</button>
              ))}
            </div>
          </div>

          {list.length === 0 ? (
            <div className="card"><EmptyState icon={UsersIcon} title="Tidak ada akun" /></div>
          ) : (
            <div className="table-wrap">
              <table className="table responsive">
                <thead>
                  <tr><th>Nama</th><th>Peran</th><th>Akses</th><th>Status</th><th>Login terakhir</th><th /></tr>
                </thead>
                <tbody>
                  <AnimatePresence initial>
                    {list.map((u, i) => {
                      const self = u.id === me?.id
                      return (
                        <motion.tr
                          key={u.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: u.is_active ? 1 : 0.55, y: 0, transition: { delay: Math.min(i, 12) * 0.03 } }}
                          exit={{ opacity: 0 }}
                        >
                          <td className="cell-main" style={{ minWidth: 220 }}>
                            <div className="item-cell">
                              <span className="avatar">{initials(u.name)}</span>
                              <div>
                                <div style={{ fontWeight: 500 }}>{u.name} {self && <span className="muted" style={{ fontWeight: 400 }}>(kamu)</span>}</div>
                                <div className="muted" style={{ fontSize: 12 }}>{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td data-label="Peran">
                            {u.role === 'owner'
                              ? <Badge tone="dark"><Crown size={11} /> Owner</Badge>
                              : <Badge><UserRound size={11} /> Staff</Badge>}
                          </td>
                          <td data-label="Akses" className="muted">
                            {u.role === 'owner' ? 'Semua fitur' : 'Logistik event'}
                          </td>
                          <td data-label="Status">{u.is_active ? <Badge tone="green" dot>Aktif</Badge> : <Badge tone="danger" dot>Nonaktif</Badge>}</td>
                          <td data-label="Login terakhir" className="muted cell-wide" style={{ whiteSpace: 'nowrap' }}>{u.last_login_at ? timeAgo(u.last_login_at) : 'Belum pernah'}</td>
                          <td className="cell-actions">
                            <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                              <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(u); setFormOpen(true) }} aria-label="Edit" title="Edit"><Pencil size={14} /></button>
                              {!self && (
                                <>
                                  <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(u)} title={u.is_active ? 'Nonaktifkan' : 'Aktifkan'} aria-label={u.is_active ? 'Nonaktifkan' : 'Aktifkan'}>
                                    <Power size={14} color={u.is_active ? 'var(--muted)' : 'var(--accent)'} />
                                  </button>
                                  <button className="btn btn-ghost btn-sm btn-danger" onClick={() => setDeleting(u)} aria-label="Hapus" title="Hapus"><Trash2 size={14} /></button>
                                </>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <UserFormModal open={formOpen} onClose={() => setFormOpen(false)} account={editing} onSaved={reload} />

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Hapus akun?"
        width={440}
        footer={
          <>
            <button className="btn" onClick={() => setDeleting(null)}>Batal</button>
            <button className="btn btn-dark" style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={confirmDelete}>Hapus</button>
          </>
        }
      >
        <p>Akun <b>{deleting?.name}</b> akan dihapus permanen. Riwayat stok yang pernah dia catat tetap ada, tapi namanya tidak tampil lagi.</p>
        <p className="muted" style={{ marginTop: 10, fontSize: 13 }}>Kalau orangnya hanya berhenti kerja, lebih baik <b>nonaktifkan</b> saja supaya jejaknya tetap tercatat.</p>
      </Modal>
    </>
  )
}
