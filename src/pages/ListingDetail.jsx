import { Link, useParams } from 'react-router-dom'
import { useData } from '../DataContext.jsx'
import { Flags, SaveButton, listingTitle } from '../components.jsx'
import { formatInr, formatIst, titleCase } from '../data.js'

export default function ListingDetail() {
  const { id } = useParams()
  const { byId, projects } = useData()
  const l = byId.get(id)
  if (!l) {
    return (
      <div className="empty">
        No listing with id <code>{id}</code> in Pune. <Link to="/listings">Back to listings</Link>
      </div>
    )
  }

  const isPlot = l.property_type === 'plot'
  const project = l.project_id && projects.find((p) => p.project_id === l.project_id)
  const property = [
    ['Carpet area', `${l.carpetSqft.toLocaleString('en-IN')} sq ft${l.areaWasSqm ? ` (sent as ${l.carpet_area} sq m)` : ''}`],
    ['Super built-up area', `${l.superBuiltUpSqft.toLocaleString('en-IN')} sq ft`],
    ['Type', titleCase(l.property_type)],
    ['Bedrooms / bathrooms / balconies', `${l.bedroom} / ${l.bathroom} / ${l.balcony}`],
    ['Floor', isPlot ? '—' : `${l.floor} of ${l.total_floors}`],
    ['Furnishing', titleCase(l.furnishing)],
    ['Facing', titleCase(l.facing_direction)],
    ['Covered parking', l.covered_parking],
    ['Project', project ? `${project.apartment_name} by ${project.developer_name}` : l.project_id ?? 'Resale, no project'],
    ['Coordinates', `${l.lat}, ${l.lng}`],
  ]
  const seller = [
    ['Posted by', `${l.posted_by_name} (${l.posted_by})`],
    ['Contact', l.posted_by_contact],
    ['Posted', formatIst(l.postedAtIst)],
    ['Source', <a key="src" href={l.listing_url} target="_blank" rel="noreferrer">{l.website}</a>],
    ['Listing id', l.listing_id],
  ]

  return (
    <article>
      <Link to="/listings" className="back">← All listings</Link>
      <div className="detail-head">
        <div>
          <h2>{listingTitle(l)}</h2>
          <p className="muted" style={{ margin: '6px 0 10px' }}>{titleCase(l.locality)}, Pune</p>
          <Flags listing={l} />
        </div>
        <div className="card-side">
          <div className="price">{formatInr(l.price)}</div>
          {l.price > 0 && (
            <div className="muted small">₹{Math.round(l.price / l.carpetSqft).toLocaleString('en-IN')}/sq ft carpet</div>
          )}
          <SaveButton id={l.listing_id} />
        </div>
      </div>

      {l.fake && (
        <div className="notice bad">
          This listing is posted from {l.posted_by_contact}, a number that posts under several different agent names,
          with every listing priced far below the market. Treat it as a lead-generation fake.
        </div>
      )}
      {l.corrupt.length > 0 && <div className="notice bad">This record cannot be right: {l.corrupt.join('; ')}.</div>}
      {l.duplicates.length > 0 && (
        <div className="notice warn">
          The same property is also listed as{' '}
          {l.duplicates.map((d, i) => (
            <span key={d}>{i > 0 && ', '}<Link to={`/listings/${d}`}>{d}</Link></span>
          ))}.
        </div>
      )}

      <div className="detail-grid">
        <section className="panel">
          <h3>Property</h3>
          <Facts rows={property} />
        </section>
        <div>
          <section className="panel">
            <h3>Seller</h3>
            <Facts rows={seller} />
          </section>
          <section className="panel">
            <h3>Seller’s description</h3>
            {/* seller-written text: rendered as plain text, never interpreted */}
            <p className="description">{l.description}</p>
          </section>
        </div>
      </div>
    </article>
  )
}

function Facts({ rows }) {
  return (
    <table className="kv">
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k}><th>{k}</th><td>{v}</td></tr>
        ))}
      </tbody>
    </table>
  )
}
