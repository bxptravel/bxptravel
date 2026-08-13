import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { useProfile } from './useProfile'

export default function ProtectedRoute({ children, role, loginPath = '/admin/login' }) {
  const { session, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useProfile()

  if (authLoading || (session && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bone text-ink font-body">
        Checking access…
      </div>
    )
  }

  if (!session) {
    return <Navigate to={loginPath} replace />
  }

  if (role && profile?.role !== role) {
    return <Navigate to={loginPath} replace />
  }

  return children
}
