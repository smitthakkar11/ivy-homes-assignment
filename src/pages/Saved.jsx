import { useEffect, useState } from 'react'
import { useData } from '../DataContext.jsx'
import { ListingRow, Loading } from '../components.jsx'
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
  if (!serverIds) return <Loading>Loading saved listings…</Loading>

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Saved listings</h2>
          <p className="muted">{serverIds.length} saved to your account.</p>
        </div>
      </div>
      <div className="list">
        {serverIds.map((id) => byId.has(id) && <ListingRow key={id} listing={byId.get(id)} />)}
        {serverIds.length === 0 && <div className="empty">Nothing saved yet. Use ☆ Save on any listing.</div>}
      </div>
    </>
  )
}
