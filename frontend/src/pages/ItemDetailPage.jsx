import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getItem, claimItem } from '../api/items'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'

const FILTER_OPTIONS = [
  { label: 'All items' },
  { label: 'Bottles' },
  { label: 'Hats' },
  { label: 'Keys' },
  { label: 'Clothes' },
  { label: 'Electronic devices' },
  { label: 'Locations' },
]

function ChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export default function ItemDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [activeFilter, setActiveFilter] = useState('All items')

  useEffect(() => {
    const fetchItem = async () => {
      try {
        setLoading(true)
        const data = await getItem(id)
        setItem(data.data || data)
      } catch {
        setError('Failed to load item details.')
      } finally {
        setLoading(false)
      }
    }
    fetchItem()
  }, [id])

  const handleClaim = async () => {
    if (!window.confirm('Are you sure you want to claim this item?')) return
    try {
      setClaiming(true)
      const res = await claimItem(id)
      setItem(res.data || res)
      setSuccessMsg('Item claimed successfully!')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to claim item.')
    } finally {
      setClaiming(false)
    }
  }

  const handleChat = () => {
    if (item?.reporterId) navigate(`/chat/${item.reporterId}`)
  }

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>
  if (error && !item) return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <p className="text-red-600 mb-4">{error}</p>
      <button onClick={() => navigate('/')} className="text-blue-600 hover:underline">Back to home</button>
    </div>
  )
  if (!item) return null

  const isOwner = user && String(user.id) === String(item.reporterId)
  const isClaimed = item.status === 'CLAIMED'

  return (
    <div className="min-h-screen flex flex-col bg-white">

      {/* Search + Filter bar */}
      <div className="border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-6">
        {/* Search — left aligned */}
        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 w-48 flex-shrink-0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search..."
            className="text-sm outline-none text-gray-600 placeholder-gray-400 w-full"
            onKeyDown={e => { if (e.key === 'Enter') navigate(`/?q=${e.target.value}`) }}
          />
        </div>

        {/* Filter pills — right aligned */}
        <div className="flex-1 flex items-center justify-end gap-1">
        <div className="border border-gray-300 rounded-full px-5 py-2 flex items-center gap-4">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => {
                setActiveFilter(opt.label)
                if (opt.label === 'All items') navigate('/')
              }}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              {/* Radio circle */}
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                activeFilter === opt.label ? 'border-gray-700' : 'border-gray-400'
              }`}>
                {activeFilter === opt.label && (
                  <span className="w-2 h-2 rounded-full bg-gray-700" />
                )}
              </span>
              <span className="whitespace-nowrap">{opt.label}</span>
            </button>
          ))}
        </div>
        </div>
      </div>
      </div>

      {/* Main content */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 pb-10">
        <div className="flex gap-10 items-start">

          {/* Left — image */}
          <div className="w-[44%] flex-shrink-0">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full object-contain bg-gray-50 rounded-2xl"
                style={{ maxHeight: '460px' }}
              />
            ) : (
              <div className="w-full bg-gray-100 rounded-2xl flex items-center justify-center" style={{ height: '380px' }}>
                <span className="text-gray-400 text-sm">No image</span>
              </div>
            )}
          </div>

          {/* Right — details */}
          <div className="flex-1 flex flex-col pt-2">
            {/* Title */}
            <h1
              className="text-4xl font-bold mb-2 leading-tight"
              style={{ color: '#03045E' }}
            >
              {item.name}
            </h1>

            {/* Location subtitle */}
            {item.locationFound && (
              <p className="text-sm text-gray-500 mb-5">
                {item.locationFound}
              </p>
            )}

            {/* Description box */}
            <div className="border border-gray-300 rounded-sm p-4 mb-8 min-h-[200px]">
              <p className="text-sm text-gray-700 leading-relaxed">
                {item.description || ''}
              </p>
            </div>

            {/* Feedback messages */}
            {successMsg && (
              <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">{successMsg}</div>
            )}
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
            )}

            {/* Action buttons */}
            {isClaimed ? (
              <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm text-center font-medium">
                This item has been claimed
              </div>
            ) : isOwner ? (
              <div className="p-3 bg-blue-50 text-blue-700 rounded-lg text-sm text-center">
                This is your posted item
              </div>
            ) : (
              <div className="flex justify-center gap-6">
                <button
                  onClick={handleClaim}
                  disabled={claiming}
                  className="w-44 py-3 rounded-full text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#03045E' }}
                >
                  {claiming ? 'Claiming...' : 'Claim'}
                </button>
                <button
                  onClick={handleChat}
                  className="w-44 py-3 rounded-full text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#F5A623' }}
                >
                  Chat
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-4 px-8 mt-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-gray-400">
          <span>© 2021 FoundIt Fulbright. All rights reserved.</span>
          <div className="flex items-center gap-3">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/></svg>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
          </div>
        </div>
      </footer>
    </div>
  )
}
