import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../AuthContext'

const typeLabel = { villa: 'Villa', apartment: 'Apartment', yacht: 'Yacht' }

export default function RenterProperties() {
  const { session } = useAuth()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadProperties()
  }, [session])

  async function loadProperties() {
    if (!session) return
    setLoading(true)
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('renter_id', session.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setProperties(data)
    }
    setLoading(false)
  }

  async function toggleStatus(property) {
    const newStatus = property.status === 'active' ? 'hidden' : 'active'
    const { error } = await supabase
      .from('properties')
      .update({ status: newStatus })
      .eq('id', property.id)

    if (!error) {
      setProperties((prev) =>
        prev.map((p) => (p.id === property.id ? { ...p, status: newStatus } : p))
      )
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif font-medium text-3xl text-ink">My Properties</h1>
          <p className="text-muted text-sm mt-1">Listings you manage on BXP Travel</p>
        </div>
        <Link
          to="/renter/properties/new"
          className="bg-forest text-bone font-semibold rounded-lg px-5 py-2.5 text-sm hover:bg-forestlight transition"
        >
          + Add property
        </Link>
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : properties.length === 0 ? (
        <div className="text-center py-20 text-muted border border-ink/10 rounded-xl bg-white">
          <p className="text-lg mb-1 font-serif text-ink">No properties yet</p>
          <p className="text-sm">Add your first listing to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {properties.map((property) => (
            <div
              key={property.id}
              className="bg-white border border-ink/10 rounded-xl overflow-hidden hover:border-ink/25 transition"
            >
              <div className="h-40 bg-stone relative">
                {property.cover_photo ? (
                  <img
                    src={property.cover_photo}
                    alt={property.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-ink/30 text-sm">
                    No photo yet
                  </div>
                )}
                <span
                  className={`absolute top-3 left-3 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                    property.status === 'active'
                      ? 'bg-forest/10 text-forest border border-forest/25'
                      : 'bg-ink/10 text-ink/50 border border-ink/15'
                  }`}
                >
                  {property.status === 'active' ? 'Live' : 'Hidden'}
                </span>
              </div>

              <div className="p-4">
                <div className="text-[10px] uppercase tracking-wider text-brass mb-1">
                  {typeLabel[property.type] || property.type} · {property.location}
                </div>
                <div className="font-serif text-lg text-ink mb-3">{property.name}</div>

                <div className="flex gap-2">
                  <Link
                    to={`/renter/properties/${property.id}`}
                    className="flex-1 text-center text-xs font-medium bg-ink/5 hover:bg-ink/10 text-ink rounded-lg py-2 transition"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => toggleStatus(property)}
                    className="flex-1 text-xs font-medium bg-ink/5 hover:bg-ink/10 text-ink rounded-lg py-2 transition"
                  >
                    {property.status === 'active' ? 'Hide' : 'Publish'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
