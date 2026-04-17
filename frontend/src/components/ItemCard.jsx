import { useNavigate } from 'react-router-dom'
import { MapPin, Package, MoreVertical } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const VALUABLE_KEYWORDS = [
  'phone', 'laptop', 'wallet', 'smartwatch', 'tablet', 'airpod',
  'ipad', 'macbook', 'iphone', 'samsung', 'watch', 'camera',
]

function isValuableItem(name) {
  if (!name) return false
  const lower = name.toLowerCase()
  return VALUABLE_KEYWORDS.some(k => lower.includes(k))
}

export default function ItemCard({ item }) {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()

  if (!item) return null

  const {
    id,
    name,
    locationFound,
    status,
    description,
    imageUrl,
    reporterName,
    reporterId,
    datePosted,
    itemType,
  } = item

  const rawName = name || 'Unknown Item'
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1)
  const isFound = status?.toUpperCase() === 'FOUND' || itemType?.toUpperCase() === 'FOUND'
  const isClaimed = status?.toUpperCase() === 'CLAIMED'
  const isOwnItem = user && (String(reporterId) === String(user.id))
  const valuable = isValuableItem(name)

  // For valuable found items: hide image and description from non-owners
  const hidePrivateDetails = valuable && isFound && !isOwnItem && !isClaimed

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
      })
    } catch {
      return ''
    }
  }

  // Header label
  const headerLabel = isClaimed
    ? 'Claimed Item'
    : isOwnItem && isFound
    ? 'You found this item'
    : isOwnItem && !isFound
    ? "You're searching for"
    : isFound
    ? `${reporterName || 'Someone'} found item`
    : `${reporterName || 'Someone'} is searching for`

  // Show chat button only for non-own items
  const showChat = isAuthenticated && !isOwnItem && !isClaimed

  // Show claim button only for found items viewed by non-owners
  const showClaim = isAuthenticated && !isOwnItem && isFound && !isClaimed

  const handleClaimClick = (e) => {
    e.stopPropagation()
    if (!isAuthenticated) { navigate('/login'); return }
    navigate(`/claim/${id}`)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">

      {/* Header row */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <div className="w-7 h-7 rounded-full bg-brand-gold flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">
            {reporterName?.charAt(0)?.toUpperCase() || 'U'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-800 truncate">
            {headerLabel}
          </p>
          {datePosted && (
            <p className="text-[10px] text-gray-400">Posted at {formatDate(datePosted)}</p>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/items/${id}`) }}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0 p-0.5"
        >
          <MoreVertical size={16} />
        </button>
      </div>

      {/* Image — hidden for valuable found items (non-owners) */}
      {!hidePrivateDetails ? (
        <div
          className="bg-gray-100 cursor-pointer"
          style={{ height: '200px' }}
          onClick={() => navigate(`/items/${id}`)}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={displayName}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none'
                e.target.nextElementSibling.style.display = 'flex'
              }}
            />
          ) : null}
          <div
            className={`w-full h-full flex flex-col items-center justify-center bg-gray-100 ${imageUrl ? 'hidden' : 'flex'}`}
          >
            <Package size={36} className="text-gray-300" />
            <span className="text-xs text-gray-400 mt-1">No image</span>
          </div>
        </div>
      ) : (
        <div
          className="bg-gray-100 cursor-pointer flex flex-col items-center justify-center"
          style={{ height: '200px' }}
          onClick={() => navigate(`/items/${id}`)}
        >
          <Package size={36} className="text-gray-300" />
          <span className="text-xs text-gray-400 mt-2 px-4 text-center">
            Image hidden for valuable item
          </span>
        </div>
      )}

      {/* Content */}
      <div className="px-3 pt-3 pb-3 flex flex-col gap-2 flex-1">

        {/* Name + Chat */}
        <div className="flex items-center gap-2">
          <h3
            className="font-bold text-gray-900 text-base flex-1 truncate cursor-pointer"
            onClick={() => navigate(`/items/${id}`)}
          >
            {displayName}
          </h3>
          {showChat && (
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/chat/${reporterId}`) }}
              className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-white rounded-full whitespace-nowrap hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#03045E' }}
            >
              Chat
            </button>
          )}
        </div>

        {/* Location */}
        {locationFound && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <MapPin size={12} className="text-brand-gold flex-shrink-0" />
            <span className="truncate">{locationFound}</span>
          </div>
        )}

        {/* Description — hidden for valuable found items (non-owners) */}
        {description && !hidePrivateDetails && (
          <p className="text-xs text-gray-500 line-clamp-2">{description}</p>
        )}

        {/* Valuable badge */}
        {hidePrivateDetails && (
          <p className="text-xs text-gray-500">Valuable item — verify to claim</p>
        )}

        {/* Action button */}
        <div className="flex justify-center mt-auto pt-2">
          {isClaimed ? (
            <div className="px-8 py-2 text-xs font-semibold text-center text-green-600 bg-green-50 rounded-full border border-green-100">
              Claimed
            </div>
          ) : isOwnItem ? null
          : showClaim ? (
            <button
              onClick={handleClaimClick}
              className="px-6 py-2 text-sm font-semibold text-white rounded-full hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#F5A623' }}
            >
              Claim
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
