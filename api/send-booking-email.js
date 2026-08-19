import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'BXP Travel Bookings <bookings@bxptravel.com>'
const SITE_URL = 'https://bxptravel.com'

const templates = {
  deposit_instructions: (d) => ({
    subject: `Your BXP Travel booking — deposit required`,
    html: `
      <h2>A booking has been set up for you</h2>
      <p><strong>${d.propertyName}</strong></p>
      <p>${d.checkIn} → ${d.checkOut}</p>
      <p>A deposit of <strong>£${d.depositAmount}</strong> is required to move forward.</p>
      <p>Log in to your account to view payment details and confirm once you've sent it:</p>
      <p><a href="${SITE_URL}/account/login">${SITE_URL}/account/login</a></p>
    `,
  }),

  deposit_submitted: (d) => ({
    subject: `Deposit marked as sent — ${d.propertyName}`,
    html: `
      <h2>Deposit submitted for verification</h2>
      <p><strong>${d.customerEmail}</strong> has marked their deposit as sent.</p>
      <p><strong>Property:</strong> ${d.propertyName}</p>
      <p><strong>Amount:</strong> £${d.depositAmount}</p>
      <p>Please verify in the admin panel once received.</p>
    `,
  }),

  deposit_verified: (d) => ({
    subject: `Deposit verified — ${d.propertyName}`,
    html: `
      <h2>Your deposit has been verified</h2>
      <p><strong>${d.propertyName}</strong></p>
      <p>${d.checkIn} → ${d.checkOut}</p>
      <p>We've received and verified your deposit. Your request has now been sent to the
      property owner — we'll let you know as soon as it's approved.</p>
    `,
  }),

  pending_renter_approval: (d) => ({
    subject: `New booking request — ${d.propertyName}`,
    html: `
      <h2>A booking request needs your decision</h2>
      <p><strong>${d.propertyName}</strong></p>
      <p>${d.checkIn} → ${d.checkOut}</p>
      <p>Deposit received: £${d.depositAmount}</p>
      <p>Log in to approve or decline:</p>
      <p><a href="${SITE_URL}/renter/login">${SITE_URL}/renter/login</a></p>
    `,
  }),

  booking_confirmed: (d) => ({
    subject: `Your booking is confirmed! — ${d.propertyName}`,
    html: `
      <h2>Great news — your booking is confirmed</h2>
      <p><strong>${d.propertyName}</strong></p>
      <p>${d.checkIn} → ${d.checkOut}</p>
      <p>Balance of <strong>£${d.balanceAmount}</strong> is due by <strong>${d.balanceDueDate}</strong>.</p>
      <p>Log in to your account to view payment details:</p>
      <p><a href="${SITE_URL}/account/login">${SITE_URL}/account/login</a></p>
    `,
  }),

  booking_declined: (d) => ({
    subject: `Update on your booking — ${d.propertyName}`,
    html: `
      <h2>Booking update</h2>
      <p>Unfortunately your booking request for <strong>${d.propertyName}</strong> wasn't
      approved this time.</p>
      <p>Your deposit will be refunded — we'll be in touch shortly.</p>
    `,
  }),

  booking_declined_admin: (d) => ({
    subject: `Booking declined — ${d.propertyName}`,
    html: `
      <h2>A booking was declined</h2>
      <p><strong>Property:</strong> ${d.propertyName}</p>
      <p><strong>Customer:</strong> ${d.customerEmail}</p>
      <p>Please process the deposit refund and mark it as refunded in admin.</p>
    `,
  }),

  balance_submitted: (d) => ({
    subject: `Balance marked as sent — ${d.propertyName}`,
    html: `
      <h2>Balance submitted for verification</h2>
      <p><strong>${d.customerEmail}</strong> has marked their balance as sent.</p>
      <p><strong>Property:</strong> ${d.propertyName}</p>
      <p><strong>Amount:</strong> £${d.balanceAmount}</p>
      <p>Please verify in the admin panel once received.</p>
    `,
  }),

  booking_completed_customer: (d) => ({
    subject: `You're all set! — ${d.propertyName}`,
    html: `
      <h2>Payment complete — you're all set</h2>
      <p><strong>${d.propertyName}</strong></p>
      <p>${d.checkIn} → ${d.checkOut}</p>
      <p>We can't wait to host you!</p>
    `,
  }),

  booking_completed_renter: (d) => ({
    subject: `Booking fully paid — ${d.propertyName}`,
    html: `
      <h2>Booking complete</h2>
      <p><strong>Property:</strong> ${d.propertyName}</p>
      <p><strong>Guest:</strong> ${d.customerEmail}</p>
      <p>${d.checkIn} → ${d.checkOut}</p>
      <p>Full payment has been received and verified.</p>
    `,
  }),
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { type, to, data } = req.body

  const template = templates[type]
  if (!template || !to) {
    return res.status(400).json({ error: 'Invalid type or missing recipient' })
  }

  try {
    const { subject, html } = template(data || {})
    await resend.emails.send({ from: FROM, to, subject, html })
    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Resend error:', error)
    return res.status(500).json({ error: 'Failed to send email' })
  }
}
