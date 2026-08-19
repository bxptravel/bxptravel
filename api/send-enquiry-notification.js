import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const ADMIN_EMAIL = 'travelbxp@gmail.com'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { name, email, phone, preferred_contact, destination, preferred_dates, guests, budget_range, notes } = req.body

  try {
    await resend.emails.send({
      from: 'BXP Travel <enquiries@bxptravel.com>',
      to: ADMIN_EMAIL,
      subject: `New enquiry: ${name}`,
      html: `
        <h2>New enquiry received</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || '—'}</p>
        <p><strong>Preferred contact:</strong> ${preferred_contact || '—'}</p>
        <p><strong>Destination / property:</strong> ${destination || '—'}</p>
        <p><strong>Dates:</strong> ${preferred_dates || '—'}</p>
        <p><strong>Guests:</strong> ${guests || '—'}</p>
        <p><strong>Budget:</strong> ${budget_range || '—'}</p>
        <p><strong>Notes:</strong> ${notes || '—'}</p>
      `,
    })

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Resend error:', error)
    return res.status(500).json({ error: 'Failed to send email' })
  }
}
