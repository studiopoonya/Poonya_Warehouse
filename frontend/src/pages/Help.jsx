import { Link } from 'react-router-dom'
import { Rocket, CalendarCheck, ClipboardCheck, Package, ArrowLeftRight, Users, DatabaseBackup, Bell } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Accordion from '../components/ui/Accordion'

const Steps = ({ children }) => <ol className="help-steps">{children}</ol>

const SECTIONS = [
  {
    id: 'start', icon: Rocket, title: 'Mulai pakai',
    lead: 'Masukkan barang, hitung stok, lalu undang tim.',
    content: (
      <Steps>
        <li>Buka <Link to="/inventory">Inventaris</Link> → <b>Import</b>. Unduh template, isi daftar barang (atau tempel dari Excel / sistem lama), cek pratinjau, lalu import.</li>
        <li>Buka <Link to="/opname">Stock Opname</Link>, hitung fisik barang di tiap venue. Stok di sistem langsung disamakan.</li>
        <li>Buat akun staff di <Link to="/users">Pengguna</Link>. Staff hanya bisa mengisi logistik event.</li>
        <li>Isi alamat venue di <Link to="/settings">Pengaturan</Link>.</li>
      </Steps>
    ),
  },
  {
    id: 'event', icon: CalendarCheck, title: 'Logistik event',
    lead: 'Barang dibawa ke event → dipakai → sisa dikembalikan.',
    content: (
      <Steps>
        <li><b>Owner</b> menjadwalkan event (<b>Jadwalkan event</b>) dan memilih penanggung jawab. Event itu hanya muncul di akun staff tersebut. Pilih <b>Belum ditugaskan</b> supaya semua staff bisa melihat & staff pertama yang menekan <b>Ambil event ini</b> yang bertugas.</li>
        <li><b>Staff</b> memilih event-nya, lalu mengisi dua bagian: <b>Peralatan booth</b> (sudah tercentang sesuai daftar standar Booth 1, tinggal tandai <b>Dicek</b> per alat) dan <b>Barang habis pakai</b> (paper, frame, keychain, dst.). Lalu <b>Berangkat</b>. Booking mendadak yang belum dijadwalkan bisa dicatat staff lewat <b>Event mendadak</b>.</li>
        <li><b>Barang habis pakai</b> langsung mengurangi stok gudang. <b>Peralatan</b> tidak mengurangi stok, tapi tidak bisa dibawa ke dua event sekaligus.</li>
        <li>Pulang dari event, staff mengisi <b>barang tersisa</b> (terpakai = dibawa − tersisa, sisa kembali ke stok) dan mengecek peralatan: default semua kembali utuh. Kalau ada alat <b>rusak</b>, alat tetap kembali tapi kondisinya ditandai Rusak. Alat yang <b>hilang</b> mengurangi stok.</li>
        <li><b>Owner</b> melihat laporan semua event, nilai barang terpakai, bisa koreksi laporan atau membatalkan event yang masih berjalan.</li>
        <li>Event yang lebih dari 1 hari belum lapor sisa, event yang tanggalnya lewat tapi belum dicatat barangnya, dan event 2 hari ke depan yang belum ada penanggung jawab muncul di lonceng notifikasi.</li>
        <li>Setiap event selesai, owner menerima <b>email ringkasan</b> (atur di Pengaturan → Notifikasi email).</li>
        <li>Laporan per bulan: <Link to="/events">Logistik Event</Link> → pilih bulan → <b>Export Excel</b>.</li>
      </Steps>
    ),
  },
  {
    id: 'opname', icon: ClipboardCheck, title: 'Stock opname',
    lead: 'Samakan stok sistem dengan hitungan fisik.',
    content: (
      <Steps>
        <li>Pilih venue, isi <b>hitungan fisik</b> per barang. Selisih terlihat langsung (merah = kurang, hijau = lebih).</li>
        <li>Barang yang tidak diisi tidak diubah, jadi opname bisa sebagian (mis. hanya kategori Kertas).</li>
        <li>Isian tersimpan otomatis di browser — aman kalau menghitungnya lama.</li>
        <li><b>Selesaikan opname</b> → stok disesuaikan, tercatat sebagai laporan yang bisa di-export ke Excel, dan ringkasannya dikirim lewat email.</li>
      </Steps>
    ),
  },
  {
    id: 'stock', icon: Package, title: 'Barang, kategori & arsip',
    content: (
      <Steps>
        <li>Setiap barang punya <b>jenis</b>: <b>Habis pakai</b> (stok berkurang saat dipakai) atau <b>Peralatan</b> (kamera, printer, lighting, dll. yang dibawa pulang lagi). Peralatan bisa diberi <b>jumlah standar dibawa</b>, yang otomatis tercentang di form staff.</li>
        <li><b>Kondisi alat</b> (Baik / Rusak / Servis) diatur per venue di halaman venue. Alat yang rusak atau sedang diservis muncul di lonceng notifikasi.</li>
        <li>SKU boleh dikosongkan — dibuat otomatis dari nama barang.</li>
        <li>Isi <b>harga satuan</b> supaya nilai stok & nilai barang terpakai di event ikut terhitung.</li>
        <li>Barang yang sudah tidak dipakai: <b>Arsipkan</b> (bukan hapus). Riwayatnya tetap aman dan bisa dipulihkan dari tab Arsip.</li>
        <li>Kategori dikelola lewat tombol <b>Kelola kategori</b> di Inventaris atau di Pengaturan.</li>
      </Steps>
    ),
  },
  {
    id: 'transfer', icon: ArrowLeftRight, title: 'Transfer & catat stok',
    content: (
      <Steps>
        <li><b>Transfer</b>: pindahkan barang antar venue, mis. restock dari Warehouse ke Poonya Box SAT.</li>
        <li><b>Catat stok</b>: barang masuk (pembelian), keluar (rusak/hilang), atau penyesuaian satu barang.</li>
        <li>Semua perubahan stok tercatat di <Link to="/movements">Riwayat Stok</Link> lengkap dengan siapa yang melakukannya.</li>
      </Steps>
    ),
  },
  {
    id: 'users', icon: Users, title: 'Akun & peran',
    content: (
      <Steps>
        <li><b>Owner</b>: akses penuh. <b>Staff</b>: hanya logistik event miliknya.</li>
        <li>Staff yang berhenti kerja sebaiknya <b>dinonaktifkan</b>, bukan dihapus, supaya riwayatnya tetap tercatat.</li>
        <li>Lupa password staff: owner reset lewat <Link to="/users">Pengguna</Link> → edit → isi password baru.</li>
      </Steps>
    ),
  },
  {
    id: 'backup', icon: DatabaseBackup, title: 'Backup data',
    content: (
      <Steps>
        <li>Backup otomatis berjalan setiap hari jam 02.00 (14 backup terakhir disimpan).</li>
        <li>Backup manual & unduh file backup ada di <Link to="/settings">Pengaturan</Link>. Simpan salinannya di tempat lain.</li>
      </Steps>
    ),
  },
  {
    id: 'notif', icon: Bell, title: 'Notifikasi',
    content: (
      <p>Lonceng di kanan atas menampilkan hal yang perlu ditindaklanjuti: event belum lapor sisa, stok habis / menipis, venue yang lebih dari 30 hari belum di-opname, dan backup yang terlambat.</p>
    ),
  },
]

export default function Help() {
  return (
    <>
      <PageHeader title="Bantuan" sub={['Panduan singkat memakai Poonya Warehouse']} />
      <div style={{ maxWidth: 820 }}>
        <Accordion items={SECTIONS} defaultOpen="start" />
      </div>
    </>
  )
}
