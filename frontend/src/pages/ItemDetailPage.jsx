import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getItem, claimSimple, approveClaim } from '../api/items'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'

const FILTER_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Student card', value: 'Student card' },
  { label: 'Key', value: 'Key' },
  { label: 'Water bottles', value: 'Water bottles' },
  { label: 'Helmet', value: 'Helmet' },
  { label: 'Chargers', value: 'Chargers' },
  { label: 'Clothes', value: 'Clothes' },
]

const VALUABLE_KEYWORDS = [
  'phone', 'laptop', 'wallet', 'smartwatch', 'tablet', 'airpod',
  'ipad', 'macbook', 'iphone', 'samsung', 'watch', 'camera',
]

function isValuableItem(name) {
  if (!name) return false
  const lower = name.toLowerCase()
  return VALUABLE_KEYWORDS.some(k => lower.includes(k))
}


export default function ItemDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [activeFilter, setActiveFilter] = useState('')

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

  const handleSimpleClaim = async () => {
    if (!window.confirm('Send a claim request to the finder?')) return
    try {
      setActioning(true)
      const res = await claimSimple(id)
      setItem(res.data || res)
      setSuccessMsg('Claim request sent! The finder has been notified.')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send claim request.')
    } finally {
      setActioning(false)
    }
  }

  const handleApproveClaim = async () => {
    if (!window.confirm('Approve this claim and mark item as claimed?')) return
    try {
      setActioning(true)
      const res = await approveClaim(id)
      setItem(res.data || res)
      setSuccessMsg('Item marked as claimed!')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve claim.')
    } finally {
      setActioning(false)
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
  const isFound = item.status === 'FOUND' || item.itemType === 'FOUND'
  const valuable = isValuableItem(item.name)

  // Owner sees "Verify" + "Chat" when someone has requested/matched a claim
  const hasPendingClaim = isFound && isOwner && item.claimantId && !isClaimed

  // Valuable found item: non-owner sees "Verify Claim" button that goes to the verification page
  const showVerifyClaimBtn = valuable && isFound && !isOwner && !isClaimed
  // Non-valuable found item: non-owner sees "Claim" (sends notification) + "Chat"
  const showSimpleClaimBtn = !valuable && isFound && !isOwner && !isClaimed && !item.claimantId

  // Hide image/description for valuable found items from non-owners
  const hidePrivateDetails = valuable && isFound && !isOwner && !isClaimed

  return (
    <div className="flex flex-col bg-white">

      {/* Search + Filter bar */}
      <div className="bg-gray-50 py-3">
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-4">
          <div className="flex items-center gap-2 border border-gray-200 rounded-full px-4 py-1.5 bg-white flex-shrink-0" style={{ width: '280px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 flex-shrink-0">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search"
              className="text-sm outline-none text-gray-400 placeholder-gray-400 w-full bg-transparent"
              onKeyDown={e => { if (e.key === 'Enter') navigate(`/?q=${e.target.value}`) }}
            />
          </div>
          <div className="flex-1 flex justify-end">
            <div className="border border-gray-300 rounded-full px-5 py-2 flex items-center gap-4">
              {FILTER_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-1.5 text-sm text-gray-400 cursor-pointer hover:text-gray-600 transition-colors select-none">
                  <span
                    className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={activeFilter === opt.value ? { borderColor: '#F5A623' } : { borderColor: '#9ca3af' }}
                  >
                    {activeFilter === opt.value && (
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#F5A623' }} />
                    )}
                  </span>
                  <input type="radio" name="detail-filter" className="hidden"
                    checked={activeFilter === opt.value}
                    onChange={() => { setActiveFilter(opt.value); navigate(`/?category=${opt.value}`) }}
                  />
                  <span className="whitespace-nowrap">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 pt-8 pb-10 bg-gray-50">
        <div className="flex gap-10 items-start">

          {/* Left — image */}
          <div className="w-[44%] flex-shrink-0">
            {hidePrivateDetails ? (
              <div className="w-full bg-gray-100 rounded-2xl flex flex-col items-center justify-center" style={{ height: '380px' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
                </svg>
                <span className="text-gray-400 text-sm mt-3">Image hidden for privacy</span>
              </div>
            ) : item.imageUrl ? (
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
            <h1
              className="text-4xl font-bold mb-2 leading-tight text-gray-900"
            >
              {item.name}
            </h1>

            {item.locationFound && (
              <p className="text-sm text-gray-500 mb-5">{item.locationFound}</p>
            )}

            {/* Description box */}
            {!hidePrivateDetails && (
              <div className="border border-gray-200 rounded-2xl p-4 mb-6 min-h-[200px]">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {item.description || ''}
                </p>
              </div>
            )}

            {hidePrivateDetails && (
              <div className="border border-gray-200 rounded-2xl p-4 mb-6 min-h-[200px] flex items-center justify-center">
                <p className="text-sm text-gray-400 text-center leading-relaxed">
                  This is a valuable item. Description and image are hidden.<br/>
                  Submit a claim to verify ownership.
                </p>
              </div>
            )}

            {/* Feedback messages */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
            )}

            {/* Action buttons — below description */}
            {isClaimed ? (
              <div className="p-3 rounded-lg text-sm text-center font-medium" style={{ backgroundColor: '#FEF3C7', color: '#F5A623' }}>
                This item has been claimed{item.claimantName ? ` by ${item.claimantName}` : ''}
              </div>
            ) : isOwner && hasPendingClaim ? (
              <div className="flex flex-col gap-3">
                <div className="p-3 bg-gray-50 text-gray-600 rounded-lg text-sm text-center">
                  There is a high chance this item belongs to the claimer. Verify to confirm or chat to discuss.
                </div>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={handleApproveClaim}
                    disabled={actioning}
                    className="w-36 py-3 rounded-full text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#03045E' }}
                  >
                    {actioning ? 'Verifying...' : 'Verify'}
                  </button>
                  <button
                    onClick={() => navigate(`/chat/${item.claimantId}`)}
                    className="w-36 py-3 rounded-full text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#F5A623' }}
                  >
                    Chat
                  </button>
                </div>
              </div>
            ) : isOwner ? (
              <div className="p-3 bg-blue-50 text-blue-700 rounded-lg text-sm text-center">
                This is your posted item
              </div>
            ) : showVerifyClaimBtn ? (
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => navigate(`/claim/${id}`)}
                  className="w-36 py-3 rounded-full text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#03045E' }}
                >
                  Verify Claim
                </button>
                <button
                  onClick={handleChat}
                  className="w-36 py-3 rounded-full text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#F5A623' }}
                >
                  Chat
                </button>
              </div>
            ) : showSimpleClaimBtn ? (
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleSimpleClaim}
                  disabled={actioning}
                  className="w-36 py-3 rounded-full text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#03045E' }}
                >
                  {actioning ? 'Sending...' : 'Claim'}
                </button>
                <button
                  onClick={handleChat}
                  className="w-36 py-3 rounded-full text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#F5A623' }}
                >
                  Chat
                </button>
              </div>
            ) : !isOwner && item.claimantId && !isClaimed ? (
              <div className="p-3 bg-yellow-50 text-yellow-700 rounded-lg text-sm text-center">
                A claim request is pending for this item
              </div>
            ) : (
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleChat}
                  className="w-36 py-3 rounded-full text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#F5A623' }}
                >
                  Chat
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
