import { useEffect, useState } from 'react'
import { useData } from '../DataContext.jsx'
import { ListingRow } from '../components.jsx'
import * as api from '../api.js'

export default function Saved() {
  const { byId, savedIds } = useData()
  const [serverIds, setServerIds] = useState(null)
  const [error, setError] = useState(null)

  // re-read from the server so the page reflects what is stored for this user
  useEffect(() => {
    api.getSaved()
      .then((res) => setServerIds(res.results.map((l) => l.listing_id)))
      .catch((err) => setError(err.message))
  }, [savedIds])

  if (error) return <p className="error">{error}</p>
  if (!serverIds) return <p className="muted">Loading saved listings…</p>

  return (
    <>
      <h2>Saved listings ({serverIds.length})</h2>
      <div className="list">
        {serverIds.map((id) => byId.has(id) && <ListingRow key={id} listing={byId.get(id)} />)}
        {serverIds.length === 0 && <p className="muted">Nothing saved yet. Use ☆ Save on any listing.</p>}
      </div>
    </>
  )
}
