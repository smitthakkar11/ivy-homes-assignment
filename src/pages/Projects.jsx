import { useMemo, useState } from 'react'
import { useData } from '../DataContext.jsx'
import { PAGE_SIZE, Pager, Select } from '../components.jsx'
import { formatInr, titleCase } from '../data.js'

export default function Projects() {
  const { projects } = useData()
  const [f, setF] = useState({ locality: '', status: '', sort: 'price_max', page: 1 })
  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v, page: k === 'page' ? v : 1 }))

  const localities = useMemo(() => [...new Set(projects.map((p) => p.locality))].sort(), [projects])
  const filtered = useMemo(() => {
    const sorts = {
      price_max: (a, b) => b.priceMaxInr - a.priceMaxInr,
      price_min: (a, b) => a.priceMinInr - b.priceMinInr,
      possession: (a, b) => a.possession_date.localeCompare(b.possession_date),
    }
    return projects
      .filter((p) => !f.locality || p.locality === f.locality)
      .filter((p) => !f.status || p.project_status === f.status)
      .sort(sorts[f.sort])
  }, [projects, f.locality, f.status, f.sort])
  const rows = filtered.slice((f.page - 1) * PAGE_SIZE, f.page * PAGE_SIZE)

  return (
    <>
      <h2>Builder projects</h2>
      <div className="filters">
        <Select label="Locality" value={f.locality} onChange={(v) => set('locality', v)} options={localities} />
        <Select label="Status" value={f.status} onChange={(v) => set('status', v)}
          options={['new launch', 'under construction', 'ready to move']} />
        <label>
          Sort
          <select value={f.sort} onChange={(e) => set('sort', e.target.value)}>
            <option value="price_max">Costliest first</option>
            <option value="price_min">Cheapest entry price</option>
            <option value="possession">Earliest possession</option>
          </select>
        </label>
      </div>
      <Pager page={f.page} total={filtered.length} onPage={(p) => set('page', p)} />
      <div className="list">
        {rows.map((p) => (
          <div key={p.project_id} className="card">
            <div className="card-main">
              <div className="card-title">{p.apartment_name} <span className="muted">by {p.developer_name}</span></div>
              <div className="muted">
                {titleCase(p.locality)} · {titleCase(p.project_status)} · {p.total_units} units in {p.total_towers} towers, {p.total_floors} floors ·
                {' '}{p.min_area_sqft.toLocaleString('en-IN')}–{p.max_area_sqft.toLocaleString('en-IN')} sq ft
              </div>
              <div className="muted small">
                Launched {p.launch_date} · possession {p.possession_date} · RERA {p.rera_number} · {p.project_id}
              </div>
              <div className="small">
                {p.actualListings} live listings
                {p.listingCountWrong && (
                  <span className="tag warn">project page claims {p.total_listings}</span>
                )}
              </div>
            </div>
            <div className="card-side">
              <div className="price">{formatInr(p.priceMinInr)} – {formatInr(p.priceMaxInr)}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
