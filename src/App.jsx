import { useEffect, useState } from 'react'
import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import * as api from './api.js'
import { DataProvider, useData } from './DataContext.jsx'
import Login from './pages/Login.jsx'
import Listings from './pages/Listings.jsx'
import ListingDetail from './pages/ListingDetail.jsx'
import Saved from './pages/Saved.jsx'
import Rentals from './pages/Rentals.jsx'
import Projects from './pages/Projects.jsx'
import Insights from './pages/Insights.jsx'

export default function App() {
  const [session, setSession] = useState(api.getSession)

  useEffect(() => {
    const onLogout = () => setSession(null)
    window.addEventListener('ivy:logout', onLogout)
    return () => window.removeEventListener('ivy:logout', onLogout)
  }, [])

  if (!session) return <Login onLogin={setSession} />

  const signOut = async () => {
    await api.logout()
    setSession(null)
  }

  return (
    <DataProvider key={session.user.email}>
      <header className="topbar">
        <strong className="brand">Ivy Homes · Pune</strong>
        <nav>
          <NavLink to="/listings">Listings</NavLink>
          <NavLink to="/rentals">Rentals</NavLink>
          <NavLink to="/projects">Projects</NavLink>
          <NavLink to="/saved">Saved</NavLink>
          <NavLink to="/insights">Insights</NavLink>
        </nav>
        <span className="user">
          {session.user.email}
          <button className="link" onClick={signOut}>Log out</button>
        </span>
      </header>
      <main>
        <Gate>
          <Routes>
            <Route path="/" element={<Navigate to="/listings" replace />} />
            <Route path="/listings" element={<Listings />} />
            <Route path="/listings/:id" element={<ListingDetail />} />
            <Route path="/saved" element={<Saved />} />
            <Route path="/rentals" element={<Rentals />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="*" element={<p>Page not found.</p>} />
          </Routes>
        </Gate>
      </main>
    </DataProvider>
  )
}

function Gate({ children }) {
  const { status, error } = useData()
  if (status === 'loading') return <p className="muted">Loading every listing, rental and project…</p>
  if (status === 'error') return <p className="error">Could not load data: {error}</p>
  return children
}
