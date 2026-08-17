import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const emptyForm = {
  name: '',
  location: '',
  type: 'villa',
  description: '',
  guests_capacity: '',
  bedrooms: '',
  price_from: '',
  currency: 'GBP',
  status: 'active',
  featured: false,
  renter_id: '',
}

export default function PropertyForm() {
  const { id } = useParams()
  const isEditing = Boolean(id)
  const navigate = useNavigate()

  const [form, setForm] = useState(emptyForm)
  const [photos, setPhotos] = useState([]) // existing photo URLs
  const [blockedDates, setBlockedDates] = useState([]) // [{start, end}]
  const [newRangeStart, setNewRangeStart] = useState('')
  const [newRangeEnd, setNewRangeEnd] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(isEditing)
  const [renters, setRenters] = useState([])

  useEffect(() => {
    loadRenters()
  }, [])

  async function loadRenters() {
    const { data } = await supabase.from('profiles').select('id, email, full_name').eq('role', 'renter')
    setRenters(data || [])
  }

  useEffect(() => {
    if (isEditing) loadProperty()
  }, [id])

  async function loadProperty() {
    const { data, error } = await supabase.from('properties').select('*').eq('id', id).single()
    if (error) {
      setError(error.message)
    } else {
      setForm({
        name: data.name || '',
        location: data.location || '',
        type: data.type || 'villa',
        description: data.description || '',
        guests_capacity: data.guests_capacity || '',
        bedrooms: data.bedrooms || '',
        price_from: data.price_from || '',
        currency: data.currency || 'GBP',
        status: data.status || 'active',
        featured: data.featured || false,
        renter_id: data.renter_id || '',
      })
      setPhotos(data.photos || [])
      setBlockedDates(data.blocked_dates || [])
    }
    setLoading(false)
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handlePhotoUpload(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return

    setUploading(true)
    setError('')

    const uploadedUrls = []

    for (const file of files) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
      const filePath = fileName

      const { error: uploadError } = await supabase.storage
        .from('property-photos')
        .upload(filePath, file)

      if (uploadError) {
        setError(`Upload failed for ${file.name}: ${uploadError.message}`)
        continue
      }

      const { data } = supabase.storage.from('property-photos').getPublicUrl(filePath)
      uploadedUrls.push(data.publicUrl)
    }

    setPhotos((prev) => [...prev, ...uploadedUrls])
    setUploading(false)
    e.target.value = '' // reset file input
  }

  function removePhoto(url) {
    setPhotos((prev) => prev.filter((p) => p !== url))
  }

  function setCoverPhoto(url) {
    // Move selected photo to front of array — front = cover
    setPhotos((prev) => [url, ...prev.filter((p) => p !== url)])
  }

  function addBlockedRange() {
    if (!newRangeStart || !newRangeEnd) return
    if (newRangeEnd < newRangeStart) return
    setBlockedDates((prev) => [...prev, { start: newRangeStart, end: newRangeEnd }])
    setNewRangeStart('')
    setNewRangeEnd('')
  }

  function removeBlockedRange(index) {
    setBlockedDates((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      ...form,
      guests_capacity: form.guests_capacity ? parseInt(form.guests_capacity) : null,
      bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null,
      price_from: form.price_from ? parseFloat(form.price_from) : null,
      photos,
      cover_photo: photos[0] || null,
      blocked_dates: blockedDates,
      renter_id: form.renter_id || null,
    }

    let saveError
    if (isEditing) {
      const { error } = await supabase.from('properties').update(payload).eq('id', id)
      saveError = error
    } else {
      const { error } = await supabase.from('properties').insert(payload)
      saveError = error
    }

    setSaving(false)

    if (saveError) {
      setError(saveError.message)
    } else {
      navigate('/admin/properties')
    }
  }

  if (loading) {
    return <p className="text-muted">Loading…</p>
  }

  const inputClass =
    'w-full rounded-lg bg-white border border-ink/15 px-4 py-2.5 text-ink placeholder-muted outline-none focus:border-forest'
  const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5'

  return (
    <div className="max-w-3xl">
      <h1 className="font-serif font-medium text-3xl text-ink mb-6">
        {isEditing ? 'EDIT PROPERTY' : 'ADD PROPERTY'}
      </h1>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-5">
          {error}
        </p>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              className={inputClass}
              placeholder="e.g. Villa Serenity"
            />
          </div>
          <div>
            <label className={labelClass}>Location</label>
            <input
              required
              value={form.location}
              onChange={(e) => updateField('location', e.target.value)}
              className={inputClass}
              placeholder="e.g. Ibiza, Spain"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Type</label>
            <select
              value={form.type}
              onChange={(e) => updateField('type', e.target.value)}
              className={inputClass}
            >
              <option value="villa">Villa</option>
              <option value="apartment">Apartment</option>
              <option value="yacht">Yacht</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Guest capacity</label>
            <input
              type="number"
              min="1"
              value={form.guests_capacity}
              onChange={(e) => updateField('guests_capacity', e.target.value)}
              className={inputClass}
              placeholder="e.g. 12"
            />
          </div>
          <div>
            <label className={labelClass}>Bedrooms</label>
            <input
              type="number"
              min="0"
              value={form.bedrooms}
              onChange={(e) => updateField('bedrooms', e.target.value)}
              className={inputClass}
              placeholder="e.g. 6"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Price from (total per night)</label>
            <input
              type="number"
              min="0"
              value={form.price_from}
              onChange={(e) => updateField('price_from', e.target.value)}
              className={inputClass}
              placeholder="e.g. 2500"
            />
            <p className="text-xs text-muted mt-1">
              Total for the whole property per night — the site shows this divided by guest
              capacity as "per person/night".
            </p>
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select
              value={form.status}
              onChange={(e) => updateField('status', e.target.value)}
              className={inputClass}
            >
              <option value="active">Active (visible to guests)</option>
              <option value="hidden">Hidden (draft)</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Renter (who manages this property)</label>
          <select
            value={form.renter_id}
            onChange={(e) => updateField('renter_id', e.target.value)}
            className={inputClass}
          >
            <option value="">No renter assigned</option>
            {renters.map((r) => (
              <option key={r.id} value={r.id}>
                {r.full_name || r.email}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted mt-1">
            Bookings for this property need a renter assigned so they can approve/decline.
          </p>
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <textarea
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            className={inputClass}
            rows={4}
            placeholder="What makes this property special..."
          />
        </div>

        <div>
          <label className={labelClass}>Photos</label>

          {photos.length > 0 && (
            <div className="grid grid-cols-4 gap-3 mb-3">
              {photos.map((url) => (
                <div key={url} className="relative group">
                  <img
                    src={url}
                    alt=""
                    className="w-full h-24 object-cover rounded-lg border border-ink/10"
                  />
                  {photos[0] === url && (
                    <span className="absolute top-1.5 left-1.5 text-[9px] font-semibold uppercase tracking-wider bg-forest text-bone px-2 py-0.5 rounded-full">
                      Cover
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2 rounded-lg">
                    {photos[0] !== url && (
                      <button
                        type="button"
                        onClick={() => setCoverPhoto(url)}
                        className="text-[10px] bg-white text-forest rounded px-2 py-1 font-medium"
                      >
                        Set cover
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removePhoto(url)}
                      className="text-[10px] bg-red-500 text-white rounded px-2 py-1 font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <label className="inline-block cursor-pointer text-sm bg-ink/5 hover:bg-ink/10 text-ink rounded-lg px-4 py-2.5 border border-ink/15 transition">
            {uploading ? 'Uploading…' : '+ Upload photos'}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
          <p className="text-xs text-muted mt-1.5">
            First photo (or the one marked "Cover") is used as the main gallery image.
          </p>
        </div>

        <div>
          <label className={labelClass}>Blocked dates (unavailable for booking)</label>

          {blockedDates.length > 0 && (
            <div className="space-y-2 mb-3">
              {blockedDates.map((range, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-white border border-ink/10 rounded-lg px-4 py-2 text-sm"
                >
                  <span className="text-ink">
                    {range.start} → {range.end}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeBlockedRange(i)}
                    className="text-xs text-red-700 hover:text-red-900"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-[10px] text-muted mb-1">Start</label>
              <input
                type="date"
                value={newRangeStart}
                onChange={(e) => setNewRangeStart(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] text-muted mb-1">End</label>
              <input
                type="date"
                value={newRangeEnd}
                onChange={(e) => setNewRangeEnd(e.target.value)}
                className={inputClass}
              />
            </div>
            <button
              type="button"
              onClick={addBlockedRange}
              className="bg-ink/5 hover:bg-ink/10 text-ink rounded-lg px-4 py-2.5 text-sm border border-ink/15 transition"
            >
              Add
            </button>
          </div>
          <p className="text-xs text-muted mt-1.5">
            Guests searching dates that overlap any range above won't see this property.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || uploading}
            className="bg-forest text-bone font-semibold rounded-lg px-6 py-2.5 text-sm hover:bg-forestlight transition disabled:opacity-60"
          >
            {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Add property'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/properties')}
            className="text-muted hover:text-ink text-sm px-4 py-2.5"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
