import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Venues } from '../api/endpoints'
import { useAuth } from './AuthContext'

const VenueContext = createContext(null)

/**
 * venues   : semua venue (staff tetap butuh untuk memilih tujuan transfer)
 * myVenues : venue yang boleh dikelola user (owner: semua, staff: venue miliknya)
 * activeId : filter global. Staff selalu terkunci ke venue miliknya.
 */
export function VenueProvider({ children }) {
  const { user, isOwner } = useAuth()
  const [venues, setVenues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pickedId, setPickedId] = useState(() => {
    try { return JSON.parse(localStorage.getItem('activeVenue')) ?? null } catch { return null }
  })

  const refresh = useCallback(async () => {
    // data venue & stok khusus owner; staff hanya mengurus logistik event
    if (!isOwner) { setVenues([]); setLoading(false); return }
    try {
      setVenues(await Venues.list())
      setError(null)
    } catch {
      setError('api')
    } finally {
      setLoading(false)
    }
  }, [isOwner])

  useEffect(() => { refresh() }, [refresh])

  const select = (id) => {
    if (!isOwner) return
    setPickedId(id)
    try { localStorage.setItem('activeVenue', JSON.stringify(id)) } catch { /* abaikan */ }
  }

  const lockedId = isOwner ? null : user?.venue?.id ?? null
  const activeIdRaw = lockedId ?? pickedId
  const active = venues.find((v) => v.id === activeIdRaw) || null
  const myVenues = isOwner ? venues : venues.filter((v) => v.id === lockedId)

  return (
    <VenueContext.Provider
      value={{
        venues,
        myVenues,
        active,
        activeId: lockedId ?? active?.id ?? null,
        locked: !isOwner,
        select,
        refresh,
        loading,
        error,
      }}
    >
      {children}
    </VenueContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useVenues = () => useContext(VenueContext)
