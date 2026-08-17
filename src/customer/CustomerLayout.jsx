import { Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import Logo from '../components/Logo'

export default function CustomerLayout() {
  const navigate = useNavigate()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/account/login')
  }

  return (
    <div className="min-h-screen bg-bone font-body">
      <header className="max-w-3xl mx-auto px-6 pt-8 pb-6 flex items-center justify-between">
        <Logo size={20} />
        <button onClick={handleSignOut} className="text-sm text-muted hover:text-ink transition">
          Sign out
        </button>
      </header>
      <main className="max-w-3xl mx-auto px-6 pb-20">
        <Outlet />
      </main>
    </div>
  )
}
