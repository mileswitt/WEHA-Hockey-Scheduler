import { createContext, useContext, useState, useEffect, useRef } from 'react'

const AuthContext     = createContext(null)
const TOKEN_KEY       = 'weha_jwt'
export const AUTH_HEADER_KEY = 'auth-token'

// Returns seconds remaining before the JWT expires, or 0 if expired/absent.
function secondsLeft() {
  const token = sessionStorage.getItem(TOKEN_KEY)
  if (!token) return 0
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return Math.max(0, Math.floor(payload.exp - Date.now() / 1000))
  } catch {
    return 0
  }
}

export function getAuthToken() {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => secondsLeft() > 0)
  // null = not near expiry, number = seconds left when warning should show
  const [expiresInSeconds, setExpiresInSeconds] = useState(null)
  const intervalRef = useRef(null)

  // Start or restart the expiry-check interval whenever auth state changes.
  useEffect(() => {
    if (!isAuthenticated) {
      clearInterval(intervalRef.current)
      setExpiresInSeconds(null)
      return
    }

    function tick() {
      const secs = secondsLeft()
      if (secs === 0) {
        // Token expired — log out silently
        sessionStorage.removeItem(TOKEN_KEY)
        setIsAuthenticated(false)
        setExpiresInSeconds(null)
        clearInterval(intervalRef.current)
        return
      }
      // Show the warning banner when fewer than 5 minutes remain
      setExpiresInSeconds(secs < 300 ? secs : null)

      // Auto-refresh silently when between 8–10 minutes remain (once per session)
      if (secs > 480 && secs < 600) {
        silentRefresh()
      }
    }

    tick() // run immediately
    intervalRef.current = setInterval(tick, 30_000)
    return () => clearInterval(intervalRef.current)
  }, [isAuthenticated])

  async function silentRefresh() {
    const token = getAuthToken()
    if (!token) return
    try {
      const res  = await fetch('/api/refresh-token', { method: 'POST', headers: { [AUTH_HEADER_KEY]: token } })
      const data = await res.json()
      if (res.ok && data.token) {
        sessionStorage.setItem(TOKEN_KEY, data.token)
        setExpiresInSeconds(null)
      }
    } catch {
      // Network error — do nothing, let the warning appear naturally
    }
  }

  // Manual refresh triggered by the warning banner's "Stay logged in" button.
  async function refresh() {
    await silentRefresh()
    // Re-check immediately after refresh attempt
    const secs = secondsLeft()
    setExpiresInSeconds(secs < 300 ? secs : null)
  }

  const login = async (email, password) => {
    try {
      const res  = await fetch('/api/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username: email, password }),
      })
      const data = await res.json()
      if (res.ok && data.token) {
        sessionStorage.setItem(TOKEN_KEY, data.token)
        setIsAuthenticated(true)
        return { success: true }
      }
      return { success: false, error: data.message || 'Login failed' }
    } catch {
      return { success: false, error: 'Network error — is the server running?' }
    }
  }

  const logout = async () => {
    await fetch('/api/logout', { method: 'POST' }).catch(() => {})
    sessionStorage.removeItem(TOKEN_KEY)
    setIsAuthenticated(false)
    setExpiresInSeconds(null)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, refresh, expiresInSeconds }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
