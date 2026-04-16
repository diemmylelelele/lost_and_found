import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, X } from 'lucide-react'
import { reportFound, reportLost, uploadImage } from '../api/items'
import LoadingSpinner from '../components/LoadingSpinner'

const LOCATIONS = [
  'Common Area GF', 'Library', 'Maker Space',
  'Classroom 1', 'Classroom 2', 'Classroom 3', 'Classroom 4',
  'Classroom 5', 'Classroom 6', 'Classroom 7', 'Other',
]

export default function PostItemModal({ type, onClose }) {
  const isFound = type === 'found'
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [form, setForm] = useState({
    name: '', description: '', category: '',
    locationFound: '', date: '', isPublic: 'Yes',
  })
  const [imagePreview, setImagePreview] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return }
    if (file.size > 10 * 1024 * 1024) { setError('Image must be smaller than 10MB.'); return }
    setError('')
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const clearImage = () => {
    setImagePreview(null)
    setImageFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Item name is required.'); return }
    setError('')

    let imageUrl = ''
    if (imageFile) {
      setUploading(true)
      try {
        const uploadRes = await uploadImage(imageFile)
        imageUrl = uploadRes.data.url
      } catch {
        setError('Failed to upload image. Please try again.')
        setUploading(false)
        return
      }
      setUploading(false)
    }

    setSubmitting(true)
    try {
      const submit = isFound ? reportFound : reportLost
      const res = await submit({
        name: form.name,
        description: form.description,
        category: form.category,
        locationFound: form.locationFound,
        imageUrl,
      })
      const item = res.data || res
      onClose()
      navigate(`/items/${item.id}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-xl rounded-2xl px-8 py-5 relative max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: '#03045E' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-white/60 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        {/* Title pill */}
        <div className="flex justify-center mb-4">
          <span className="bg-brand-gold text-white font-bold text-sm px-6 py-1.5 rounded-full tracking-wide uppercase">
            {isFound ? 'Found Item Report' : 'Lost Item Report'}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Item Name */}
          <div>
            <label className="block text-white text-sm font-medium mb-0.5">Item Name</label>
            <input
              name="name" type="text" value={form.name} onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg bg-white text-gray-900 text-sm outline-none"
              placeholder="e.g. Water bottle, Laptop..."
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-white text-sm font-medium mb-0.5">Location</label>
            <select
              name="locationFound" value={form.locationFound} onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg bg-white text-gray-900 text-sm outline-none"
            >
              <option value="">Select location</option>
              {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-white text-sm font-medium mb-0.5">Date</label>
            <input
              name="date" type="date" value={form.date} onChange={handleChange}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 rounded-lg bg-white text-gray-900 text-sm outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-white text-sm font-medium mb-0.5">Description</label>
            <textarea
              name="description" rows={2} value={form.description} onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg bg-white text-gray-900 text-sm outline-none resize-none"
              placeholder="Describe the item..."
            />
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-white text-sm font-medium mb-0.5">
              Photo Upload{!isFound && ' (If available)'}
            </label>
            {imagePreview ? (
              <div className="relative w-full">
                <img src={imagePreview} alt="Preview"
                  className="w-full max-h-32 object-contain rounded-lg bg-white" />
                <button type="button" onClick={clearImage}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="w-full px-4 py-2 rounded-lg bg-white text-gray-500 text-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
                <Upload size={15} /> Upload Image
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*"
              onChange={handleFileChange} className="hidden" />
          </div>

          {/* Save as public — Found only */}
          {isFound && (
            <div>
              <label className="block text-white text-sm font-medium mb-0.5">Save form as public</label>
              <select name="isPublic" value={form.isPublic} onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg bg-white text-gray-900 text-sm outline-none">
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
          )}

          {error && <p className="text-red-300 text-sm">{error}</p>}

          <div className="pt-1">
            <button type="submit" disabled={submitting || uploading}
              className="w-1/4 mx-auto py-2 bg-brand-gold text-white font-bold rounded-full text-sm uppercase tracking-wide hover:bg-yellow-500 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
              {uploading ? <><LoadingSpinner size="sm" color="white" /> Uploading...</>
               : submitting ? <><LoadingSpinner size="sm" color="white" /> Submitting...</>
               : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
