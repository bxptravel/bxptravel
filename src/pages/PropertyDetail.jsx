import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import Logo from '../components/Logo'

const typeLabel = { hotel: 'Hotel', resort: 'Resort', yacht: 'Yacht' }

export default function PropertyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activePhoto, setActivePhoto] = useState(0)

  useEffect(() => {
    loadProperty()
  }, [id])

  async function loadProperty() {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .eq('status', 'active')
      .single()

    if (!error) setProperty(data)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bone flex items-center justify-center text-muted font-body">
        Loading…
      </div>
    )
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-bone flex flex-col items-center justify-center text-center px-6 font-body">
        <p className="font-serif text-2xl text-ink mb-2">This one's no longer available</p>
        <p className="text-muted text-sm mb-6">It may have been removed from the collection.</p>
        <Link to="/" className="text-forest font-medium text-sm hover:underline">
          Back to the collection
        </Link>
      </div>
    )
  }

  const photos = property.photos?.length ? property.photos : [null]

  return (
    <div className="min-h-screen bg-bone font-body">
      <header className="max-w-6xl mx-auto px-8 pt-10 pb-6 flex items-center justify-between">
        <Link to="/">
          <Logo />
        </Link>
        <Link to="/" className="text-sm text-muted hover:text-ink transition">
          Back to collection
        </Link>
      </header>

      <main className="max-w-6xl mx-auto px-8 pb-20">
        <div className="rounded-xl h-96 bg-stone overflow-hidden mb-3 flex items-center justify-center">
          {photos[activePhoto] ? (
            <img
              src={photos[activePhoto]}
              alt={property.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <i className="ti ti-photo text-4xl text-ink/25" aria-hidden="true" />
          )}
        </div>

        {photos.length > 1 && (
          <div className="flex gap-2 mb-10">
            {photos.map((url, i) => (
              <button
                key={i}
                onClick={() => setActivePhoto(i)}
                className={`w-20 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition ${
                  activePhoto === i ? 'border-forest' : 'border-transparent'
                }`}
              >
                {url && <img src={url} alt="" className="w-full h-full object-cover" />}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="md:col-span-2">
            <div className="text-[11px] uppercase tracking-wider text-brass mb-2">
              {typeLabel[property.type] || property.type}
            </div>
            <h1 className="font-serif font-medium text-3xl text-ink mb-1">{property.name}</h1>
            <p className="text-muted text-sm mb-6">{property.location}</p>

            {property.description && (
              <p className="text-ink/80 text-[15px] leading-relaxed mb-6">
                {property.description}
              </p>
            )}

            <div className="flex gap-8 text-sm text-muted border-t border-ink/10 pt-5">
              {property.guests_capacity && (
                <div>
                  <span className="text-ink font-medium">{property.guests_capacity}</span> guests
                </div>
              )}
              {property.bedrooms && (
                <div>
                  <span className="text-ink font-medium">{property.bedrooms}</span> bedrooms
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="bg-white border border-ink/10 rounded-xl p-6 sticky top-10">
              {property.price_from && (
                <div className="mb-4">
                  <span className="font-serif text-2xl text-ink">
                    £{Number(property.price_from).toLocaleString()}
                  </span>
                  <span className="text-muted text-sm"> / night from</span>
                </div>
              )}
              <button
                onClick={() =>
                  navigate(`/enquire?property=${property.id}&name=${encodeURIComponent(property.name)}&type=${property.type}`)
                }
                className="w-full bg-forest text-bone rounded-full py-3 text-sm font-medium hover:bg-forestlight transition"
              >
                Enquire about this
              </button>
              <p className="text-xs text-muted text-center mt-3">
                No payment now — we'll confirm availability with you directly.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
