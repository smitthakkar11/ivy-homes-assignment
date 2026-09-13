// Turns raw API records into what they actually mean. Every rule here was
// worked out against the live data; see README.md for how.

const SQM_TO_SQFT = 10.7639
// magichomes started sending areas in square metres from this date (IST)
const MAGICHOMES_SQM_FROM = '2026-06-01T00:00:00'

export const REFERENCE = '2026-09-10T00:00:00' // IST

const median = (xs) => {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
export { median }

// ---------- listings ----------

function toSqft(listing, value) {
  const inSqm = listing.website === 'magichomes' && listing.posted_at >= MAGICHOMES_SQM_FROM
  return inSqm ? Math.round(value * SQM_TO_SQFT) : value
}

function corruptReasons(l) {
  const r = []
  if (l.price <= 0) r.push('price is zero or negative')
  else if (l.price < 100000) r.push(`price of ₹${l.price} is impossible for a property`)
  if (l.floor > l.total_floors) r.push(`floor ${l.floor} of a ${l.total_floors}-floor building`)
  if (l.carpet_area > l.super_built_up_area) r.push('carpet area larger than super built-up area')
  if (l.posted_at >= REFERENCE) r.push('posted in the future')
  if (l.latitude > 40 || l.longitude < 40) r.push('latitude and longitude are swapped')
  if (l.bedroom === 0 && l.property_type !== 'plot') r.push(`${l.property_type} with no bedrooms or bathrooms`)
  return r
}

export function normalizeListing(l) {
  const swapped = l.latitude > 40
  return {
    ...l,
    carpetSqft: toSqft(l, l.carpet_area),
    superBuiltUpSqft: toSqft(l, l.super_built_up_area),
    areaWasSqm: toSqft(l, 100) !== 100,
    lat: swapped ? l.longitude : l.latitude,
    lng: swapped ? l.latitude : l.longitude,
    postedAtIst: l.posted_at, // listings send IST wall-clock time with no offset
    corrupt: corruptReasons(l),
    fake: false,
    duplicateOf: null,
    duplicates: [],
  }
}

function distanceMetres(a, b) {
  const dLat = (a.lat - b.lat) * 111_000
  const dLng = (a.lng - b.lng) * 111_000 * Math.cos((a.lat * Math.PI) / 180)
  return Math.hypot(dLat, dLng)
}

// Same flat re-posted (usually on another portal): identical layout, carpet
// area within 3%, coordinates jittered by < 150 m. Building names vary
// ("The X", "X Apartments", "X Phase 1", case, hyphens) so they are not used.
function markDuplicates(listings) {
  const buckets = new Map()
  for (const l of listings) {
    const key = [l.locality, l.property_type, l.bedroom, l.bathroom, l.balcony, l.floor,
      l.total_floors, l.facing_direction, l.furnishing, l.covered_parking].join('|')
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(l)
  }
  const parent = new Map(listings.map((l) => [l.listing_id, l.listing_id]))
  const find = (id) => {
    while (parent.get(id) !== id) id = parent.get(id)
    return id
  }
  for (const group of buckets.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i]
        const b = group[j]
        const areaDiff = Math.abs(a.carpetSqft - b.carpetSqft) / Math.max(a.carpetSqft, b.carpetSqft)
        const d = distanceMetres(a, b)
        if (areaDiff < 0.03 && d > 0 && d < 150) parent.set(find(a.listing_id), find(b.listing_id))
      }
    }
  }
  const clusters = new Map()
  for (const l of listings) {
    const root = find(l.listing_id)
    if (!clusters.has(root)) clusters.set(root, [])
    clusters.get(root).push(l)
  }
  for (const members of clusters.values()) {
    if (members.length < 2) continue
    // the earliest listing id is treated as the primary record of the property
    members.sort((a, b) => a.listing_id.slice(4).localeCompare(b.listing_id.slice(4)))
    for (const m of members) {
      m.duplicates = members.filter((o) => o !== m).map((o) => o.listing_id)
      if (m !== members[0]) m.duplicateOf = members[0].listing_id
    }
  }
  return clusters.size
}

// Fake listings: a handful of phone numbers, each posting as several different
// "agents", every listing marked verified and live, priced far below market.
// Genuine agencies also share numbers across names, but price at market.
function markFakes(listings) {
  const pps = (l) => l.price / l.carpetSqft
  const market = new Map()
  for (const l of listings) {
    if (l.corrupt.length) continue
    const k = `${l.locality}|${l.property_type}`
    if (!market.has(k)) market.set(k, [])
    market.get(k).push(pps(l))
  }
  for (const [k, v] of market) market.set(k, median(v))

  const byContact = new Map()
  for (const l of listings) {
    if (!byContact.has(l.posted_by_contact)) byContact.set(l.posted_by_contact, [])
    byContact.get(l.posted_by_contact).push(l)
  }
  const fakeContacts = []
  for (const [contact, ls] of byContact) {
    const names = new Set(ls.map((l) => l.posted_by_name))
    const clean = ls.filter((l) => !l.corrupt.length)
    const ratio = median(clean.map((l) => pps(l) / market.get(`${l.locality}|${l.property_type}`)))
    const allVerifiedLive = ls.every((l) => l.is_verified && l.is_live && l.posted_by === 'agent')
    if (ls.length >= 10 && names.size >= 3 && allVerifiedLive && ratio < 0.75) {
      fakeContacts.push(contact)
      ls.forEach((l) => (l.fake = true))
    }
  }
  return fakeContacts
}

export function buildListings(rawListings) {
  const listings = rawListings.map(normalizeListing)
  const uniqueProperties = markDuplicates(listings)
  const fakeContacts = markFakes(listings)
  return { listings, uniqueProperties, fakeContacts }
}

// ---------- rentals ----------

export function normalizeRental(r) {
  // zerobroker sends the deposit as a number of months of rent
  const depositInMonths = r.deposit < 100
  return {
    ...r,
    depositInr: depositInMonths ? r.deposit * r.price : r.deposit,
    depositMonths: depositInMonths ? r.deposit : Math.round(r.deposit / r.price),
    postedAtIst: toIst(r.posted_at),
  }
}

function toIst(utcIso) {
  const d = new Date(utcIso)
  return new Date(d.getTime() + 5.5 * 3600_000).toISOString().slice(0, 19)
}

// ---------- projects ----------

// price_min / price_max are floats: values under 10 are crores, the rest lakhs.
export const projectPriceInr = (v) => Math.round(v < 10 ? v * 1e7 : v * 1e5)

export function normalizeProject(p, liveCountByProject) {
  const actual = liveCountByProject.get(p.project_id) ?? 0
  return {
    ...p,
    priceMinInr: projectPriceInr(p.price_min),
    priceMaxInr: projectPriceInr(p.price_max),
    actualListings: actual,
    listingCountWrong: actual !== p.total_listings,
  }
}

export function liveCountByProject(listings) {
  const m = new Map()
  for (const l of listings) if (l.project_id && l.is_live) m.set(l.project_id, (m.get(l.project_id) ?? 0) + 1)
  return m
}

// ---------- formatting ----------

export function formatInr(v) {
  if (v == null) return '—'
  const abs = Math.abs(v)
  if (abs >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`
  if (abs >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`
  return `₹${v.toLocaleString('en-IN')}`
}

export function formatIst(isoLocal) {
  const [date, time] = isoLocal.split('T')
  const d = new Date(`${date}T00:00:00Z`)
  const day = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
  return `${day}, ${time.slice(0, 5)} IST`
}

export const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase())
