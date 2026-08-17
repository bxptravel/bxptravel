import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../AuthContext'

const statusLabel = {
  awaiting_deposit: 'Awaiting deposit',
  deposit_submitted: 'Deposit submitted — verifying',
  pending_renter_approval: 'Pending approval',
  confirmed: 'Confirmed',
  declined: 'Declined',
  balance_submitted: 'Balance submitted — verifying',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export default function CustomerBookings() {
  const { session } = useAuth()
  const [bookings, setBookings] = useState([])
  const [properties, setProperties] = useState({})
  const [bankDetails, setBankDetails] = useState('')
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
      .eq('customer_id', session.user.id)
      .order('created_at', { ascending: false })

    setBookings(bookingsData || [])

    const propertyIds = [...new Set((bookingsData || []).map((b) => b.property_id))]
    if (propertyIds.length) {
      const { data: propsData } = await supabase
        .from('properties')
        .select('id, name, location, cover_photo')
        .in('id', propertyIds)

      const map = {}
      propsData?.forEach((p) => (map[p.id] = p))
      setProperties(map)
    }

    const { data: settings } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'bank_details')
      .single()

    setBankDetails(settings?.value || '')
    setLoading(false)
  }

  async function markDepositSent(booking) {
    setUpdating(booking.id)
    await supabase
      .from('bookings')
      .update({ status: 'deposit_submitted', deposit_submitted_at: new Date().toISOString() })
      .eq('id', booking.id)
    await loadData()
    setUpdating(null)
  }

  async function markBalanceSent(booking) {
    setUpdating(booking.id)
    await supabase
      .from('bookings')
      .update({ status: 'balance_submitted', balance_submitted_at: new Date().toISOString() })
      .eq('id', booking.id)
    await loadData()
    setUpdating(null)
  }

  if (loading) {
    return <p className="text-muted">Loading…</p>
  }

  return (
    <div>
      <h1 className="font-serif font-medium text-3xl text-ink mb-6">My Bookings</h1>

      {bookings.length === 0 ? (
        <div className="text-center py-20 text-muted border border-ink/10 rounded-xl bg-white">
          <p className="text-lg mb-1 font-serif text-ink">No bookings yet</p>
          <p className="text-sm">Once a booking is set up for you, it'll appear here.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {bookings.map((booking) => {
            const property = properties[booking.property_id]
            return (
              <div key={booking.id} className="bg-white border border-ink/10 rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
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
                    Deposit:{' '}
                    <span className="text-ink font-medium">£{booking.deposit_amount}</span>
                  </div>
                  {booking.balance_amount > 0 && (
                    <div>
                      Balance:{' '}
                      <span className="text-ink font-medium">£{booking.balance_amount}</span>
                    </div>
                  )}
                </div>

                {booking.status === 'awaiting_deposit' && (
                  <div className="bg-ink/[0.03] rounded-lg p-4">
                    <p className="text-sm text-ink mb-2">
                      Send your deposit of <strong>£{booking.deposit_amount}</strong> using the
                      details below, then confirm once sent:
                    </p>
                    <pre className="text-xs text-muted whitespace-pre-wrap font-body mb-3">
                      {bankDetails}
                    </pre>
                    <button
                      onClick={() => markDepositSent(booking)}
                      disabled={updating === booking.id}
                      className="bg-forest text-bone rounded-full px-5 py-2 text-sm font-medium hover:bg-forestlight transition disabled:opacity-60"
                    >
                      {updating === booking.id ? 'Updating…' : "I've sent the deposit"}
                    </button>
                  </div>
                )}

                {booking.status === 'confirmed' && booking.balance_amount > 0 && (
                  <div className="bg-ink/[0.03] rounded-lg p-4">
                    <p className="text-sm text-ink mb-2">
                      Your booking is confirmed. Balance of{' '}
                      <strong>£{booking.balance_amount}</strong> is due by{' '}
                      <strong>{booking.balance_due_date}</strong>.
                    </p>
                    <pre className="text-xs text-muted whitespace-pre-wrap font-body mb-3">
                      {bankDetails}
                    </pre>
                    <button
                      onClick={() => markBalanceSent(booking)}
                      disabled={updating === booking.id}
                      className="bg-forest text-bone rounded-full px-5 py-2 text-sm font-medium hover:bg-forestlight transition disabled:opacity-60"
                    >
                      {updating === booking.id ? 'Updating…' : "I've sent the balance"}
                    </button>
                  </div>
                )}

                {booking.status === 'declined' && (
                  <p className="text-sm text-muted">
                    This booking wasn't approved. Your deposit will be refunded — we'll be in
                    touch.
                  </p>
                )}

                {booking.status === 'completed' && (
                  <p className="text-sm text-forest font-medium">
                    All paid — we can't wait to host you!
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
