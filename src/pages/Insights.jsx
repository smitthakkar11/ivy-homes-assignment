import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../DataContext.jsx'
import { formatInr, median, titleCase } from '../data.js'

export default function Insights() {
  const { listings, uniqueProperties, fakeContacts, rentals, projects } = useData()

  const s = useMemo(() => {
    const live = listings.filter((l) => l.is_live)
    const fake = listings.filter((l) => l.fake)
    const corrupt = listings.filter((l) => l.corrupt.length)
    const dupes = listings.filter((l) => l.duplicateOf)
    // the market figures use one record per real, live, sane property
    const clean = live.filter((l) => !l.fake && !l.corrupt.length && !l.duplicateOf)
    const group = (key) => {
      const m = new Map()
      for (const l of clean) {
        if (!m.has(l[key])) m.set(l[key], [])
        m.get(l[key]).push(l)
      }
      return [...m.entries()]
    }
    const fakeMedianPps = median(fake.map((l) => l.price / l.carpetSqft))
    const cleanMedianPps = median(clean.map((l) => l.price / l.carpetSqft))
    return {
      live, fake, corrupt, dupes, clean,
      medianPrice: median(clean.map((l) => l.price)),
      medianPps: cleanMedianPps,
      fakeDiscount: 1 - fakeMedianPps / cleanMedianPps,
      byLocality: group('locality')
        .map(([k, ls]) => ({ k, count: ls.length, medianPrice: median(ls.map((l) => l.price)), medianPps: median(ls.map((l) => l.price / l.carpetSqft)) }))
        .sort((a, b) => b.medianPps - a.medianPps),
      byBhk: group('bedroom').map(([k, ls]) => ({ k, count: ls.length, medianPrice: median(ls.map((l) => l.price)) })).sort((a, b) => a.k - b.k),
      sqmCount: listings.filter((l) => l.areaWasSqm).length,
      depositMonths: rentals.filter((r) => r.deposit < 100).length,
      wrongProjects: projects.filter((p) => p.listingCountWrong).length,
    }
  }, [listings, rentals, projects])

  const pps = (v) => `₹${Math.round(v).toLocaleString('en-IN')}/sq ft`

  return (
    <>
      <h2>Market insights · Pune</h2>
      <p className="muted">
        Figures below count each real property once: live listings only, with duplicates, suspected fakes and
        impossible records removed ({s.clean.length.toLocaleString('en-IN')} properties).
      </p>
      <div className="stats">
        <Stat label="Live properties for sale" value={s.clean.length.toLocaleString('en-IN')} />
        <Stat label="Median asking price" value={formatInr(s.medianPrice)} />
        <Stat label="Median price per sq ft (carpet)" value={pps(s.medianPps)} />
      </div>

      <div className="two-col">
        <section>
          <h3>By locality</h3>
          <table className="grid">
            <thead><tr><th>Locality</th><th>Listings</th><th>Median price</th><th>Median ₹/sq ft</th></tr></thead>
            <tbody>
              {s.byLocality.map((r) => (
                <tr key={r.k}>
                  <td><Link to={`/listings?locality=${encodeURIComponent(r.k)}`}>{titleCase(r.k)}</Link></td>
                  <td>{r.count}</td><td>{formatInr(r.medianPrice)}</td><td>{pps(r.medianPps)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section>
          <h3>By bedrooms</h3>
          <table className="grid">
            <thead><tr><th>Bedrooms</th><th>Listings</th><th>Median price</th></tr></thead>
            <tbody>
              {s.byBhk.map((r) => (
                <tr key={r.k}><td>{r.k === 0 ? 'Plot' : `${r.k} BHK`}</td><td>{r.count}</td><td>{formatInr(r.medianPrice)}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <h3>What we found in the data</h3>
      <ul className="findings">
        <li>
          <strong>{listings.length.toLocaleString('en-IN')} listing records describe only {uniqueProperties.toLocaleString('en-IN')} properties.</strong>{' '}
          {s.dupes.length} records are the same flat re-posted, usually on another portal, under a slightly different building name.
        </li>
        <li>
          <strong>{s.fake.length} listings look fake.</strong> They come from {fakeContacts.length} phone numbers
          ({fakeContacts.join(', ')}) that each post under several agent names. All are marked verified, and they are priced
          about {Math.round(s.fakeDiscount * 100)}% below the market. Some copy real listings at half the price.
        </li>
        <li>
          <strong>{s.corrupt.length} listings describe something that cannot exist</strong>: negative prices, floors above the top floor,
          carpet area bigger than the whole unit, flats with no bedrooms or bathrooms, dates in the future, swapped coordinates.
        </li>
        <li>
          <strong>{(listings.length - s.live.length).toLocaleString('en-IN')} records are no longer live</strong> even though the
          listings feed is documented to return active listings only.
        </li>
        <li>
          <strong>{s.sqmCount} magichomes listings give area in square metres</strong> (everything they posted from 1 June 2026). Taken at face value those
          flats look ten times smaller and ten times pricier per square foot. Areas here are converted.
        </li>
        <li>
          <strong>{s.depositMonths} rentals give the deposit as a number of months</strong> (all zerobroker rentals), not rupees. Deposits here are converted.
        </li>
        <li>
          <strong>Project prices are sent in lakhs or crores</strong>, not rupees, and <strong>{s.wrongProjects} of {projects.length} projects
          report the wrong number of listings</strong>.
        </li>
      </ul>
    </>
  )
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="muted small">{label}</div>
    </div>
  )
}
