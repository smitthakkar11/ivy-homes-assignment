import { API_KEY, BASE_URL, PAGE_LIMIT } from './config.js'

const SESSION_KEY = 'ivy.session'

export class ApiError extends Error {
  constructor(status, detail) {
    super(typeof detail === 'string' ? detail : JSON.stringify(detail))
    this.status = status
  }
}

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY))
  } catch {
    return null
  }
}

function saveSession(body) {
  const session = {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    // access tokens live 15 minutes (expires_in: 900), not 24 hours
    expiresAt: Date.now() + body.expires_in * 1000,
    user: body.user,
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

async function raw(method, path, { body, token } = {}) {
  const headers = { 'X-API-Key': API_KEY }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(BASE_URL + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!res.ok) throw new ApiError(res.status, data?.detail ?? data)
  return data
}

export async function login(email, password) {
  return saveSession(await raw('POST', '/auth/login', { body: { email, password } }))
}

export async function logout() {
  const session = getSession()
  clearSession()
  // the server does not revoke tokens; this call is a courtesy
  if (session) await raw('POST', '/auth/logout', { token: session.accessToken }).catch(() => {})
}

let refreshing = null
function refresh() {
  const session = getSession()
  if (!session?.refreshToken) return Promise.reject(new ApiError(401, 'not logged in'))
  refreshing ??= raw('POST', '/auth/refresh', { body: { refresh_token: session.refreshToken } })
    .then(saveSession)
    .catch((err) => {
      clearSession()
      window.dispatchEvent(new Event('ivy:logout'))
      throw err
    })
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

export async function request(method, path, body) {
  let session = getSession()
  if (!session) throw new ApiError(401, 'not logged in')
  if (session.expiresAt - Date.now() < 60_000) session = await refresh()
  try {
    return await raw(method, path, { body, token: session.accessToken })
  } catch (err) {
    if (err.status !== 401) throw err
    session = await refresh()
    return raw(method, path, { body, token: session.accessToken })
  }
}

// Pages with limit/offset (the documented `page` parameter is ignored) and
// follows `has_more`, because `total` under-reports the real record count.
export async function fetchAll(path, batch = 8) {
  const out = []
  for (let start = 0; ; start += batch * PAGE_LIMIT) {
    const offsets = Array.from({ length: batch }, (_, i) => start + i * PAGE_LIMIT)
    const pages = await Promise.all(
      offsets.map((o) => request('GET', `${path}?limit=${PAGE_LIMIT}&offset=${o}`)),
    )
    for (const page of pages) {
      out.push(...page.results)
      if (!page.has_more) return out
    }
  }
}

export const getListing = (id) => request('GET', `/v1/listings/${encodeURIComponent(id)}`)
export const getSaved = () => request('GET', '/v1/saved')
export const saveListing = (id) => request('POST', '/v1/saved', { listing_id: id })
export const unsaveListing = (id) => request('DELETE', `/v1/saved/${encodeURIComponent(id)}`)
