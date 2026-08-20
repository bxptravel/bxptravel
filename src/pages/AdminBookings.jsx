import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const statusLabel = {
  awaiting_deposit: 'Awaiting deposit',
  deposit_submitted: 'Deposit submitted',
  pending_renter_approval: 'Pending renter approval',
  confirmed: 'Confirmed',
  declined: 'Declined',
  balance_submitted: 'Balance submitted',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

function calculateBalanceDueDate(checkInStr) {
  const today = new Date()
  const checkIn = new Date(checkInStr)
  const daysUntilCheckin = Math.ceil((checkIn - today) / (1000 * 60 * 60 * 24))

  if (daysUntilCheckin < 7) {
    return today.toISOString().split('T')[0]
  }

  const approvedPlus14 = new Date(today)
  approvedPlus14.setDate(today.getDate() + 14)

  const checkinMinus7 = new Date(checkIn)
  checkinMinus7.setDate(checkIn.getDate() - 7)

  const dueDate = approvedPlus14 < checkinMinus7 ? approvedPlus14 : checkinMinus7
  return dueDate.toISOString().split('T')[0]
}

const emptyForm = {
  customer_id: '',
  property_id: '',
  check_in: '',
  check_out: '',
  total_price: '',
  enquiry_id: '',
}

export default function AdminBookings() {
  const [bookings, setBookings] = useState([])
  const [properties, setProperties] = useState({})
  const [customers, setCustomers] = useState([])
  const [renters, setRenters] = useState([])
  const [propertyList, setPropertyList] = useState([])
  const [matchingEnquiries, setMatchingEnquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [updating, setUpdating] = useState(null)

  useEffect(() => {
    loadEverything()
  }, [])

  async function loadEverything() {
    setLoading(true)
    await autoCancelOverdue()

    const { data: bookingsData, error: bErr } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })

    if (bErr) setError(bErr.message)
    setBookings(bookingsData || [])

    const propertyIds = [...new Set((bookingsData || []).map((b) => b.property_id))]
    if (propertyIds.length) {
      const { data: propsData } = await supabase
        .from('properties')
        .select('id, name, location')
        .in('id', propertyIds)
      const map = {}
      propsData?.forEach((p) => (map[p.id] = p))
      setProperties(map)
    }

    const { data: customersData } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('role', 'customer')
    setCustomers(customersData || [])

    const { data: rentersData } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('role', 'renter')
    setRenters(rentersData || [])

    const { data: allProps } = await supabase
      .from('properties')
      .select('id, name, location, renter_id')
    setPropertyList(allProps || [])

    setLoading(false)
  }

  async function getProfileEmail(id, cachedList) {
    const cached = cachedList.find((c) => c.id === id)
    if (cached) return cached.email
    if (!id) return null
    const { data } = await supabase.from('profiles').select('email').eq('id', id).single()
    return data?.email || null
  }

  async function sendBookingEmail(type, to, data) {
    try {
      await fetch('/api/send-booking-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, to, data }),
      })
    } catch (err) {
      console.error('Booking email failed:', err)
    }
  }

  async function autoCancelOverdue() {
    const today = new Date().toISOString().split('T')[0]
    await supabase
      .from('bookings')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('status', 'confirmed')
      .lt('balance_due_date', today)
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (field === 'customer_id') {
      loadMatchingEnquiries(value)
    }
  }

  async function loadMatchingEnquiries(customerId) {
    setForm((prev) => ({ ...prev, enquiry_id: '' }))
    const customer = customers.find((c) => c.id === customerId)
    if (!customer) {
      setMatchingEnquiries([])
      return
    }
    const { data } = await supabase
      .from('enquiries')
      .select('id, name, destination, preferred_dates, created_at')
      .eq('email', customer.email)
      .order('created_at', { ascending: false })
    setMatchingEnquiries(data || [])
  }

  async function handleCreateBooking(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const selectedProperty = propertyList.find((p) => p.id === form.property_id)
    const total = parseFloat(form.total_price)
    const deposit = Math.round(total * 0.1 * 100) / 100

    const { error } = await supabase.from('bookings').insert({
      customer_id: form.customer_id,
      property_id: form.property_id,
      renter_id: selectedProperty?.renter_id || null,
      check_in: form.check_in,
      check_out: form.check_out,
      total_price: total,
      deposit_amount: deposit,
      balance_amount: Math.round((total - deposit) * 100) / 100,
      status: 'awaiting_deposit',
      enquiry_id: form.enquiry_id || null,
    })

    setSaving(false)

    if (error) {
      setError(error.message)
    } else {
      const customerEmail = await getProfileEmail(form.customer_id, customers)
      if (customerEmail) {
        sendBookingEmail('deposit_instructions', customerEmail, {
          propertyName: selectedProperty?.name || 'your property',
          checkIn: form.check_in,
          checkOut: form.check_out,
          depositAmount: deposit,
        })
      }
      setModalOpen(false)
      setForm(emptyForm)
      setMatchingEnquiries([])
      loadEverything()
    }
  }

  async function handleApproveOnBehalf(booking) {
    setUpdating(booking.id)
    const balanceDueDate = calculateBalanceDueDate(booking.check_in)
    await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        approved_at: new Date().toISOString(),
        balance_due_date: balanceDueDate,
      })
      .eq('id', booking.id)

    const customerEmail = await getProfileEmail(booking.customer_id, customers)
    const property = properties[booking.property_id]
    if (customerEmail) {
      sendBookingEmail('booking_confirmed', customerEmail, {
        propertyName: property?.name || 'your property',
        checkIn: booking.check_in,
        checkOut: booking.check_out,
        balanceAmount: booking.balance_amount,
        balanceDueDate,
      })
    }

    await loadEverything()
    setUpdating(null)
  }

  async function handleDeclineOnBehalf(booking) {
    if (!confirm('Decline this booking? The customer will be told to expect a refund.')) return
    setUpdating(booking.id)
    await supabase
      .from('bookings')
      .update({ status: 'declined', declined_at: new Date().toISOString() })
      .eq('id', booking.id)

    const customerEmail = await getProfileEmail(booking.customer_id, customers)
    const property = properties[booking.property_id]
    if (customerEmail) {
      sendBookingEmail('booking_declined', customerEmail, {
        propertyName: property?.name || 'your property',
      })
    }

    await loadEverything()
    setUpdating(null)
  }

  async function verifyDeposit(booking) {
    setUpdating(booking.id)
    await supabase
      .from('bookings')
      .update({
        status: 'pending_renter_approval',
        deposit_verified_at: new Date().toISOString(),
      })
      .eq('id', booking.id)

    const property = properties[booking.property_id]

    // Fully sequential, awaited — renter's email completes entirely
    // before the customer's even begins, no shared timing at all.
    const renterEmail = await getProfileEmail(booking.renter_id, renters)
    if (renterEmail) {
      await sendBookingEmail('pending_renter_approval', renterEmail, {
        propertyName: property?.name || 'a property',
        checkIn: booking.check_in,
        checkOut: booking.check_out,
        depositAmount: booking.deposit_amount,
      })
    }

    const customerEmail = await getProfileEmail(booking.customer_id, customers)
    if (customerEmail) {
      await sendBookingEmail('deposit_verified', customerEmail, {
        propertyName: property?.name || 'your property',
        checkIn: booking.check_in,
        checkOut: booking.check_out,
      })
    }

    await loadEverything()
    setUpdating(null)
  }

  async function verifyBalance(booking) {
    setUpdating(booking.id)
    await supabase
      .from('bookings')
      .update({ status: 'completed', balance_verified_at: new Date().toISOString() })
      .eq('id', booking.id)

    const customerEmail = await getProfileEmail(booking.customer_id, customers)
    const renterEmail = await getProfileEmail(booking.renter_id, renters)
    const property = properties[booking.property_id]

    if (customerEmail) {
      sendBookingEmail('booking_completed_customer', customerEmail, {
        propertyName: property?.name || 'your property',
        checkIn: booking.check_in,
        checkOut: booking.check_out,
      })
    }
    if (renterEmail) {
      sendBookingEmail('booking_completed_renter', renterEmail, {
        propertyName: property?.name || 'the property',
        customerEmail: customerEmail || 'the guest',
        checkIn: booking.check_in,
        checkOut: booking.check_out,
      })
    }

    await loadEverything()
    setUpdating(null)
  }

  async function markRefundedAndCancel(booking) {
    if (!confirm("Confirm you've refunded the deposit? This marks the booking as cancelled.")) return
    setUpdating(booking.id)
    await supabase
      .from('bookings')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', booking.id)
    await loadEverything()
    setUpdating(null)
  }

  const inputClass =
    'w-full rounded-lg bg-white border border-ink/15 px-4 py-2.5 text-ink placeholder-muted outline-none focus:border-forest'
  const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif font-medium text-3xl text-ink">Bookings</h1>
          <p className="text-muted text-sm mt-1">Every booking, across every property</p>
        </div>
        <button
          onClick={() => {
            setForm(emptyForm)
            setMatchingEnquiries([])
            setModalOpen(true)
          }}
          className="bg-forest text-bone font-semibold rounded-lg px-5 py-2.5 text-sm hover:bg-forestlight transition"
        >
          + Create booking
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : bookings.length === 0 ? (
        <div className="text-center py-20 text-muted border border-ink/10 rounded-xl bg-white">
          <p className="text-lg mb-1 font-serif text-ink">No bookings yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const property = properties[booking.property_id]
            return (
              <div key={booking.id} className="bg-white border border-ink/10 rounded-xl p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-serif text-xl text-ink">
                      {property?.name || 'Property'}
                    </div>
                    <div className="text-sm text-muted">{property?.location}</div>
                    <div className="text-sm text-muted mt-1">
                      {booking.check_in} → {booking.check_out}
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-ink/5 text-ink border border-ink/10">
                    {statusLabel[booking.status] || booking.status}
                  </span>
                </div>

                <div className="flex gap-8 text-sm text-muted border-t border-ink/10 pt-4 mb-4">
                  <div>
                    Total: <span className="text-ink font-medium">£{booking.total_price}</span>
                  </div>
                  <div>
                    Deposit: <span className="text-ink font-medium">£{booking.deposit_amount}</span>
                  </div>
                  {booking.balance_amount > 0 && (
                    <div>
                      Balance: <span className="text-ink font-medium">£{booking.balance_amount}</span>
                    </div>
                  )}
                  {booking.enquiry_id && (
                    <div className="text-brass">Linked to original enquiry</div>
                  )}
                </div>

                {booking.status === 'pending_renter_approval' && (
                  <div>
                    {!booking.renter_id && (
                      <p className="text-xs text-red-700 mb-2">
                        No renter assigned to this property — you'll need to decide on their
                        behalf, or assign a renter to the property first.
                      </p>
                    )}
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApproveOnBehalf(booking)}
                        disabled={updating === booking.id}
                        className="bg-forest text-bone rounded-full px-5 py-2 text-sm font-medium hover:bg-forestlight transition disabled:opacity-60"
                      >
                        {updating === booking.id ? 'Updating…' : 'Approve (on behalf of renter)'}
                      </button>
                      <button
                        onClick={() => handleDeclineOnBehalf(booking)}
                        disabled={updating === booking.id}
                        className="bg-red-50 text-red-700 rounded-full px-5 py-2 text-sm font-medium hover:bg-red-100 transition disabled:opacity-60"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                )}

                {booking.status === 'deposit_submitted' && (
                  <button
                    onClick={() => verifyDeposit(booking)}
                    disabled={updating === booking.id}
                    className="bg-forest text-bone rounded-full px-5 py-2 text-sm font-medium hover:bg-forestlight transition disabled:opacity-60"
                  >
                    {updating === booking.id ? 'Updating…' : 'Verify deposit & send to renter'}
                  </button>
                )}

                {booking.status === 'balance_submitted' && (
                  <button
                    onClick={() => verifyBalance(booking)}
                    disabled={updating === booking.id}
                    className="bg-forest text-bone rounded-full px-5 py-2 text-sm font-medium hover:bg-forestlight transition disabled:opacity-60"
                  >
                    {updating === booking.id ? 'Updating…' : 'Verify balance & complete'}
                  </button>
                )}

                {booking.status === 'declined' && (
                  <button
                    onClick={() => markRefundedAndCancel(booking)}
                    disabled={updating === booking.id}
                    className="bg-red-50 text-red-700 rounded-full px-5 py-2 text-sm font-medium hover:bg-red-100 transition disabled:opacity-60"
                  >
                    {updating === booking.id ? 'Updating…' : "I've refunded — mark cancelled"}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-5"
          onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}
        >
          <div className="bg-bone border border-ink/10 rounded-xl p-6 w-full max-w-lg">
            <h2 className="font-serif font-medium text-2xl text-ink mb-5">Create booking</h2>

            <form onSubmit={handleCreateBooking} className="space-y-4">
              <div>
                <label className={labelClass}>Customer</label>
                <select
                  required
                  value={form.customer_id}
                  onChange={(e) => updateField('customer_id', e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name || c.email}
                    </option>
                  ))}
                </select>
              </div>

              {matchingEnquiries.length > 0 && (
                <div>
                  <label className={labelClass}>Link to enquiry (optional)</label>
                  <select
                    value={form.enquiry_id}
                    onChange={(e) => updateField('enquiry_id', e.target.value)}
                    className={inputClass}
                  >
                    <option value="">No link</option>
                    {matchingEnquiries.map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.destination || 'General'} · {eq.preferred_dates || 'no dates'} ·{' '}
                        {new Date(eq.created_at).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted mt-1">
                    {matchingEnquiries.length} enquir{matchingEnquiries.length === 1 ? 'y' : 'ies'} found for this customer's email.
                  </p>
                </div>
              )}

              <div>
                <label className={labelClass}>Property</label>
                <select
                  required
                  value={form.property_id}
                  onChange={(e) => updateField('property_id', e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select...</option>
                  {propertyList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.location}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Check-in</label>
                  <input
                    type="date"
                    required
                    value={form.check_in}
                    onChange={(e) => updateField('check_in', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Check-out</label>
                  <input
                    type="date"
                    required
                    value={form.check_out}
                    onChange={(e) => updateField('check_out', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Total price (£)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={form.total_price}
                  onChange={(e) => updateField('total_price', e.target.value)}
                  className={inputClass}
                  placeholder="e.g. 3500"
                />
                <p className="text-xs text-muted mt-1">
                  Deposit (10%) is calculated automatically.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-forest text-bone font-semibold rounded-lg px-6 py-2.5 text-sm hover:bg-forestlight transition disabled:opacity-60"
                >
                  {saving ? 'Creating…' : 'Create booking'}
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="text-muted hover:text-ink text-sm px-4 py-2.5"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
