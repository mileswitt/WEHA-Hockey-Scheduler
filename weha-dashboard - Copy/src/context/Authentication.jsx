import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

// TODO: Replace with hashed/encrypted credentials later
const VALID_CREDENTIALS = {
  email: 'a',
  password: 'a'
}

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const login = (email, password) => {
    if (email === VALID_CREDENTIALS.email && password === VALID_CREDENTIALS.password) {
      setIsAuthenticated(true)
      return { success: true }
    }
    return { success: false, error: 'Invalid email or password.' }
  }

  const logout = () => setIsAuthenticated(false)

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}