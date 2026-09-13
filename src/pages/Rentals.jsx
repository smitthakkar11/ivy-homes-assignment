import { useMemo, useState } from 'react'
import { useData } from '../DataContext.jsx'
import { PAGE_SIZE, Pager, Select } from '../components.jsx'
import { formatInr, formatIst, titleCase } from '../data.js'

export default function Rentals() {
  const { rentals } = useData()
  const [f, setF] = useState({ locality: '', bhk: '', furnishing: '', inactive: false, page: 1 })
  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v, page: k === 'page' ? v : 1 }))

  const localities = useMemo(() => [...new Set(rentals.map((r) => r.locality))].sort(), [rentals])
  const filtered = useMemo(
    () =>
      rentals
        .filter((r) => f.inactive || r.is_live)
        .filter((r) => !f.locality || r.locality === f.locality)
        .filter((r) => !f.bhk || r.bedroom === Number(f.bhk))
        .filter((r) => !f.furnishing || r.furnishing === f.furnishing)
        .sort((a, b) => b.posted_at.localeCompare(a.posted_at)),
    [rentals, f.inactive, f.locality, f.bhk, f.furnishing],
  )
  const rows = filtered.slice((f.page - 1) * PAGE_SIZE, f.page * PAGE_SIZE)

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Homes for rent</h2>
          <p className="muted">Monthly rent, deposit and maintenance in rupees.</p>
        </div>
      </div>
      <div className="panel">
        <div className="filters">
          <Select label="Locality" value={f.locality} onChange={(v) => set('locality', v)} options={localities} />
          <Select label="Bedrooms" value={f.bhk} onChange={(v) => set('bhk', v)} options={[1, 2, 3, 4]} />
          <Select label="Furnishing" value={f.furnishing} onChange={(v) => set('furnishing', v)}
            options={['unfurnished', 'semi-furnished', 'fully-furnished']} />
        </div>
        <div className="toggles">
          <label><input type="checkbox" checked={f.inactive} onChange={(e) => set('inactive', e.target.checked)} /> Include inactive</label>
        </div>
      </div>
      <Pager page={f.page} total={filtered.length} onPage={(p) => set('page', p)} />
      <div className="list">
        {rows.map((r) => (
          <div key={r.listing_id} className="card">
            <div className="card-main">
              {/* the API's `title` names a random locality; build the heading from the fields instead */}
              <div className="card-title">{r.bedroom} BHK {titleCase(r.property_type)} in {r.apartment_name}</div>
              <div className="card-sub">{titleCase(r.locality)} · posted {formatIst(r.postedAtIst)}</div>
              <div className="specs">
                <span className="spec">{r.carpet_area.toLocaleString('en-IN')} sq ft carpet</span>
                <span className="spec">{r.super_builtup_area.toLocaleString('en-IN')} sq ft super built-up</span>
                <span className="spec">{r.bathroom} bath</span>
                <span className="spec">Floor {r.floor}/{r.total_floors}</span>
                <span className="spec">{titleCase(r.furnishing)}</span>
              </div>
              <div className="muted small">
                {r.posted_by_name} ({r.posted_by}) · {r.posted_by_contact} ·{' '}
                <a href={r.listing_url} target="_blank" rel="noreferrer">{r.website}</a>
              </div>
              {!r.is_live && <span className="flags"><span className="tag">Inactive</span></span>}
            </div>
            <div className="card-side">
              <div style={{ textAlign: 'right' }}>
                <div className="price">{formatInr(r.price)}<span className="muted small"> /month</span></div>
                <div className="muted small">Deposit {formatInr(r.depositInr)} ({r.depositMonths} months)</div>
                <div className="muted small">Maintenance {formatInr(r.maintenance)}/month</div>
              </div>
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="empty">No rentals match these filters.</div>}
      </div>
    </>
  )
}
