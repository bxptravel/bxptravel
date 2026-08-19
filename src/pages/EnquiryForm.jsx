import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import Logo from '../components/Logo'

const typeLabel = { villa: 'Villas', apartment: 'Apartments', yacht: 'Yachts' }

export default function EnquiryForm() {
  const [searchParams] = useSearchParams()
  const propertyId = searchParams.get('property')
  const propertyName = searchParams.get('name')
  const propertyType = searchParams.get('type')

  const [properties, setProperties] = useState([])
  const [propertySelection, setPropertySelection] = useState('')

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    preferred_contact: 'Email',
    destination: '',
    preferred_dates: '',
    flexible_dates: '',
    guests: '',
    budget_range: '',
    notes: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!propertyName) loadProperties()
  }, [])

  async function loadProperties() {
    const { data } = await supabase
      .from('properties')
      .select('id, name, type')
      .eq('status', 'active')
      .order('name', { ascending: true })
    setProperties(data || [])
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const groupedProperties = properties.reduce((acc, p) => {
    acc[p.type] = acc[p.type] || []
    acc[p.type].push(p)
    return acc
  }, {})

  const selectedProperty = properties.find((p) => p.id === propertySelection)
  const isGeneral = propertySelection === 'general'

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const finalPropertyId = propertyId || (selectedProperty ? selectedProperty.id : null)
    const finalPropertyName = propertyName || (selectedProperty ? selectedProperty.name : null)
    const finalBookingType = propertyType || (selectedProperty ? selectedProperty.type : null)
    const finalDestination = form.destination || finalPropertyName || null

    const notesWithFlex = form.flexible_dates
      ? `${form.notes ? form.notes + '\n\n' : ''}Flexible on dates: ${form.flexible_dates}`
      : form.notes

    const { error } = await supabase.from('enquiries').insert({
      property_id: finalPropertyId,
      property_name_snapshot: finalPropertyName,
      name: form.name,
      email: form.email,
      phone: form.phone,
      preferred_contact: form.preferred_contact,
      booking_type: finalBookingType,
      destination: finalDestination,
      preferred_dates: form.preferred_dates,
      guests: form.guests ? parseInt(form.guests) : null,
      budget_range: form.budget_range,
      notes: notesWithFlex,
      status: 'New',
      source: 'Website',
    })

    setSubmitting(false)

    if (error) {
      setError('Something went wrong sending your enquiry. Please try again.')
    } else {
      setSubmitted(true)

      fetch('/api/send-enquiry-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          preferred_contact: form.preferred_contact,
          destination: finalDestination,
          preferred_dates: form.preferred_dates,
          guests: form.guests,
          budget_range: form.budget_range,
          notes: notesWithFlex,
        }),
      }).catch((err) => console.error('Notification email failed:', err))
    }
  }

  const inputClass =
    'w-full rounded-lg bg-white border border-ink/15 px-4 py-2.5 text-ink placeholder-muted outline-none focus:border-forest'
  const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5'

  if (submitted) {
    return (
      <div className="min-h-screen bg-bone flex flex-col items-center justify-center text-center px-6 font-body">
        <p className="font-serif text-3xl text-ink mb-2">Enquiry sent</p>
        <p className="text-muted text-sm max-w-sm mb-6">
          We've received your enquiry and will be in touch shortly to confirm availability.
        </p>
        <Link to="/" className="text-forest font-medium text-sm hover:underline">
          Back to the collection
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bone font-body">
      <header className="max-w-2xl mx-auto px-8 pt-10 pb-6 flex items-center justify-between">
        <Link to="/">
          <Logo />
        </Link>
        <Link to="/" className="text-sm text-muted hover:text-ink transition">
          Back to collection
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-8 pb-20">
        <h1 className="font-serif font-medium text-3xl text-ink mb-1">Make an enquiry</h1>
        <p className="text-muted text-sm mb-8">
          {propertyName
            ? `Tell us a little more and we'll check availability for ${propertyName}.`
            : "Tell us what you're after and we'll find the right option for you."}
        </p>

        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-5">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Full name</label>
              <input
                required
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                className={inputClass}
                placeholder="Enter Name"
              />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                className={inputClass}
                placeholder="Email Address"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Phone number</label>
              <input
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                className={inputClass}
                placeholder="+44 7700 900000"
              />
            </div>
            <div>
              <label className={labelClass}>Preferred contact</label>
              <select
                value={form.preferred_contact}
                onChange={(e) => updateField('preferred_contact', e.target.value)}
                className={inputClass}
              >
                <option>Email</option>
                <option>Phone</option>
                <option>WhatsApp</option>
              </select>
            </div>
          </div>

          {!propertyName && (
            <div>
              <label className={labelClass}>What are you enquiring about</label>
              <select
                value={propertySelection}
                onChange={(e) => setPropertySelection(e.target.value)}
                className={inputClass}
              >
                <option value="">Select...</option>
                <option value="general">General booking enquiry (not listed)</option>
                {Object.entries(groupedProperties).map(([type, props]) => (
                  <optgroup key={type} label={typeLabel[type] || type}>
                    {props.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          )}

          {!propertyName && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Number of guests</label>
                <input
                  type="number"
                  min="1"
                  value={form.guests}
                  onChange={(e) => updateField('guests', e.target.value)}
                  className={inputClass}
                  placeholder="e.g. 8"
                />
              </div>
              <div>
                <label className={labelClass}>Destination in mind</label>
                <input
                  value={form.destination}
                  onChange={(e) => updateField('destination', e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Ibiza"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Preferred dates</label>
              <input
                value={form.preferred_dates}
                onChange={(e) => updateField('preferred_dates', e.target.value)}
                className={inputClass}
                placeholder="e.g. 14–21 Aug"
              />
            </div>
            <div>
              <label className={labelClass}>Flexible on dates?</label>
              <select
                value={form.flexible_dates}
                onChange={(e) => updateField('flexible_dates', e.target.value)}
                className={inputClass}
              >
                <option value="">Select...</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Budget (per person/per night)</label>
            <input
              value={form.budget_range}
              onChange={(e) => updateField('budget_range', e.target.value)}
              className={inputClass}
              placeholder="e.g. £200–£300"
            />
          </div>

          <div>
            <label className={labelClass}>Anything else we should know</label>
            <textarea
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              className={inputClass}
              rows={4}
              placeholder="Special requests, occasion..."
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-forest text-bone rounded-full py-3 text-sm font-medium hover:bg-forestlight transition disabled:opacity-60"
          >
            {submitting ? 'Sending…' : 'Send enquiry'}
          </button>
        </form>
      </main>
    </div>
  )
}
