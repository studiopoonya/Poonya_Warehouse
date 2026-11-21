import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Search, Pencil, Trash2, Package, Archive, ArchiveRestore, Upload, Download, Tags, Wrench } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Segmented from '../components/ui/Segmented'
import { ApiError, Badge, EmptyState, Skeleton } from '../components/ui/Feedback'
import ItemFormModal from '../components/forms/ItemFormModal'
import ImportModal from '../components/forms/ImportModal'
import CategoryModal from '../components/forms/CategoryManager'
import Modal from '../components/ui/Modal'
import { Categories, Items } from '../api/endpoints'
import { blobErrorMessage, downloadFile, errorMessage } from '../api/client'
import { useFetch } from '../hooks/useFetch'
import { useVenues } from '../context/VenueContext'
import { useToast } from '../context/ToastContext'
import { VenueDot } from '../utils/venueMeta'
import { CONDITIONS, fmt, fmtRp, fmtRpShort } from '../utils/format'

function QtyPill({ stock }) {
  if (!stock) return <span className="muted">—</span>
  // peralatan yang rusak / sedang diservis di venue ini
  const cond = stock.condition && stock.condition !== 'baik' && stock.quantity > 0 ? CONDITIONS[stock.condition] : null
  if (cond) {
    return (
      <span className="qty-cond" title={`Kondisi: ${cond.label}`}>
        <span className="qty-pill">{fmt(stock.quantity)}</span>
        <span className={`badge ${cond.badge}`}>{cond.label}</span>
      </span>
    )
  }
  // venue yang tidak butuh barang ini (min 0) dan stoknya 0 cukup ditampilkan redup
  if (stock.quantity === 0 && stock.min_stock === 0) return <span className="qty-pill" style={{ opacity: 0.45 }}>0</span>
  const cls = stock.quantity === 0 ? 'zero' : stock.is_low ? 'low' : ''
  return <span className={`qty-pill ${cls}`} title={`Min. ${stock.min_stock}`}>{fmt(stock.quantity)}</span>
}

export default function Inventory() {
  const [params, setParams] = useSearchParams()
  const search = params.get('search') || ''
  const view = params.get('filter') === 'low' ? 'low' : params.get('view') === 'archived' ? 'archived' : 'active'
  const categoryId = params.get('category') || ''
  const kind = ['consumable', 'equipment'].includes(params.get('kind')) ? params.get('kind') : ''
  const { venues, activeId, refresh } = useVenues()
  const toast = useToast()

  const { data: categories, reload: reloadCategories } = useFetch(() => Categories.list(), [])
  const { data: items, loading, error, reload } = useFetch(
    () => Items.list({ search, category_id: categoryId, kind, low: view === 'low' ? 1 : '', archived: view === 'archived' ? 1 : '', venue_id: activeId }),
    [search, categoryId, kind, view, activeId],
  )

  const [formOpen, setFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [catOpen, setCatOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirm, setConfirm] = useState(null) // { type: 'archive' | 'delete', item }
  const [exporting, setExporting] = useState(false)

  const setParam = (k, v) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v)
    else next.delete(k)
    setParams(next, { replace: true })
  }
  const setView = (v) => {
    const next = new URLSearchParams(params)
    next.delete('filter'); next.delete('view')
    if (v === 'low') next.set('filter', 'low')
    if (v === 'archived') next.set('view', 'archived')
    setParams(next, { replace: true })
  }

  const afterChange = () => { reload(); refresh(); reloadCategories() }

  const doConfirm = async () => {
    const { type, item } = confirm
    try {
      if (type === 'archive') {
        await Items.archive(item.id, true)
        toast(`${item.name} diarsipkan`)
      } else {
        await Items.remove(item.id)
        toast(`${item.name} dihapus permanen`)
      }
      setConfirm(null)
      afterChange()
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  const restore = async (item) => {
    try {
      await Items.archive(item.id, false)
      toast(`${item.name} dipulihkan`)
      afterChange()
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  const exportXlsx = async () => {
    setExporting(true)
    try { await downloadFile('/items/export', null, 'inventaris.xlsx') } catch (e) { toast(await blobErrorMessage(e), 'error') } finally { setExporting(false) }
  }

  const totalValue = (items || []).reduce((a, it) => a + (it.total_value || 0), 0)
  const archived = view === 'archived'

  return (
    <>
      <PageHeader
        title="Inventaris"
        sub={[
          items ? `${items.length} jenis barang${archived ? ' diarsipkan' : ''}` : null,
          !archived && items && totalValue > 0 ? `nilai ${fmtRp(totalValue)}` : null,
        ]}
        actions={
          <>
            <button className="btn" onClick={() => setImportOpen(true)}><Upload size={15} /> Import</button>
            <button className="btn hide-mobile" onClick={exportXlsx} disabled={exporting}><Download size={15} /> {exporting ? 'Menyiapkan…' : 'Export'}</button>
            <button className="btn btn-dark" onClick={() => { setEditing(null); setFormOpen(true) }}><Plus size={15} /> Tambah barang</button>
          </>
        }
      />

      <div className="toolbar">
        <div className="search grow">
          <Search size={14} />
          <input placeholder="Cari nama atau SKU…" defaultValue={search} onChange={(e) => setParam('search', e.target.value)} />
        </div>
        <Segmented value={kind} onChange={(v) => setParam('kind', v)} options={[
          { value: '', label: 'Semua' },
          { value: 'consumable', label: 'Habis pakai' },
          { value: 'equipment', label: 'Peralatan' },
        ]} />
        <Segmented value={view} onChange={setView} options={[
          { value: 'active', label: 'Aktif' },
          { value: 'low', label: 'Menipis' },
          { value: 'archived', label: 'Arsip' },
        ]} />
      </div>
      <div className="toolbar">
        <div className="chips" style={{ flex: 1 }}>
          <button className={`chip ${!categoryId ? 'active' : ''}`} onClick={() => setParam('category', '')}>Semua kategori</button>
          {(categories || []).map((c) => (
            <button key={c.id} className={`chip ${String(c.id) === categoryId ? 'active' : ''}`} onClick={() => setParam('category', String(c.id))}>
              {c.name} <span className="muted" style={{ fontSize: 11 }}>{c.items_count}</span>
            </button>
          ))}
        </div>
        <button className="btn btn-sm btn-ghost" onClick={() => setCatOpen(true)}><Tags size={14} /> Kelola kategori</button>
      </div>

      {error && <ApiError message={error} onRetry={reload} />}

      {loading && !items ? (
        <div className="stack">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} height={48} />)}</div>
      ) : items && items.length === 0 ? (
        <div className="card">
          {archived ? (
            <EmptyState icon={Archive} title="Arsip kosong" text="Barang yang sudah tidak dipakai bisa diarsipkan tanpa menghapus riwayatnya." />
          ) : (
            <EmptyState
              icon={Package}
              title={search || categoryId || kind || view === 'low' ? 'Tidak ada barang yang cocok' : 'Belum ada barang'}
              text={search || categoryId || kind || view === 'low' ? 'Coba ubah filter.' : 'Import daftar barang dari Excel, atau tambah satu per satu.'}
              action={!search && !categoryId && !kind && view !== 'low' && (
                <div className="row" style={{ justifyContent: 'center' }}>
                  <button className="btn btn-dark" onClick={() => setImportOpen(true)}><Upload size={15} /> Import dari Excel</button>
                  <button className="btn" onClick={() => { setEditing(null); setFormOpen(true) }}><Plus size={15} /> Tambah barang</button>
                </div>
              )}
            />
          )}
        </div>
      ) : items && (
        <div className="table-wrap">
          <table className="table responsive inv-table">
            <thead>
              <tr>
                <th>Barang</th>
                <th>Kategori</th>
                {venues.map((v) => (
                  <th key={v.id} className="num th-venue" style={activeId === v.id ? { color: 'var(--text)' } : undefined}>
                    <span className="th-venue-name"><VenueDot venue={v} /> {v.name}</span>
                  </th>
                ))}
                <th className="num">Total</th>
                <th className="num">Harga · Nilai</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial>
                {items.map((it, i) => {
                  const low = it.stocks.some((s) => s.is_low)
                  return (
                    <motion.tr
                      key={it.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: archived ? 0.75 : 1, y: 0, transition: { delay: Math.min(i, 15) * 0.025 } }}
                      exit={{ opacity: 0 }}
                    >
                      <td className="cell-main" style={{ minWidth: 190 }}>
                        <div className="item-cell">
                          <span className="item-thumb">{it.kind === 'equipment' ? <Wrench size={15} /> : <Package size={15} />}</span>
                          <div>
                            <div style={{ fontWeight: 500 }}>
                              {it.name}
                              {it.kind === 'equipment' && <span className="kind-tag" style={{ marginLeft: 6 }} title="Peralatan: tidak berkurang saat dipakai di event">Alat{it.kit_qty ? ` · bawa ${it.kit_qty}` : ''}</span>}
                            </div>
                            <div className="mono muted" style={{ fontSize: 11.5 }}>
                              {it.sku}
                              {it.category && <span className="hide-desktop inv-cat">{it.category.name}</span>}
                              {archived ? <Badge>Diarsipkan</Badge> : low && <Badge tone="warn" dot>Menipis</Badge>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td data-label="Kategori" className="cell-hide"><Badge>{it.category?.name || '—'}</Badge></td>
                      {venues.map((v) => (
                        <td key={v.id} data-label={v.name} className="num inv-venue" style={activeId === v.id ? { background: 'rgba(47,158,91,.05)' } : undefined}>
                          <QtyPill stock={it.stocks.find((s) => s.venue_id === v.id)} />
                        </td>
                      ))}
                      <td data-label="Total" className="num mono inv-total" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{fmt(it.total_quantity)} <span className="muted" style={{ fontWeight: 400 }}>{it.unit}</span></td>
                      <td data-label="Harga · Nilai" className="num mono inv-price" style={{ whiteSpace: 'nowrap' }} title={`Nilai stok ${fmtRp(it.total_value)}`}>
                        {it.price ? (
                          <>
                            <div>{fmtRp(it.price)}</div>
                            <div className="muted" style={{ fontSize: 11.5 }}>{fmtRpShort(it.total_value)}</div>
                          </>
                        ) : <span className="muted">—</span>}
                      </td>
                      <td className="cell-actions">
                        <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                          {archived ? (
                            <>
                              <button className="btn btn-ghost btn-sm" onClick={() => restore(it)} title="Pulihkan"><ArchiveRestore size={14} /> <span className="hide-desktop">Pulihkan</span></button>
                              <button className="btn btn-ghost btn-sm btn-danger" onClick={() => setConfirm({ type: 'delete', item: it })} title="Hapus permanen"><Trash2 size={14} /></button>
                            </>
                          ) : (
                            <>
                              <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(it); setFormOpen(true) }} title="Edit" aria-label="Edit"><Pencil size={14} /></button>
                              <button className="btn btn-ghost btn-sm" onClick={() => setConfirm({ type: 'archive', item: it })} title="Arsipkan" aria-label="Arsipkan"><Archive size={14} /></button>
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

      <ItemFormModal open={formOpen} onClose={() => setFormOpen(false)} item={editing} categories={categories || []} onSaved={afterChange} />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onDone={afterChange} />
      <CategoryModal open={catOpen} onClose={() => setCatOpen(false)} onChanged={afterChange} />

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.type === 'delete' ? 'Hapus permanen?' : 'Arsipkan barang?'}
        width={440}
        footer={
          <>
            <button className="btn" onClick={() => setConfirm(null)}>Batal</button>
            <button className="btn btn-dark" style={confirm?.type === 'delete' ? { background: 'var(--danger)', borderColor: 'var(--danger)' } : undefined} onClick={doConfirm}>
              {confirm?.type === 'delete' ? 'Hapus permanen' : 'Arsipkan'}
            </button>
          </>
        }
      >
        {confirm?.type === 'delete' ? (
          <p><b>{confirm.item.name}</b> akan dihapus selamanya. Ini hanya bisa dilakukan untuk barang yang belum pernah dipakai di transaksi apa pun.</p>
        ) : (
          <>
            <p><b>{confirm?.item.name}</b> disembunyikan dari inventaris, form event, transfer & opname. <b>Riwayatnya tetap tersimpan</b>, dan bisa dipulihkan kapan saja dari tab Arsip.</p>
            {confirm?.item.total_quantity > 0 && (
              <p className="muted" style={{ marginTop: 10, fontSize: 13 }}>Catatan: barang ini masih punya stok {fmt(confirm.item.total_quantity)} {confirm.item.unit}.</p>
            )}
          </>
        )}
      </Modal>
    </>
  )
}
