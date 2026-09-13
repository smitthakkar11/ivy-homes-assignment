import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useData } from './DataContext.jsx'
import { formatInr, formatIst, titleCase } from './data.js'

export const PAGE_SIZE = 20

export function Pager({ page, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  return (
    <div className="pager">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)}>← Prev</button>
      <span>Page {page} of {pages} · {total.toLocaleString('en-IN')} results</span>
      <button disabled={page >= pages} onClick={() => onPage(page + 1)}>Next →</button>
    </div>
  )
}

export function SaveButton({ id }) {
  const { savedIds, toggleSaved } = useData()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const saved = savedIds.has(id)
  const click = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await toggleSaved(id)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <button className={saved ? 'save saved' : 'save'} disabled={busy} onClick={click}>
        {saved ? '★ Saved' : '☆ Save'}
      </button>
      {error && <span className="error small">{error}</span>}
    </>
  )
}

export function Flags({ listing }) {
  return (
    <span className="flags">
      {listing.fake && <span className="tag bad">Suspected fake</span>}
      {listing.corrupt.length > 0 && <span className="tag bad">Impossible data</span>}
      {listing.duplicateOf && <span className="tag warn">Duplicate</span>}
      {!listing.is_live && <span className="tag">Inactive</span>}
      {listing.is_verified && !listing.fake && <span className="tag ok">Verified</span>}
    </span>
  )
}

export const listingTitle = (l) =>
  `${l.bedroom > 0 ? `${l.bedroom} BHK ` : ''}${titleCase(l.property_type)} in ${l.apartment_name}`

export function ListingRow({ listing: l }) {
  const isPlot = l.property_type === 'plot'
  return (
    <Link to={`/listings/${l.listing_id}`} className="card">
      <div className="card-main">
        <div className="card-title">{listingTitle(l)}</div>
        <div className="card-sub">{titleCase(l.locality)} · posted {formatIst(l.postedAtIst)}</div>
        <div className="specs">
          <span className="spec">{l.carpetSqft.toLocaleString('en-IN')} sq ft</span>
          {!isPlot && <span className="spec">{l.bathroom} bath</span>}
          {!isPlot && <span className="spec">Floor {l.floor}/{l.total_floors}</span>}
          <span className="spec">{titleCase(l.furnishing)}</span>
          <span className="spec">{titleCase(l.facing_direction)} facing</span>
        </div>
        <Flags listing={l} />
      </div>
      <div className="card-side">
        <div>
          <div className="price">{formatInr(l.price)}</div>
          {l.price > 0 && (
            <div className="muted small" style={{ textAlign: 'right' }}>
              ₹{Math.round(l.price / l.carpetSqft).toLocaleString('en-IN')}/sq ft
            </div>
          )}
        </div>
        <SaveButton id={l.listing_id} />
      </div>
    </Link>
  )
}

export function Select({ label, value, onChange, options }) {
  return (
    <label>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Any</option>
        {options.map((o) => (
          <option key={o} value={o}>{titleCase(String(o))}</option>
        ))}
      </select>
    </label>
  )
}

export function Loading({ children }) {
  return <div className="loading"><span className="spinner" />{children}</div>
}
