import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const statusOptions = ['New', 'Quoted', 'Follow Up', 'Booked', 'Dead']
const statusClass = {
  New: 'bg-ink/10 text-ink border border-ink/20',
  Quoted: 'bg-brass/15 text-brass border border-brass/30',
  'Follow Up': 'bg-orange-100 text-orange-700 border border-orange-200',
  Booked: 'bg-forest/10 text-forest border border-forest/25',
  Dead: 'bg-ink/5 text-ink/35 border border-ink/10',
}

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  preferred_contact: 'Email',
  booking_type: '',
  destination: '',
  preferred_dates: '',
  guests: '',
  budget_range: '',
  notes: '',
  status: 'New',
  source: 'Manual',
  commission: '',
  followup_date: '',
  last_contact: '',
}

export default function AdminEnquiries() {
  const navigate = useNavigate()
  const [enquiries, setEnquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadEnquiries()
  }, [])

  async function loadEnquiries() {
    setLoading(true)
    const { data, error } = await supabase
      .from('enquiries')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setEnquiries(data)
    }
    setLoading(false)
  }

  const sources = useMemo(() => {
    const set = new Set(enquiries.map((e) => e.source).filter(Boolean))
    return Array.from(set)
  }, [enquiries])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return enquiries.filter((e) => {
      const matchesSearch =
        !q ||
        (e.name || '').toLowerCase().includes(q) ||
        (e.destination || '').toLowerCase().includes(q) ||
        (e.property_name_snapshot || '').toLowerCase().includes(q)
      const matchesStatus = !statusFilter || e.status === statusFilter
      const matchesSource = !sourceFilter || e.source === sourceFilter
      return matchesSearch && matchesStatus && matchesSource
    })
  }, [enquiries, search, statusFilter, sourceFilter])

  const stats = useMemo(() => {
    const total = enquiries.length
    const booked = enquiries.filter((e) => e.status === 'Booked')
    const active = enquiries.filter((e) => !['Booked', 'Dead'].includes(e.status))
    const commissionEarned = booked.reduce((sum, e) => sum + (parseFloat(e.commission) || 0), 0)
    const pipelineValue = active.reduce((sum, e) => sum + (parseFloat(e.commission) || 0), 0)
    return {
      total,
      activeCount: active.length,
      bookedCount: booked.length,
      conversion: total ? Math.round((booked.length / total) * 100) : 0,
      commissionEarned,
      pipelineValue,
    }
  }, [enquiries])

  const dueFollowUps = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return enquiries.filter(
      (e) => e.followup_date && e.followup_date <= today && !['Booked', 'Dead'].includes(e.status)
    )
  }, [enquiries])

  function openNewModal() {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEditModal(enquiry) {
    setEditingId(enquiry.id)
    setForm({
      name: enquiry.name || '',
      email: enquiry.email || '',
      phone: enquiry.phone || '',
      preferred_contact: enquiry.preferred_contact || 'Email',
      booking_type: enquiry.booking_type || '',
      destination: enquiry.destination || enquiry.property_name_snapshot || '',
      preferred_dates: enquiry.preferred_dates || '',
      guests: enquiry.guests || '',
      budget_range: enquiry.budget_range || '',
      notes: enquiry.notes || '',
      status: enquiry.status || 'New',
      source: enquiry.source || 'Manual',
      commission: enquiry.commission || '',
      followup_date: enquiry.followup_date || '',
      last_contact: enquiry.last_contact || '',
    })
    setModalOpen(true)
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      preferred_contact: form.preferred_contact,
      booking_type: form.booking_type || null,
      destination: form.destination,
      preferred_dates: form.preferred_dates,
      guests: form.guests ? parseInt(form.guests) : null,
      budget_range: form.budget_range,
      notes: form.notes,
      status: form.status,
      source: form.source,
      commission: form.commission ? parseFloat(form.commission) : null,
      followup_date: form.followup_date || null,
      last_contact: form.last_contact || new Date().toISOString().split('T')[0],
    }

    let saveError
    if (editingId) {
      const { error } = await supabase.from('enquiries').update(payload).eq('id', editingId)
      saveError = error
    } else {
      const { error } = await supabase.from('enquiries').insert(payload)
      saveError = error
    }

    setSaving(false)

    if (saveError) {
      setError(saveError.message)
    } else {
      setModalOpen(false)
      loadEnquiries()
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this enquiry? This can\'t be undone.')) return
    const { error } = await supabase.from('enquiries').delete().eq('id', id)
    if (!error) {
      setEnquiries((prev) => prev.filter((e) => e.id !== id))
    }
  }

  function exportCSV() {
    const headers = [
      'Name', 'Email', 'Phone', 'Destination', 'Dates', 'Guests', 'Budget',
      'Commission', 'Source', 'Status', 'Follow-up', 'Notes', 'Created',
    ]
    const rows = enquiries.map((e) => [
      e.name, e.email, e.phone, e.destination || e.property_name_snapshot,
      e.preferred_dates, e.guests, e.budget_range,
      e.commission ? `£${e.commission}` : '', e.source, e.status,
      e.followup_date, e.notes, e.created_at?.split('T')[0],
    ].map((v) => `"${(v ?? '').toString().replace(/"/g, '""')}"`))

    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'BXP-Travel-Enquiries.csv'
    a.click()
  }

  const inputClass =
    'w-full rounded-lg bg-white border border-ink/15 px-4 py-2.5 text-ink placeholder-muted outline-none focus:border-forest'
  const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif font-medium text-3xl text-ink">Enquiries</h1>
          <p className="text-muted text-sm mt-1">Every enquiry submitted from the site</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="bg-ink/5 hover:bg-ink/10 text-ink rounded-lg px-4 py-2.5 text-sm border border-ink/15 transition"
          >
            Export CSV
          </button>
          <button
            onClick={openNewModal}
            className="bg-forest text-bone font-semibold rounded-lg px-5 py-2.5 text-sm hover:bg-forestlight transition"
          >
            + New enquiry
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        <div className="bg-white border border-ink/10 rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-wider text-muted mb-1">Total</div>
          <div className="font-serif text-2xl text-ink">{stats.total}</div>
        </div>
        <div className="bg-white border border-ink/10 rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-wider text-muted mb-1">Active pipeline</div>
          <div className="font-serif text-2xl text-ink">{stats.activeCount}</div>
        </div>
        <div className="bg-white border border-ink/10 rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-wider text-muted mb-1">Bookings</div>
          <div className="font-serif text-2xl text-ink">{stats.bookedCount}</div>
          <div className="text-[11px] text-muted">{stats.conversion}% conversion</div>
        </div>
        <div className="bg-white border border-ink/10 rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-wider text-muted mb-1">Commission earned</div>
          <div className="font-serif text-2xl text-forest">£{stats.commissionEarned.toLocaleString()}</div>
        </div>
        <div className="bg-white border border-ink/10 rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-wider text-muted mb-1">Pipeline value</div>
          <div className="font-serif text-2xl text-ink">£{stats.pipelineValue.toLocaleString()}</div>
        </div>
      </div>

      {dueFollowUps.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 mb-4 text-sm text-orange-800 flex items-center gap-2">
          🔔 {dueFollowUps.length} enquir{dueFollowUps.length === 1 ? 'y' : 'ies'} overdue for follow-up
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or destination"
          className="bg-white border border-ink/15 rounded-lg px-4 py-2 text-sm text-ink placeholder-muted outline-none min-w-[220px]"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-ink/15 rounded-lg px-3 py-2 text-sm text-ink outline-none"
        >
          <option value="">All statuses</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="bg-white border border-ink/15 rounded-lg px-3 py-2 text-sm text-ink outline-none"
        >
          <option value="">All sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted border border-ink/10 rounded-xl bg-white">
          <p className="text-lg mb-1 font-serif text-ink">No enquiries yet</p>
          <p className="text-sm">They'll show up here as guests submit them</p>
        </div>
      ) : (
        <div className="bg-white border border-ink/10 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink/5 text-[10px] uppercase tracking-wider text-muted">
              <tr>
                <th className="text-left px-4 py-3">Name / contact</th>
                <th className="text-left px-4 py-3">Destination</th>
                <th className="text-left px-4 py-3">Dates</th>
                <th className="text-left px-4 py-3">Guests</th>
                <th className="text-left px-4 py-3">Source</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Follow-up</th>
                <th className="text-left px-4 py-3"></th>
                <th className="text-left px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr
                  key={e.id}
                  onClick={() => openEditModal(e)}
                  className="border-t border-ink/5 hover:bg-ink/5 cursor-pointer transition"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{e.name}</div>
                    <div className="text-xs text-muted">{e.email}</div>
                  </td>
                  <td className="px-4 py-3 text-ink">{e.destination || e.property_name_snapshot || '—'}</td>
                  <td className="px-4 py-3 text-ink">{e.preferred_dates || '—'}</td>
                  <td className="px-4 py-3 text-ink">{e.guests || '—'}</td>
                  <td className="px-4 py-3 text-muted">{e.source || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${statusClass[e.status] || ''}`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{e.followup_date || '—'}</td>
                  <td className="px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
                    <button
                      onClick={() => navigate(`/admin/enquiries/${e.id}/draft`)}
                      className="text-xs text-forest hover:underline"
                    >
                      Draft Email
                    </button>
                  </td>
                  <td className="px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
                    <button
                      onClick={() => handleDelete(e.id)}
                      className="text-xs text-red-700 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-5"
          onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}
        >
          <div className="bg-bone border border-ink/10 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="font-serif font-medium text-2xl text-ink mb-5">
              {editingId ? 'Edit enquiry' : 'New enquiry'}
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Name</label>
                  <input required value={form.name} onChange={(e) => updateField('name', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input value={form.email} onChange={(e) => updateField('email', e.target.value)} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Phone</label>
                  <input value={form.phone} onChange={(e) => updateField('phone', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Preferred contact</label>
                  <select value={form.preferred_contact} onChange={(e) => updateField('preferred_contact', e.target.value)} className={inputClass}>
                    <option>Email</option>
                    <option>Phone</option>
                    <option>WhatsApp</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Destination</label>
                  <input value={form.destination} onChange={(e) => updateField('destination', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Dates</label>
                  <input value={form.preferred_dates} onChange={(e) => updateField('preferred_dates', e.target.value)} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Guests</label>
                  <input type="number" value={form.guests} onChange={(e) => updateField('guests', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Budget</label>
                  <input value={form.budget_range} onChange={(e) => updateField('budget_range', e.target.value)} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Status</label>
                  <select value={form.status} onChange={(e) => updateField('status', e.target.value)} className={inputClass}>
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Source</label>
                  <input value={form.source} onChange={(e) => updateField('source', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Commission (£)</label>
                  <input type="number" value={form.commission} onChange={(e) => updateField('commission', e.target.value)} className={inputClass} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Follow-up date</label>
                <input type="date" value={form.followup_date} onChange={(e) => updateField('followup_date', e.target.value)} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Notes</label>
                <textarea value={form.notes} onChange={(e) => updateField('notes', e.target.value)} className={inputClass} rows={3} />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-forest text-bone font-semibold rounded-lg px-6 py-2.5 text-sm hover:bg-forestlight transition disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save'}
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
