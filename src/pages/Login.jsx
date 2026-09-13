import { useState } from 'react'
import * as api from '../api.js'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('demo1@ivy.homes')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      onLogin(await api.login(email.trim(), password))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      <form className="login" onSubmit={submit}>
        <strong className="brand"><span className="brand-mark">I</span>Ivy Homes</strong>
        <p className="muted">Sign in to browse homes for sale and rent in Pune.</p>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password" required />
        </label>
        {error && <p className="error small">{error}</p>}
        <button className="primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="muted small">Demo accounts: demo1, demo2 or demo3 @ivy.homes</p>
      </form>
    </div>
  )
}
