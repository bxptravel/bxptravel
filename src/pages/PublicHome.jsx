import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import Logo from '../components/Logo'

const typeLabel = { villa: 'Villa', apartment: 'Apartment', yacht: 'Yacht' }
const typeIcon = { villa: 'ti-building-estate', apartment: 'ti-building', yacht: 'ti-anchor' }

export default function PublicHome() {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeType, setActiveType] = useState('all')
  const [query, setQuery] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guestsFilter, setGuestsFilter] = useState('')

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

      const matchesGuests =
        !guestsFilter || (p.guests_capacity && p.guests_capacity >= parseInt(guestsFilter))

      let matchesDates = true
      if (checkIn && checkOut && p.blocked_dates?.length) {
        matchesDates = !p.blocked_dates.some(
          (range) => checkIn < range.end && checkOut > range.start
        )
      }

      return matchesType && matchesQuery && matchesGuests && matchesDates
    })
  }, [properties, activeType, query, checkIn, checkOut, guestsFilter])

  return (
    <div className="min-h-screen bg-bone font-body">
      <header className="max-w-6xl mx-auto px-8 pt-10 pb-2 flex items-center justify-between">
        <Logo />
        <nav className="flex items-center gap-7 text-sm text-muted">
          <button
            onClick={() => setActiveType('villa')}
            className={activeType === 'villa' ? 'text-ink' : 'hover:text-ink transition'}
          >
            Villas
          </button>
          <button
            onClick={() => setActiveType('apartment')}
            className={activeType === 'apartment' ? 'text-ink' : 'hover:text-ink transition'}
          >
            Apartments
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

      <div className="max-w-6xl mx-auto px-8 pb-8">
        <div className="text-[11px] uppercase tracking-wider text-brass font-medium">
          Travel the world for less
        </div>
      </div>

      <section className="max-w-6xl mx-auto px-8 pb-10">
        <h1 className="font-serif font-medium text-ink text-4xl md:text-[42px] leading-tight max-w-xl mx-auto text-center mb-3">
          Extraordinary stays, without the price tag
        </h1>
        <p className="text-muted text-sm max-w-md mx-auto text-center mb-6">
          A bespoke collection of villas, apartments and yachts — for a price you won't find
          anywhere else.
        </p>

        <div className="flex flex-wrap items-center gap-2 sm:gap-0 bg-white border border-ink/10 rounded-full sm:rounded-full p-2 sm:p-1.5 max-w-3xl mx-auto">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Where to"
            className="w-56 sm:w-64 flex-shrink-0 bg-transparent px-3 sm:px-4 py-2 text-sm text-ink placeholder-muted outline-none"
          />
          <div className="w-px h-5 bg-ink/10 hidden sm:block" />
          <input
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            className="bg-transparent px-2 sm:px-3 py-2 text-sm text-ink outline-none min-w-0"
            aria-label="Check-in"
          />
          <span className="text-muted text-sm">–</span>
          <input
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            min={checkIn || undefined}
            className="bg-transparent px-2 sm:px-3 py-2 text-sm text-ink outline-none min-w-0"
            aria-label="Check-out"
          />
          <div className="w-px h-5 bg-ink/10 hidden sm:block" />
          <input
            type="number"
            min="1"
            value={guestsFilter}
            onChange={(e) => setGuestsFilter(e.target.value)}
            placeholder="Guests"
            className="w-24 sm:w-[92px] flex-shrink-0 bg-transparent pl-2 sm:pl-3 pr-1 py-2 text-sm text-ink placeholder-muted outline-none"
          />
          <button
            type="button"
            className="w-full sm:w-auto sm:ml-auto bg-forest text-bone rounded-full px-5 py-2 text-sm font-medium hover:bg-forestlight transition"
          >
            Search
          </button>
        </div>
        {(query || checkIn || checkOut || guestsFilter || activeType !== 'all') && (
          <button
            onClick={() => {
              setQuery('')
              setCheckIn('')
              setCheckOut('')
              setGuestsFilter('')
              setActiveType('all')
            }}
            className="block mx-auto w-fit text-xs text-muted hover:text-ink mt-2 underline"
          >
            Clear all filters
          </button>
        )}
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
                  {property.price_from
                    ? property.guests_capacity
                      ? ` · from £${Math.round(property.price_from / property.guests_capacity).toLocaleString()} per person/night`
                      : ` · from £${Number(property.price_from).toLocaleString()}/night`
                    : ''}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
