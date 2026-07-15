import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import Logo from '../components/Logo'

const typeLabel = { hotel: 'Hotel', resort: 'Resort', yacht: 'Yacht' }
const typeIcon = { hotel: 'ti-building-skyscraper', resort: 'ti-building-estate', yacht: 'ti-anchor' }

export default function PublicHome() {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeType, setActiveType] = useState('all')
  const [query, setQuery] = useState('')

  useEffect(() => {
    loadProperties()
  }, [])

  async function loadProperties() {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('status', 'active')
      .order('featured', { ascending: false })
      .order('display_order', { ascending: true })

    if (!error) setProperties(data)
    setLoading(false)
  }

  const filtered = useMemo(() => {
    return properties.filter((p) => {
      const matchesType = activeType === 'all' || p.type === activeType
      const q = query.toLowerCase()
      const matchesQuery =
        !q || p.name.toLowerCase().includes(q) || p.location.toLowerCase().includes(q)
      return matchesType && matchesQuery
    })
  }, [properties, activeType, query])

  return (
    <div className="min-h-screen bg-bone font-body">
      <header className="max-w-6xl mx-auto px-8 pt-10 pb-6 flex items-center justify-between">
        <Logo />
        <nav className="flex items-center gap-7 text-sm text-muted">
          <button
            onClick={() => setActiveType('hotel')}
            className={activeType === 'hotel' ? 'text-ink' : 'hover:text-ink transition'}
          >
            Hotels
          </button>
          <button
            onClick={() => setActiveType('resort')}
            className={activeType === 'resort' ? 'text-ink' : 'hover:text-ink transition'}
          >
            Resorts
          </button>
          <button
            onClick={() => setActiveType('yacht')}
            className={activeType === 'yacht' ? 'text-ink' : 'hover:text-ink transition'}
          >
            Yachts
          </button>
          <Link to="/enquire" className="text-ink font-medium">
            Enquire
          </Link>
        </nav>
      </header>

      <section className="max-w-6xl mx-auto px-8 pb-10">
        <h1 className="font-serif font-medium text-ink text-4xl md:text-[42px] leading-tight max-w-xl mb-3">
          Curated stays, quietly extraordinary
        </h1>
        <p className="text-muted text-sm max-w-md mb-6">
          A private collection of villas, resorts, and yachts — personally vetted before they
          reach you.
        </p>

        <div className="flex items-center bg-white border border-ink/10 rounded-full p-1.5 max-w-xl">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or destination"
            className="flex-1 bg-transparent px-4 py-2 text-sm text-ink placeholder-muted outline-none"
          />
          <button
            onClick={() => setActiveType('all')}
            className="bg-forest text-bone rounded-full px-5 py-2 text-sm font-medium hover:bg-forestlight transition"
          >
            Show all
          </button>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-8 pb-20">
        {loading ? (
          <p className="text-muted text-sm">Loading properties…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-muted">
            <p className="text-lg mb-1 font-serif text-ink">Nothing here yet</p>
            <p className="text-sm">Check back soon for new additions to the collection.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map((property) => (
              <Link key={property.id} to={`/property/${property.id}`} className="group block">
                <div className="rounded-xl h-48 bg-stone overflow-hidden mb-3 flex items-center justify-center">
                  {property.cover_photo ? (
                    <img
                      src={property.cover_photo}
                      alt={property.name}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition duration-300"
                    />
                  ) : (
                    <i
                      className={`ti ${typeIcon[property.type]} text-3xl text-ink/30`}
                      aria-hidden="true"
                    />
                  )}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-brass mb-1">
                  {typeLabel[property.type] || property.type}
                </div>
                <div className="font-serif text-lg text-ink mb-0.5">{property.name}</div>
                <div className="text-xs text-muted">
                  {property.location}
                  {property.price_from ? ` · from £${Number(property.price_from).toLocaleString()}/night` : ''}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
