import { lazy, Suspense } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import RequireAuth from './components/auth/RequireAuth'
import { AuthProvider, useAuth } from './context/AuthContext'
import { VenueProvider } from './context/VenueContext'
import { ToastProvider } from './context/ToastContext'
import Login from './pages/Login'
import { EmptyState, Skeleton } from './components/ui/Feedback'

// Tiap halaman dimuat saat dibuka (code splitting), supaya HP staff tidak perlu mengunduh
// halaman-halaman owner. Login dimuat langsung karena halaman pertama.
const Layout = lazy(() => import('./components/layout/Layout'))
const StaffLayout = lazy(() => import('./components/layout/StaffLayout'))
const UsersPage = lazy(() => import('./pages/UsersPage'))
const Events = lazy(() => import('./pages/Events'))
const EventNew = lazy(() => import('./pages/EventNew'))
const EventDetail = lazy(() => import('./pages/EventDetail'))
const Opnames = lazy(() => import('./pages/Opnames'))
const OpnameNew = lazy(() => import('./pages/OpnameNew'))
const OpnameDetail = lazy(() => import('./pages/OpnameDetail'))
const Settings = lazy(() => import('./pages/Settings'))
const Help = lazy(() => import('./pages/Help'))
const Overview = lazy(() => import('./pages/Overview'))
const Inventory = lazy(() => import('./pages/Inventory'))
const Transfers = lazy(() => import('./pages/Transfers'))
const Movements = lazy(() => import('./pages/Movements'))
const Venues = lazy(() => import('./pages/Venues'))
const VenueDetail = lazy(() => import('./pages/VenueDetail'))
const ForgotPassword = lazy(() => import('./pages/PasswordPages').then((m) => ({ default: m.ForgotPassword })))
const ResetPassword = lazy(() => import('./pages/PasswordPages').then((m) => ({ default: m.ResetPassword })))

/** Tampilan sementara saat halaman sedang diunduh (sidebar/menu tetap tampil) */
function PageLoading() {
  return <div className="stack"><Skeleton height={56} width={300} /><Skeleton height={110} /><Skeleton height={280} /></div>
}

/** Bungkus halaman lazy: loading-nya hanya di area konten */
const page = (el) => <Suspense fallback={<PageLoading />}>{el}</Suspense>

function NotFound() {
  return <EmptyState title="Halaman tidak ditemukan" action={<Link to="/" className="btn">Kembali ke awal</Link>} />
}

/**
 * Area yang wajib login.
 * Owner -> dashboard lengkap dengan sidebar. Staff -> tampilan form logistik event saja.
 */
function Protected() {
  const { isOwner } = useAuth()
  return (
    <RequireAuth>
      <VenueProvider>
        <Suspense fallback={<div className="app-loading"><Skeleton height={40} width={160} /></div>}>
          {isOwner ? <Layout /> : <StaffLayout />}
        </Suspense>
      </VenueProvider>
    </RequireAuth>
  )
}

/** Halaman manajemen: khusus owner. Staff dikembalikan ke form logistik event. */
function OwnerOnly({ children }) {
  const { isOwner } = useAuth()
  return isOwner ? page(children) : <Navigate to="/events" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={page(<ForgotPassword />)} />
            <Route path="/reset-password" element={page(<ResetPassword />)} />
            <Route element={<Protected />}>
              {/* Owner & staff */}
              <Route path="events" element={page(<Events />)} />
              <Route path="events/new" element={page(<EventNew />)} />
              <Route path="events/:id" element={page(<EventDetail />)} />

              {/* Owner saja */}
              <Route index element={<OwnerOnly><Overview /></OwnerOnly>} />
              <Route path="inventory" element={<OwnerOnly><Inventory /></OwnerOnly>} />
              <Route path="transfers" element={<OwnerOnly><Transfers /></OwnerOnly>} />
              <Route path="movements" element={<OwnerOnly><Movements /></OwnerOnly>} />
              <Route path="venues" element={<OwnerOnly><Venues /></OwnerOnly>} />
              <Route path="venues/:id" element={<OwnerOnly><VenueDetail /></OwnerOnly>} />
              <Route path="users" element={<OwnerOnly><UsersPage /></OwnerOnly>} />
              <Route path="opname" element={<OwnerOnly><Opnames /></OwnerOnly>} />
              <Route path="opname/new" element={<OwnerOnly><OpnameNew /></OwnerOnly>} />
              <Route path="opname/:id" element={<OwnerOnly><OpnameDetail /></OwnerOnly>} />
              <Route path="settings" element={<OwnerOnly><Settings /></OwnerOnly>} />
              <Route path="help" element={<OwnerOnly><Help /></OwnerOnly>} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
