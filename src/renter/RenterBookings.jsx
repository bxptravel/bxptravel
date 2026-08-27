import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../AuthContext'

const ADMIN_EMAIL = 'travelbxp@gmail.com'

const statusLabel = {
  pending_renter_approval: 'Awaiting your decision',
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

export default function RenterBookings() {
  const { session } = useAuth()
  const [bookings, setBookings] = useState([])
  const [properties, setProperties] = useState({})
  const [customers, setCustomers] = useState({})
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)

  useEffect(() => {
    loadData()
  }, [session])

  async function loadData() {
    if (!session) return
    setLoading(true)

    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('*')
      .eq('renter_id', session.user.id)
      .not('status', 'eq', 'awaiting_deposit')
      .not('status', 'eq', 'deposit_submitted')
      .order('created_at', { ascending: false })

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

    const customerIds = [...new Set((bookingsData || []).map((b) => b.customer_id))]
    if (customerIds.length) {
      const { data: customersData } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', customerIds)

      const cMap = {}
      customersData?.forEach((c) => (cMap[c.id] = c))
      setCustomers(cMap)
    }

    setLoading(false)
  }

  async function getCustomerEmail(id) {
    if (customers[id]) return customers[id].email
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

  async function handleApprove(booking) {
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

    const customerEmail = await getCustomerEmail(booking.customer_id)
    const property = properties[booking.property_id]
    if (customerEmail) {
      await sendBookingEmail('booking_confirmed', customerEmail, {
        propertyName: property?.name || 'your property',
        checkIn: booking.check_in,
        checkOut: booking.check_out,
        balanceAmount: booking.balance_amount,
        balanceDueDate,
      })
    }

    await loadData()
    setUpdating(null)
  }

  async function handleDecline(booking) {
    if (!confirm('Decline this booking? The customer will be told to expect a refund.')) return
    setUpdating(booking.id)

    await supabase
      .from('bookings')
      .update({ status: 'declined', declined_at: new Date().toISOString() })
      .eq('id', booking.id)

    const customerEmail = await getCustomerEmail(booking.customer_id)
    const property = properties[booking.property_id]
    if (customerEmail) {
      await sendBookingEmail('booking_declined', customerEmail, {
        propertyName: property?.name || 'your property',
      })
      await sendBookingEmail('booking_declined_admin', ADMIN_EMAIL, {
        propertyName: property?.name || 'a property',
        customerEmail: customerEmail,
      })
    }

    await loadData()
    setUpdating(null)
  }

  if (loading) {
    return <p className="text-muted">Loading…</p>
  }

  return (
    <div>
      <h1 className="font-serif font-medium text-3xl text-ink mb-2">Bookings</h1>
      <p className="text-muted text-sm mb-6">
        Requests for your properties, ready for your decision
      </p>

      {bookings.length === 0 ? (
        <div className="text-center py-20 text-muted border border-ink/10 rounded-xl bg-white">
          <p className="text-lg mb-1 font-serif text-ink">No bookings yet</p>
          <p className="text-sm">Requests will show up here once a deposit is verified</p>
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
                    Deposit received:{' '}
                    <span className="text-ink font-medium">£{booking.deposit_amount}</span>
                  </div>
                </div>

                {booking.status === 'pending_renter_approval' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(booking)}
                      disabled={updating === booking.id}
                      className="bg-forest text-bone rounded-full px-5 py-2 text-sm font-medium hover:bg-forestlight transition disabled:opacity-60"
                    >
                      {updating === booking.id ? 'Updating…' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleDecline(booking)}
                      disabled={updating === booking.id}
                      className="bg-red-50 text-red-700 rounded-full px-5 py-2 text-sm font-medium hover:bg-red-100 transition disabled:opacity-60"
                    >
                      Decline
                    </button>
                  </div>
                )}

                {booking.status === 'confirmed' && (
                  <p className="text-sm text-muted">
                    Balance due from customer by{' '}
                    <span className="text-ink font-medium">{booking.balance_due_date}</span>
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
