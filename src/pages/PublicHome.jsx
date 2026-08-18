import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import Logo from '../components/Logo'

const typeLabel = { villa: 'Villa', apartment: 'Apartment', yacht: 'Yacht' }

function TypeIcon({ type, className }) {
  if (type === 'yacht') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
        <path d="M3 17h18l-2 4H5l-2-4Z" strokeLinejoin="round" />
        <path d="M6 17V9l6-5 6 5v8" strokeLinejoin="round" />
        <path d="M12 4v13" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <path d="M4 21V9l8-6 8 6v12" strokeLinejoin="round" />
      <path d="M9 21v-7h6v7" strokeLinejoin="round" />
    </svg>
  )
}

function MenuIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}>
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  )
}

function CloseIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}>
      <line x1="5" y1="5" x2="19" y2="19" />
      <line x1="19" y1="5" x2="5" y2="19" />
    </svg>
  )
}

function PinIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" strokeLinejoin="round" />
      <circle cx="12" cy="9.5" r="2.2" />
    </svg>
  )
}

export default function PublicHome() {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeType, setActiveType] = useState('all')
  const [query, setQuery] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guestsFilter, setGuestsFilter] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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

  function adjustGuests(delta) {
    const current = parseInt(guestsFilter) || 0
    const next = Math.max(0, current + delta)
    setGuestsFilter(next === 0 ? '' : String(next))
  }

  return (
    <div className="min-h-screen bg-bone font-body">
      <header className="max-w-6xl mx-auto px-6 sm:px-8 pt-8 sm:pt-10 pb-2 flex items-center justify-between">
        <Logo />

        <nav className="hidden sm:flex items-center gap-7 text-sm text-muted">
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

        <button
          onClick={() => setMobileMenuOpen((v) => !v)}
          className="sm:hidden text-ink p-2 -mr-2"
          aria-label="Menu"
        >
          {mobileMenuOpen ? <CloseIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
        </button>
      </header>

      {mobileMenuOpen && (
        <div className="sm:hidden max-w-6xl mx-auto px-6 pb-2">
          <div className="bg-white border border-ink/10 rounded-xl overflow-hidden text-sm shadow-sm">
            <button
              onClick={() => {
                setActiveType('villa')
                setMobileMenuOpen(false)
              }}
              className="w-full text-left px-4 py-3 text-ink border-b border-ink/5"
            >
              Villas
            </button>
            <button
              onClick={() => {
                setActiveType('apartment')
                setMobileMenuOpen(false)
              }}
              className="w-full text-left px-4 py-3 text-ink border-b border-ink/5"
            >
              Apartments
            </button>
            <button
              onClick={() => {
                setActiveType('yacht')
                setMobileMenuOpen(false)
              }}
              className="w-full text-left px-4 py-3 text-ink border-b border-ink/5"
            >
              Yachts
            </button>
            <Link
              to="/enquire"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-3 text-forest font-medium"
            >
              Enquire
            </Link>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 sm:px-8 pb-8">
        <div className="text-[11px] uppercase tracking-wider text-brass font-medium">
          Travel the world for less
        </div>
      </div>

      <section className="max-w-6xl mx-auto px-6 sm:px-8 pb-10">
        <h1 className="font-serif font-medium text-ink text-4xl md:text-[42px] leading-tight max-w-xl mx-auto text-center mb-3">
          Extraordinary stays, without the price tag
        </h1>
        <p className="text-muted text-sm max-w-md mx-auto text-center mb-6">
          A bespoke collection of villas, apartments and yachts — for a price you won't find
          anywhere else.
        </p>

        <div className="bg-white border border-ink/10 rounded-2xl sm:rounded-full shadow-sm p-2 sm:p-1.5 max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:flex-nowrap sm:items-center gap-1 sm:gap-0">
            {/* Where to */}
            <div className="flex items-center gap-2 px-3 py-2.5 sm:py-2 sm:w-56 md:w-64 flex-shrink-0">
              <PinIcon className="w-4 h-4 text-muted flex-shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Where to"
                className="w-full bg-transparent text-sm text-ink placeholder-muted outline-none"
              />
            </div>

            <div className="w-px h-8 bg-ink/10 hidden sm:block" />
            <div className="h-px bg-ink/10 sm:hidden mx-1" />

            {/* Dates */}
            <div className="flex items-stretch bg-ink/[0.025] sm:bg-transparent rounded-xl sm:rounded-none">
              <div className="flex-1 sm:flex-initial px-3 py-2">
                <div className="text-[9px] uppercase tracking-wider text-muted font-medium">
                  Check-in
                </div>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full sm:w-[128px] bg-transparent text-sm text-ink outline-none text-left [&::-webkit-date-and-time-value]:text-left"
                  aria-label="Check-in"
                />
              </div>
              <div className="w-px bg-ink/10 my-2" />
              <div className="flex-1 sm:flex-initial px-3 py-2">
                <div className="text-[9px] uppercase tracking-wider text-muted font-medium">
                  Check-out
                </div>
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  min={checkIn || undefined}
                  className="w-full sm:w-[128px] bg-transparent text-sm text-ink outline-none text-left [&::-webkit-date-and-time-value]:text-left"
                  aria-label="Check-out"
                />
              </div>
            </div>

            <div className="w-px h-8 bg-ink/10 hidden sm:block" />
            <div className="h-px bg-ink/10 sm:hidden mx-1" />

            {/* Guests */}
            <div className="flex items-center justify-between gap-4 bg-ink/[0.025] sm:bg-transparent rounded-xl sm:rounded-none px-3 py-2 sm:w-auto flex-shrink-0">
              <div className="flex-1 min-w-[88px]">
                <div className="text-[9px] uppercase tracking-wider text-muted font-medium">
                  Guests
                </div>
                <input
                  type="number"
                  min="0"
                  value={guestsFilter}
                  onChange={(e) => setGuestsFilter(e.target.value)}
                  placeholder="Add guests"
                  className="w-full bg-transparent text-sm text-ink placeholder-muted outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
                <button
                  type="button"
                  onClick={() => adjustGuests(-1)}
                  disabled={!guestsFilter}
                  className="w-6 h-6 rounded-full border border-ink/20 text-ink flex items-center justify-center text-sm disabled:opacity-30 hover:border-ink/40 transition"
                  aria-label="Decrease guests"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => adjustGuests(1)}
                  className="w-6 h-6 rounded-full bg-forest text-bone flex items-center justify-center text-sm hover:bg-forestlight transition"
                  aria-label="Increase guests"
                >
                  +
                </button>
              </div>
            </div>

            <button
              type="button"
              className="w-full sm:w-auto sm:ml-2 mt-1 sm:mt-0 flex-shrink-0 bg-forest text-bone rounded-full px-6 py-2.5 sm:py-2 text-sm font-medium hover:bg-forestlight transition"
            >
              Search
            </button>
          </div>
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

      <main className="max-w-6xl mx-auto px-6 sm:px-8 pb-20">
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
                    <TypeIcon type={property.type} className="w-8 h-8 text-ink/25" />
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
