import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useData } from '../DataContext.jsx'
import { ListingRow, PAGE_SIZE, Pager, Select } from '../components.jsx'

const SORTS = {
  newest: (a, b) => b.postedAtIst.localeCompare(a.postedAtIst),
  price_asc: (a, b) => a.price - b.price,
  price_desc: (a, b) => b.price - a.price,
  area_desc: (a, b) => b.carpetSqft - a.carpetSqft,
}

export default function Listings() {
  const { listings } = useData()
  const [params, setParams] = useSearchParams()
  const f = Object.fromEntries(params)
  const set = (key, value) => {
    const next = new URLSearchParams(params)
    if (value === '' || value === false) next.delete(key)
    else next.set(key, value)
    if (key !== 'page') next.delete('page')
    setParams(next, { replace: key !== 'page' })
  }

  const localities = useMemo(() => [...new Set(listings.map((l) => l.locality))].sort(), [listings])

  const filtered = useMemo(() => {
    // filtering is done here on normalised data rather than trusted to the server
    const min = f.min ? Number(f.min) : null
    const max = f.max ? Number(f.max) : null
    return listings
      .filter((l) => (f.flagged ? true : !l.fake && l.corrupt.length === 0))
      .filter((l) => (f.inactive ? true : l.is_live))
      .filter((l) => (f.dupes ? true : !l.duplicateOf))
      .filter((l) => !f.locality || l.locality === f.locality)
      .filter((l) => !f.bhk || l.bedroom === Number(f.bhk))
      .filter((l) => !f.furnishing || l.furnishing === f.furnishing)
      .filter((l) => min == null || l.price >= min)
      .filter((l) => max == null || l.price <= max)
      .sort(SORTS[f.sort] ?? SORTS.newest)
  }, [listings, f.flagged, f.inactive, f.dupes, f.locality, f.bhk, f.furnishing, f.min, f.max, f.sort])

  const page = Number(f.page) || 1
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <>
      <h2>Properties for sale</h2>
      <div className="filters">
        <Select label="Locality" value={f.locality ?? ''} onChange={(v) => set('locality', v)} options={localities} />
        <Select label="Bedrooms" value={f.bhk ?? ''} onChange={(v) => set('bhk', v)} options={[0, 1, 2, 3, 4, 5]} />
        <Select label="Furnishing" value={f.furnishing ?? ''} onChange={(v) => set('furnishing', v)}
          options={['unfurnished', 'semi-furnished', 'fully-furnished']} />
        <label>
          Min price (₹)
          <input type="number" min="0" step="100000" value={f.min ?? ''} onChange={(e) => set('min', e.target.value)} />
        </label>
        <label>
          Max price (₹)
          <input type="number" min="0" step="100000" value={f.max ?? ''} onChange={(e) => set('max', e.target.value)} />
        </label>
        <label>
          Sort
          <select value={f.sort ?? 'newest'} onChange={(e) => set('sort', e.target.value)}>
            <option value="newest">Newest</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="area_desc">Largest first</option>
          </select>
        </label>
      </div>
      <div className="toggles">
        <label><input type="checkbox" checked={!!f.inactive} onChange={(e) => set('inactive', e.target.checked && '1')} /> Include inactive</label>
        <label><input type="checkbox" checked={!!f.dupes} onChange={(e) => set('dupes', e.target.checked && '1')} /> Include duplicate records</label>
        <label><input type="checkbox" checked={!!f.flagged} onChange={(e) => set('flagged', e.target.checked && '1')} /> Include fake / impossible listings</label>
      </div>
      <Pager page={page} total={filtered.length} onPage={(p) => set('page', p)} />
      <div className="list">
        {rows.map((l) => <ListingRow key={l.listing_id} listing={l} />)}
        {rows.length === 0 && <p className="muted">No listings match these filters.</p>}
      </div>
      {filtered.length > PAGE_SIZE && <Pager page={page} total={filtered.length} onPage={(p) => set('page', p)} />}
    </>
  )
}
