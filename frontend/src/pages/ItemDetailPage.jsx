import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
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
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const verifyFoundItemId = searchParams.get('verifyFoundItem')

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
    if (item?.reporterId) navigate(`/chat/${item.reporterId}?itemId=${item.id}${item.isPublic === false ? '&anonymous=true' : ''}`)
  }

  const handleFinderVerify = async () => {
    if (!window.confirm('Confirm this match and mark your found item as claimed?')) return
    try {
      setActioning(true)
      await approveClaim(verifyFoundItemId)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to verify.')
    } finally {
      setActioning(false)
    }
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

  const userIsClaimant = user && String(user.id) === String(item.claimantId)

  // Valuable found item: non-owner sees "Verify Claim" button that goes to the verification page
  const showVerifyClaimBtn = valuable && isFound && !isOwner && !isClaimed && !userIsClaimant
  // Valuable found item: current user already submitted verification
  const showVerifySubmitted = valuable && isFound && !isOwner && !isClaimed && userIsClaimant
  // Non-valuable found item: non-owner sees "Claim" (sends notification) + "Chat"
  const showSimpleClaimBtn = !valuable && isFound && !isOwner && !isClaimed && !item.claimantId

  // Hide image/description for valuable found items from non-owners
  const hidePrivateDetails = valuable && isFound && !isOwner && !isClaimed

  return (
    <div className="flex flex-col bg-white">

      {/* Search + Filter bar */}
      <div className="bg-gray-50 py-4">
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-3">

          {/* Type filter tabs */}
          <div className="flex items-center flex-shrink-0 border border-gray-200 rounded-full bg-white overflow-hidden">
            {[{ label: 'All Items', value: '' }, { label: 'Lost Items', value: 'LOST' }, { label: 'Found Items', value: 'FOUND' }].map((opt) => (
              <button
                key={opt.value}
                onClick={() => navigate(opt.value ? `/?type=${opt.value}` : '/')}
                className="px-4 py-3 rounded-full text-sm font-medium transition-colors text-gray-500 hover:text-gray-700"
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-2 border border-gray-200 rounded-full px-4 py-3 bg-white ml-auto" style={{ width: '650px' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 flex-shrink-0">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search for items"
              className="text-sm outline-none text-gray-600 placeholder-gray-400 w-full bg-transparent"
              onKeyDown={e => { if (e.key === 'Enter') navigate(`/?q=${e.target.value}`) }}
            />
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
              className="text-4xl font-bold mb-1 leading-tight text-gray-900"
            >
              {item.name}
            </h1>

            <p className="text-xs text-gray-400 mb-2">
              Posted at {item.datePosted ? new Date(item.datePosted).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
              {' '}by {isOwner ? 'you' : (item.isPublic === false ? 'Anonymous Member' : (item.reporterName || 'Unknown'))}
            </p>

            {item.dateEvent && (
              <p className="text-xs text-gray-500 mb-1">
                {isFound ? 'Date found' : 'Date lost'}: {new Date(item.dateEvent).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            )}

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
            {verifyFoundItemId && !isClaimed ? (
              <div className="flex flex-col gap-3">
                <div className="p-3 bg-gray-50 text-gray-600 rounded-lg text-sm text-center">
                  This lost item has a high chance to match your found item. Verify to confirm or chat to discuss.
                </div>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={handleFinderVerify}
                    disabled={actioning}
                    className="w-36 h-11 rounded-full text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#F5A623' }}
                  >
                    {actioning ? 'Verifying...' : 'Verify'}
                  </button>
                  <button
                    onClick={handleChat}
                    className="w-36 h-11 rounded-full text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#03045E' }}
                  >
                    Chat
                  </button>
                </div>
              </div>
            ) : isClaimed ? (
              <div className="flex flex-col gap-3">
                <div className="p-3 bg-gray-100 text-gray-500 rounded-lg text-sm text-center font-medium">
                  This item has been claimed by {item.claimantName || 'someone'}
                </div>
                <div className="flex justify-center gap-4">
                  <div className="w-36 h-11 rounded-full text-sm font-semibold flex items-center justify-center border cursor-not-allowed"
                    style={{ color: '#F5A623', backgroundColor: '#FEF3C7', borderColor: '#FEF3C7' }}>
                    Claimed
                  </div>
                  {!isOwner && (
                    <button
                      onClick={handleChat}
                      className="w-36 h-11 rounded-full text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: '#03045E' }}
                    >
                      Chat
                    </button>
                  )}
                </div>
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
                    className="w-36 h-11 rounded-full text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#F5A623' }}
                  >
                    {actioning ? 'Verifying...' : 'Verify'}
                  </button>
                  <button
                    onClick={() => navigate(`/chat/${item.claimantId}`)}
                    className="w-36 h-11 rounded-full text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#03045E' }}
                  >
                    Chat
                  </button>
                </div>
              </div>
            ) : isOwner ? (
              <div className="p-3 bg-gray-100 text-gray-500 rounded-lg text-sm text-center">
                This is your posted item
              </div>
            ) : showVerifySubmitted ? (
              <div className="flex flex-col gap-3">
                <div className="p-3 bg-gray-100 text-gray-500 rounded-lg text-sm text-center">
                  You submitted the claim verification
                </div>
                <div className="flex justify-center gap-4">
                  <div className="w-36 h-11 rounded-full text-sm font-semibold flex items-center justify-center border cursor-not-allowed"
                    style={{ color: '#F5A623', backgroundColor: '#FEF3C7', borderColor: '#FEF3C7' }}>
                    Claim Pending
                  </div>
                  <button
                    onClick={handleChat}
                    className="w-36 h-11 rounded-full text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#03045E' }}
                  >
                    Chat
                  </button>
                </div>
              </div>
            ) : showVerifyClaimBtn ? (
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => navigate(`/claim/${id}`)}
                  className="w-36 h-11 rounded-full text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#F5A623' }}
                >
                  Verify Claim
                </button>
                <button
                  onClick={handleChat}
                  className="w-36 h-11 rounded-full text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#03045E' }}
                >
                  Chat
                </button>
              </div>
            ) : showSimpleClaimBtn ? (
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleSimpleClaim}
                  disabled={actioning}
                  className="w-36 h-11 rounded-full text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#F5A623' }}
                >
                  {actioning ? 'Sending...' : 'Claim'}
                </button>
                <button
                  onClick={handleChat}
                  className="w-36 h-11 rounded-full text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#03045E' }}
                >
                  Chat
                </button>
              </div>
            ) : !isOwner && item.claimantId && !isClaimed ? (
              <div className="flex flex-col gap-3">
                <div className="p-3 bg-gray-100 text-gray-500 rounded-lg text-sm text-center">
                  {user && String(user.id) === String(item.claimantId)
                    ? 'You are sending a request to claim this item'
                    : `${item.claimantName || 'Someone'} is sending a request to claim this item`}
                </div>
                <div className="flex justify-center gap-4">
                  <div className="w-36 h-11 rounded-full text-sm font-semibold flex items-center justify-center border cursor-not-allowed"
                    style={{ color: '#F5A623', backgroundColor: '#FEF3C7', borderColor: '#FEF3C7' }}>
                    Claim Pending
                  </div>
                  <button
                    onClick={handleChat}
                    className="w-36 h-11 rounded-full text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#03045E' }}
                  >
                    Chat
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleChat}
                  className="w-36 h-11 rounded-full text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#03045E' }}
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
