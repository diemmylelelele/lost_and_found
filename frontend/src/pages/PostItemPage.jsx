import { useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Upload, X } from 'lucide-react'
import { reportFound, reportLost, uploadImage } from '../api/items'
import LoadingSpinner from '../components/LoadingSpinner'

const LOCATIONS = [
  'Common Area GF', 'Library', 'Maker Space',
  'Classroom 1', 'Classroom 2', 'Classroom 3', 'Classroom 4',
  'Classroom 5', 'Classroom 6', 'Classroom 7', 'Other',
]

const CATEGORIES = [
  'Bottles', 'Keys', 'Clothes', 'Electronic devices',
  'Books', 'Bags', 'ID / Cards', 'Other',
]

export default function PostItemPage() {
  const location = useLocation()
  const isFound = !location.pathname.includes('/lost')
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
      navigate(`/items/${item.id}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:border-gray-400 bg-white'

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center pt-10 pb-16 px-6">
      <div className="w-full max-w-5xl bg-white rounded-2xl border border-gray-200 shadow-sm px-10 py-8">

        {/* Title pill */}
        <div className="flex justify-center mb-7">
          <span className="bg-gray-100 text-sm font-bold px-8 py-2 rounded-full tracking-widest uppercase" style={{ color: '#03045E' }}>
            {isFound ? 'Found Item Report' : 'Lost Item Report'}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Row: Item Name + Location + Date */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
              <input
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                className={inputCls}
                placeholder="e.g. Student ID, Laptop..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <select
                name="locationFound"
                value={form.locationFound}
                onChange={handleChange}
                className={inputCls}
              >
                <option value="">Select location</option>
                {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                name="date"
                type="date"
                value={form.date}
                onChange={handleChange}
                max={new Date().toISOString().split('T')[0]}
                className={inputCls}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              rows={5}
              value={form.description}
              onChange={handleChange}
              className={`${inputCls} resize-none`}
              placeholder="Describe the item — colour, brand, distinguishing features..."
            />
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Photo Upload{!isFound && ' (If available)'}
            </label>
            {imagePreview ? (
              <div className="relative w-full border border-gray-200 rounded-lg overflow-hidden">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full max-h-40 object-contain bg-gray-50"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 border border-gray-300 rounded-lg text-sm text-gray-500 flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors bg-white"
              >
                <Upload size={15} />
                Upload Image
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Post as public — Found only */}
          {isFound && (
            <div className="flex items-center justify-between py-2 border-t border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-700">Post as public</p>
                <p className="text-xs text-gray-400">Other users will be able to see you name and claim this item</p>
              </div>
              <select
                name="isPublic"
                value={form.isPublic}
                onChange={handleChange}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none"
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}

          {/* Submit */}
          <div className="flex justify-center">
          <button
            type="submit"
            disabled={submitting || uploading}
            className="px-16 py-2.5 rounded-full text-sm font-bold text-white uppercase tracking-widest disabled:opacity-60 transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
            style={{ backgroundColor: '#F5A623' }}
          >
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
