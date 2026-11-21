import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from '../api/client'

/**
 * const { data, loading, error, reload } = useFetch(() => Items.list({ search }), [search])
 */
export function useFetch(fetcher, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const reqId = useRef(0)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fetcher, deps)

  const reload = useCallback(async () => {
    const id = ++reqId.current
    setLoading(true)
    try {
      const res = await run()
      if (id === reqId.current) { setData(res); setError(null) }
    } catch (e) {
      if (id === reqId.current) setError(errorMessage(e))
    } finally {
      if (id === reqId.current) setLoading(false)
    }
  }, [run])

  useEffect(() => { reload() }, [reload])

  return { data, loading, error, reload, setData }
}
