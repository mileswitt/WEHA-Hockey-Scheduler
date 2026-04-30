import { createContext, useContext, useState } from 'react'

const AuthContext     = createContext(null)
const TOKEN_KEY       = 'weha_jwt'
export const AUTH_HEADER_KEY = 'auth-token'

// Decode the JWT expiry client-side (no secret needed — just checks the exp claim).
function isTokenValid() {
  const token = sessionStorage.getItem(TOKEN_KEY)
  if (!token) return false
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 > Date.now()
  } catch {
    return false
  }
}

export function getAuthToken() {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => isTokenValid())

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
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
