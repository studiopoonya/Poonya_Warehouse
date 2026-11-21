import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import Modal from '../ui/Modal'
import { Skeleton } from '../ui/Feedback'
import { Categories } from '../../api/endpoints'
import { errorMessage } from '../../api/client'
import { useFetch } from '../../hooks/useFetch'
import { useToast } from '../../context/ToastContext'

/** Daftar kategori: tambah, ganti nama, hapus. Dipakai di Pengaturan & modal di Inventaris. */
export function CategoryManager({ onChanged }) {
  const toast = useToast()
  const { data, loading, reload } = useFetch(() => Categories.list(), [])
  const [newName, setNewName] = useState('')
  const [editing, setEditing] = useState(null) // { id, name }
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  const done = (msg) => { toast(msg); reload(); onChanged?.() }
  const run = async (fn) => {
    setBusy(true)
    try { await fn() } catch (e) { toast(errorMessage(e), 'error') } finally { setBusy(false) }
  }

  const add = (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    run(async () => { await Categories.create(newName.trim()); setNewName(''); done('Kategori ditambahkan') })
  }
  const save = () => run(async () => { await Categories.update(editing.id, editing.name); setEditing(null); done('Nama kategori diubah') })
  const remove = () => run(async () => { await Categories.remove(deleting.id); setDeleting(null); done('Kategori dihapus') })

  return (
    <div>
      <form className="row" onSubmit={add} style={{ marginBottom: 12 }}>
        <input className="input" placeholder="Nama kategori baru, misal: Souvenir" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button className="btn btn-dark" disabled={busy || !newName.trim()}><Plus size={15} /> Tambah</button>
      </form>

      {loading && !data ? (
        <div className="stack">{[0, 1, 2].map((i) => <Skeleton key={i} height={44} />)}</div>
      ) : (
        <div className="cat-list">
          <AnimatePresence initial={false}>
            {(data || []).map((c) => (
              <motion.div key={c.id} layout className="cat-row" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                {editing?.id === c.id ? (
                  <form className="row" style={{ flex: 1 }} onSubmit={(e) => { e.preventDefault(); save() }}>
                    <input className="input" autoFocus value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                    <button className="icon-btn" disabled={busy} aria-label="Simpan"><Check size={15} /></button>
                    <button type="button" className="icon-btn" onClick={() => setEditing(null)} aria-label="Batal"><X size={15} /></button>
                  </form>
                ) : (
                  <>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500 }}>{c.name}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{c.items_count} barang</div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing({ id: c.id, name: c.name })} aria-label="Ganti nama"><Pencil size={14} /></button>
                    <button className="btn btn-ghost btn-sm btn-danger" onClick={() => setDeleting(c)} aria-label="Hapus"><Trash2 size={14} /></button>
                  </>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {data?.length === 0 && <div className="empty" style={{ padding: 20 }}>Belum ada kategori.</div>}
        </div>
      )}

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Hapus kategori?"
        width={420}
        footer={
          <>
            <button className="btn" onClick={() => setDeleting(null)}>Batal</button>
            <button className="btn btn-dark" style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }} disabled={busy} onClick={remove}>Hapus</button>
          </>
        }
      >
        <p>Kategori <b>{deleting?.name}</b> akan dihapus.{deleting?.items_count > 0 && <> {deleting.items_count} barang di dalamnya <b>tidak ikut terhapus</b>, hanya menjadi tanpa kategori.</>}</p>
      </Modal>
    </div>
  )
}

export default function CategoryModal({ open, onClose, onChanged }) {
  return (
    <Modal open={open} onClose={onClose} title="Kelola kategori" width={520}>
      {open && <CategoryManager onChanged={onChanged} />}
    </Modal>
  )
}
