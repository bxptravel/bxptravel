import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import Logo from '../components/Logo'

export default function AdminLayout() {
  const navigate = useNavigate()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  const linkClass = ({ isActive }) =>
    `block px-4 py-2.5 rounded-lg text-sm font-medium transition ${
      isActive ? 'bg-forest text-bone' : 'text-ink/60 hover:bg-ink/5 hover:text-ink'
    }`

  return (
    <div className="min-h-screen bg-bone font-body">
      <div className="flex">
        <aside className="w-60 min-h-screen border-r border-ink/10 p-5 flex flex-col">
          <div className="mb-8 px-1">
            <Logo size={20} />
            <div className="text-[10px] uppercase tracking-wider text-muted mt-1">Admin</div>
          </div>

          <nav className="space-y-1 flex-1">
            <NavLink to="/admin/properties" className={linkClass}>
              Properties
            </NavLink>
            <NavLink to="/admin/enquiries" className={linkClass}>
              Enquiries
            </NavLink>
          </nav>

          <button
            onClick={handleSignOut}
            className="text-sm text-muted hover:text-ink text-left px-4 py-2"
          >
            Sign out
          </button>
        </aside>

        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
