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
      <h2>Homes for rent</h2>
      <div className="filters">
        <Select label="Locality" value={f.locality} onChange={(v) => set('locality', v)} options={localities} />
        <Select label="Bedrooms" value={f.bhk} onChange={(v) => set('bhk', v)} options={[1, 2, 3, 4]} />
        <Select label="Furnishing" value={f.furnishing} onChange={(v) => set('furnishing', v)}
          options={['unfurnished', 'semi-furnished', 'fully-furnished']} />
      </div>
      <div className="toggles">
        <label><input type="checkbox" checked={f.inactive} onChange={(e) => set('inactive', e.target.checked)} /> Include inactive</label>
      </div>
      <Pager page={f.page} total={filtered.length} onPage={(p) => set('page', p)} />
      <div className="list">
        {rows.map((r) => (
          <div key={r.listing_id} className="card">
            <div className="card-main">
              {/* the API's `title` names a random locality; build the heading from the fields instead */}
              <div className="card-title">{r.bedroom} BHK {titleCase(r.property_type)} · {r.apartment_name}</div>
              <div className="muted">
                {titleCase(r.locality)} · {r.carpet_area.toLocaleString('en-IN')} sq ft carpet
                ({r.super_builtup_area.toLocaleString('en-IN')} super built-up) · {titleCase(r.furnishing)} ·
                floor {r.floor} of {r.total_floors} · posted {formatIst(r.postedAtIst)}
              </div>
              <div className="muted small">
                {r.posted_by_name} ({r.posted_by}) · {r.posted_by_contact} · <a href={r.listing_url} target="_blank" rel="noreferrer">{r.website}</a>
                {!r.is_live && <span className="tag">Inactive</span>}
              </div>
            </div>
            <div className="card-side">
              <div className="price">{formatInr(r.price)}<span className="muted small"> /month</span></div>
              <div className="muted small">Deposit {formatInr(r.depositInr)} ({r.depositMonths} months)</div>
              <div className="muted small">Maintenance {formatInr(r.maintenance)}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
