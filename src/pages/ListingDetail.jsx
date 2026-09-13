import { Link, useParams } from 'react-router-dom'
import { useData } from '../DataContext.jsx'
import { Flags, SaveButton } from '../components.jsx'
import { formatInr, formatIst, titleCase } from '../data.js'

export default function ListingDetail() {
  const { id } = useParams()
  const { byId, projects } = useData()
  const l = byId.get(id)
  if (!l) return <p>No listing with id <code>{id}</code> in Pune. <Link to="/listings">Back to listings</Link></p>

  const project = l.project_id && projects.find((p) => p.project_id === l.project_id)
  const rows = [
    ['Price', formatInr(l.price)],
    ['Price per sq ft', l.price > 0 ? `₹${Math.round(l.price / l.carpetSqft).toLocaleString('en-IN')}` : '—'],
    ['Carpet area', `${l.carpetSqft.toLocaleString('en-IN')} sq ft${l.areaWasSqm ? ` (sent as ${l.carpet_area} sq m)` : ''}`],
    ['Super built-up area', `${l.superBuiltUpSqft.toLocaleString('en-IN')} sq ft`],
    ['Type', titleCase(l.property_type)],
    ['Bedrooms / bathrooms / balconies', `${l.bedroom} / ${l.bathroom} / ${l.balcony}`],
    ['Floor', l.property_type === 'plot' ? '—' : `${l.floor} of ${l.total_floors}`],
    ['Furnishing', titleCase(l.furnishing)],
    ['Facing', titleCase(l.facing_direction)],
    ['Covered parking', l.covered_parking],
    ['Locality', titleCase(l.locality)],
    ['Coordinates', `${l.lat}, ${l.lng}`],
    ['Posted', formatIst(l.postedAtIst)],
    ['Posted by', `${l.posted_by_name} (${l.posted_by})`],
    ['Contact', l.posted_by_contact],
    ['Source', <a href={l.listing_url} target="_blank" rel="noreferrer">{l.website}</a>],
    ['Project', project ? `${project.apartment_name} (${project.project_id})` : l.project_id ?? 'Resale, no project'],
    ['Listing id', l.listing_id],
  ]

  return (
    <article className="detail">
      <Link to="/listings" className="muted">← Listings</Link>
      <div className="detail-head">
        <h2>{l.bedroom > 0 ? `${l.bedroom} BHK ` : ''}{titleCase(l.property_type)} in {l.apartment_name}</h2>
        <SaveButton id={l.listing_id} />
      </div>
      <Flags listing={l} />

      {l.fake && (
        <div className="notice bad">
          This listing is posted from {l.posted_by_contact}, a number that posts under several different agent names,
          with every listing priced far below the market. Treat it as a lead-generation fake.
        </div>
      )}
      {l.corrupt.length > 0 && (
        <div className="notice bad">This record cannot be right: {l.corrupt.join('; ')}.</div>
      )}
      {l.duplicates.length > 0 && (
        <div className="notice warn">
          The same property is also listed as{' '}
          {l.duplicates.map((d, i) => (
            <span key={d}>{i > 0 && ', '}<Link to={`/listings/${d}`}>{d}</Link></span>
          ))}.
        </div>
      )}

      <table className="kv">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}><th>{k}</th><td>{v}</td></tr>
          ))}
        </tbody>
      </table>
      <h3>Seller’s description</h3>
      {/* seller-written text: rendered as plain text, never interpreted */}
      <p className="description">{l.description}</p>
    </article>
  )
}
