import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { User, Edit2, Check, X } from 'lucide-react'
import { getProfile, updateProfile, getHistory } from '../api/users'
import { getMyItems } from '../api/items'
import { useAuth } from '../context/AuthContext'
import ItemCard from '../components/ItemCard'
import LoadingSpinner from '../components/LoadingSpinner'

export default function ProfilePage() {
  const { user: authUser } = useAuth()

  const [profile, setProfile] = useState(null)
  const [myItems, setMyItems] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('items') // 'items' | 'history'

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [profileRes, itemsRes, historyRes] = await Promise.all([
          getProfile(),
          getMyItems(),
          getHistory(),
        ])
        setProfile(profileRes.data || profileRes)
        setMyItems(itemsRes.data || itemsRes)
        setHistory(historyRes.data || historyRes)
      } catch {
        // ignore partial failures
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  const startEditing = () => {
    setEditName(profile?.name || '')
    setSaveError('')
    setEditing(true)
  }

  const cancelEditing = () => setEditing(false)

  const handleSave = async () => {
    if (!editName.trim()) return
    setSaving(true)
    setSaveError('')
    try {
      const res = await updateProfile({ name: editName.trim() })
      setProfile(res.data || res)
      setEditing(false)
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    })
  }

  const actionLabel = (type) => {
    switch (type) {
      case 'POSTED_FOUND': return 'Reported a found item'
      case 'POSTED_LOST': return 'Reported a lost item'
      case 'CLAIMED_ITEM': return 'Claimed an item'
      case 'REGISTERED': return 'Joined FoundIt!'
      default: return type
    }
  }

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Profile card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
            {profile?.profilePicture ? (
              <img src={profile.profilePicture} alt={profile.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              <User size={28} className="text-white" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={cancelEditing}
                  className="p-1.5 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-gray-900">{profile?.name || authUser?.name}</h1>
                <button
                  onClick={startEditing}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <Edit2 size={14} />
                </button>
              </div>
            )}
            {saveError && <p className="text-xs text-red-600 mb-1">{saveError}</p>}
            <p className="text-sm text-gray-500">{profile?.email || authUser?.email}</p>
            {profile?.studentId && (
              <p className="text-sm text-gray-400 mt-0.5">Student ID: {profile.studentId}</p>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{myItems.length}</p>
            <p className="text-xs text-gray-500">Items posted</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {myItems.filter((i) => i.status === 'CLAIMED').length}
            </p>
            <p className="text-xs text-gray-500">Items claimed</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-4 w-fit">
        {[
          { key: 'items', label: 'My Items' },
          { key: 'history', label: 'History' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Items tab */}
      {activeTab === 'items' && (
        myItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>You haven't posted any items yet.</p>
            <Link to="/post" className="mt-2 inline-block text-blue-600 text-sm hover:underline">
              Report your first item
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {myItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )
      )}

      {/* History tab */}
      {activeTab === 'history' && (
        history.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No activity recorded yet.</div>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <div key={h.id} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-100">
                <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">{actionLabel(h.actionType)}</p>
                  {h.itemName && (
                    <p className="text-xs text-gray-500 truncate">
                      {h.itemId ? (
                        <Link to={`/items/${h.itemId}`} className="hover:underline">{h.itemName}</Link>
                      ) : h.itemName}
                    </p>
                  )}
                </div>
                <p className="text-xs text-gray-400 flex-shrink-0">{formatDate(h.timestamp)}</p>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
