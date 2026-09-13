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
      <div className="page-head">
        <div>
          <h2>Builder projects</h2>
          <p className="muted">Price ranges converted to rupees, with each project's real number of live listings.</p>
        </div>
      </div>
      <div className="panel">
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
      </div>
      <Pager page={f.page} total={filtered.length} onPage={(p) => set('page', p)} />
      <div className="list">
        {rows.map((p) => (
          <div key={p.project_id} className="card">
            <div className="card-main">
              <div className="card-title">{p.apartment_name} <span className="muted" style={{ fontWeight: 400 }}>by {p.developer_name}</span></div>
              <div className="card-sub">{titleCase(p.locality)} · launched {p.launch_date} · possession {p.possession_date}</div>
              <div className="specs">
                <span className="spec">{titleCase(p.project_status)}</span>
                <span className="spec">{p.min_area_sqft.toLocaleString('en-IN')}–{p.max_area_sqft.toLocaleString('en-IN')} sq ft</span>
                <span className="spec">{p.total_units.toLocaleString('en-IN')} units</span>
                <span className="spec">{p.total_towers} towers · {p.total_floors} floors</span>
              </div>
              <div className="muted small">RERA {p.rera_number} · {p.project_id}</div>
              <span className="flags">
                <span className="tag ok">{p.actualListings} live listings</span>
                {p.listingCountWrong && <span className="tag warn">project page claims {p.total_listings}</span>}
              </span>
            </div>
            <div className="card-side">
              <div style={{ textAlign: 'right' }}>
                <div className="price">{formatInr(p.priceMinInr)} – {formatInr(p.priceMaxInr)}</div>
                <div className="muted small">price range</div>
              </div>
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="empty">No projects match these filters.</div>}
      </div>
    </>
  )
}
