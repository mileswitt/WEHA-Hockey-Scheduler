// Wrapper that guards every admin route. If the user is not authenticated
// (no valid JWT in sessionStorage), they get bounced to /login automatically.
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/Authentication'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}