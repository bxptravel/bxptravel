import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import Logo from '../components/Logo'

export default function RenterLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setLoading(false)
      setError('Incorrect email or password. Try again.')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    setLoading(false)

    if (profile?.role !== 'renter') {
      setError("This account isn't set up as a renter account.")
      await supabase.auth.signOut()
      return
    }

    navigate('/renter/properties')
  }

  return (
    <div className="min-h-screen bg-bone flex items-center justify-center px-6 font-body">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <Logo size={24} />
          <p className="text-[10px] uppercase tracking-wider text-muted mt-2">Renter portal</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-white border border-ink/15 px-4 py-2.5 text-ink placeholder-muted outline-none focus:border-forest"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-white border border-ink/15 px-4 py-2.5 text-ink placeholder-muted outline-none focus:border-forest"
            />
          </div>

          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-forest text-bone font-semibold rounded-lg py-2.5 hover:bg-forestlight transition disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
