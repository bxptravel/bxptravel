import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function generateDraft(enquiry, property) {
  const firstName = (enquiry.name || '').split(' ')[0] || 'there'
  const propertyName = property?.name || enquiry.property_name_snapshot || enquiry.destination || 'your enquiry'
  const location = property?.location || enquiry.destination || ''

  let introLine
  if (property) {
    introLine = `We had a look and I'm pleased to say we can make this happen for you. It's one of our favourites${
      location ? ` in ${location}` : ''
    } that can comfortably accommodate up to ${property.guests_capacity || 'several'} guests.`
  } else {
    introLine = `We've had a look into${
      location ? ` ${location}` : ' this'
    } and we're confident we can find the right option for you.`
  }

  const guestsLine = enquiry.guests
    ? `${enquiry.guests}`
    : `We need to know the full number of guests you are enquiring about`

  let priceLine
  if (property?.price_from && property?.guests_capacity) {
    const perPerson = Math.round(property.price_from / property.guests_capacity)
    priceLine = `£${perPerson} per person, per night`
  } else if (enquiry.budget_range) {
    priceLine = `${enquiry.budget_range} (as per your enquiry — we'll confirm exact pricing shortly)`
  } else {
    priceLine = `To be confirmed`
  }

  const whatsappLine =
    enquiry.preferred_contact === 'WhatsApp'
      ? ''
      : ` Please also confirm that you would rather be contacted via WhatsApp.`

  return `Hi ${firstName},

Thanks for reaching out to BXP Travel — I wanted to follow up personally on your enquiry for ${propertyName}${
    location && !property ? ` in ${location}` : ''
  }.

${introLine}

A few quick details to confirm before we lock everything in:

Dates: ${enquiry.preferred_dates || 'To be confirmed'}
Guests: ${guestsLine}
Total price: ${priceLine}

Please kindly respond and confirm all details in order for us to proceed with the booking enquiry.${whatsappLine}

Any questions at all, we're right here. Looking forward to getting this sorted for you!

Kind regards,

Customer Relations Team
BXP Travel Ltd
124 City Road | EC1V 2NX
bxptravel.com | (+44) 7507723650`
}

export default function AdminEnquiryDraft() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [enquiry, setEnquiry] = useState(null)
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadData()
  }, [id])

  async function loadData() {
    setLoading(true)
    const { data: enquiryData } = await supabase
      .from('enquiries')
      .select('*')
      .eq('id', id)
      .single()

    setEnquiry(enquiryData)

    if (enquiryData?.property_id) {
      const { data: propertyData } = await supabase
        .from('properties')
        .select('name, location, guests_capacity, price_from')
        .eq('id', enquiryData.property_id)
        .single()
      setProperty(propertyData)
    }

    setLoading(false)
  }

  async function handleCopy(text) {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return <p className="text-muted">Loading…</p>
  }

  if (!enquiry) {
    return <p className="text-muted">Enquiry not found.</p>
  }

  const draft = generateDraft(enquiry, property)
  const subject = 'BXP TRAVEL: Booking Enquiry'

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => navigate('/admin/enquiries')}
        className="text-sm text-muted hover:text-ink mb-4 transition"
      >
        ← Back to enquiries
      </button>

      <h1 className="font-serif font-medium text-3xl text-ink mb-1">Draft follow-up email</h1>
      <p className="text-muted text-sm mb-6">
        For {enquiry.name} — {enquiry.email}
      </p>

      <div className="bg-white border border-ink/10 rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted">
            Subject
          </label>
          <button
            onClick={() => handleCopy(subject)}
            className="text-xs text-forest hover:underline"
          >
            Copy
          </button>
        </div>
        <p className="text-sm text-ink">{subject}</p>
      </div>

      <div className="bg-white border border-ink/10 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted">
            Email body
          </label>
          <button
            onClick={() => handleCopy(draft)}
            className="bg-forest text-bone rounded-full px-4 py-1.5 text-xs font-medium hover:bg-forestlight transition"
          >
            {copied ? 'Copied!' : 'Copy email body'}
          </button>
        </div>
        <pre className="text-sm text-ink whitespace-pre-wrap font-body leading-relaxed">
          {draft}
        </pre>
      </div>

      {!enquiry.guests && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mt-4">
          This enquiry doesn't have a guest count on file, so the draft includes a line asking
          for it.
        </p>
      )}
    </div>
  )
}
