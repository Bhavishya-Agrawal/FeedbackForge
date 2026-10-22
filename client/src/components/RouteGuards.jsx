import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Home from '../pages/Home.jsx'

const Loading = () => <p className="narrow note">Loading…</p>

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Loading />
  return user ? children : <Navigate to="/login" replace />
}

export function GuestRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Loading />
  return user ? <Navigate to="/app" replace /> : children
}

export function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <Loading />
  return user ? <Navigate to="/app" replace /> : <Home />
}
