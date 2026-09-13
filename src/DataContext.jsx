import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as api from './api.js'
import { buildListings, liveCountByProject, normalizeProject, normalizeRental } from './data.js'

const DataContext = createContext(null)
export const useData = () => useContext(DataContext)

export function DataProvider({ children }) {
  const [state, setState] = useState({ status: 'loading' })
  const [savedIds, setSavedIds] = useState(new Set())

  useEffect(() => {
    let cancelled = false
    Promise.all([api.fetchAll('/v1/listings'), api.fetchAll('/v1/rentals'), api.fetchAll('/v1/projects'), api.getSaved()])
      .then(([rawListings, rawRentals, rawProjects, saved]) => {
        if (cancelled) return
        const { listings, uniqueProperties, fakeContacts } = buildListings(rawListings)
        const counts = liveCountByProject(listings)
        setState({
          status: 'ready',
          listings,
          byId: new Map(listings.map((l) => [l.listing_id, l])),
          uniqueProperties,
          fakeContacts,
          rentals: rawRentals.map(normalizeRental),
          projects: rawProjects.map((p) => normalizeProject(p, counts)),
        })
        setSavedIds(new Set(saved.results.map((l) => l.listing_id)))
      })
      .catch((err) => !cancelled && setState({ status: 'error', error: err.message }))
    return () => {
      cancelled = true
    }
  }, [])

  const toggleSaved = useCallback(async (id) => {
    const isSaved = savedIds.has(id)
    const res = isSaved ? await api.unsaveListing(id) : await api.saveListing(id)
    setSavedIds((prev) => {
      const next = new Set(prev)
      if (isSaved) next.delete(res.listing_id)
      else next.add(res.listing_id)
      return next
    })
  }, [savedIds])

  const value = useMemo(() => ({ ...state, savedIds, toggleSaved }), [state, savedIds, toggleSaved])
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
