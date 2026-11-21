import { useEffect, useState } from 'react'

export const MOBILE_QUERY = '(max-width: 860px)'

/** true/false sesuai media query, ikut berubah saat layar di-resize / HP diputar */
export function useMediaQuery(query) {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false)
  const [matches, setMatches] = useState(get)

  useEffect(() => {
    if (!window.matchMedia) return
    const mql = window.matchMedia(query)
    const onChange = (e) => setMatches(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

export const useIsMobile = () => useMediaQuery(MOBILE_QUERY)
