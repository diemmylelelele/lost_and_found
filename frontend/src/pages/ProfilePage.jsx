import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, Camera, X, Eye, EyeOff, Trash2 } from 'lucide-react'
import { getProfile, updateProfile, changePassword } from '../api/users'
import { getMyItems, deleteItem } from '../api/items'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import api from '../api/axios'

/* Generic avatar placeholder */
function DefaultAvatar({ size = 208 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="50" fill="#D6E4ED" />
      <circle cx="50" cy="38" r="18" fill="#B0C4D4" />
      <ellipse cx="50" cy="82" rx="26" ry="18" fill="#B0C4D4" />
    </svg>
  )
}

function StatusBadge({ item }) {
  const label = item.status === 'CLAIMED' ? 'Claimed'
    : item.itemType === 'FOUND' ? 'Found' : 'Lost'
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
      {label}
    </span>
  )
}

export default function ProfilePage() {
  const { user: authUser } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [myItems, setMyItems] = useState([])
  const [loading, setLoading] = useState(true)

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')

  // Item filter
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [typeOpen, setTypeOpen] = useState(false)
  const typeRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [profileRes, itemsRes] = await Promise.all([getProfile(), getMyItems()])
        setProfile(profileRes.data || profileRes)
        setMyItems(itemsRes.data || itemsRes)
      } catch { /* ignore */ }
      finally { setLoading(false) }
    }
    fetchAll()
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (typeRef.current && !typeRef.current.contains(e.target)) setTypeOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const openEdit = () => {
    setEditName(profile?.name || '')
    setAvatarFile(null)
    setAvatarPreview(null)
    setCurrentPassword('')
    setNewPassword('')
    setSaveError('')
    setSaveSuccess('')
    setEditOpen(true)
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    setSaveError('')
    setSaveSuccess('')

    // Validate password if user is trying to change it
    if (currentPassword || newPassword) {
      if (!currentPassword) { setSaveError('Enter your current password.'); return }
      if (!newPassword) { setSaveError('Enter a new password.'); return }
      if (newPassword.length < 6) { setSaveError('New password must be at least 6 characters.'); return }
    }

    setSaving(true)
    try {
      // 1. Upload avatar if selected
      let profilePictureUrl = profile?.profilePicture || ''
      if (avatarFile) {
        setUploadingAvatar(true)
        const formData = new FormData()
        formData.append('file', avatarFile)
        const uploadRes = await api.post('/upload', formData)
        profilePictureUrl = uploadRes.data.url
        setUploadingAvatar(false)
      }

      // 2. Update name + profile picture
      const updated = await updateProfile({ name: editName.trim(), profilePicture: profilePictureUrl })
      setProfile(updated.data || updated)

      // 3. Change password if filled
      if (currentPassword && newPassword) {
        const pwRes = await changePassword(currentPassword, newPassword)
        if (pwRes.data?.message && pwRes.data.message !== 'Password changed successfully') {
          setSaveError(pwRes.data.message)
          setSaving(false)
          return
        }
      }

      setSaveSuccess('Profile updated successfully.')
      setCurrentPassword('')
      setNewPassword('')
      setAvatarFile(null)
      setTimeout(() => { setEditOpen(false); setSaveSuccess('') }, 1200)
    } catch (err) {
      setSaveSuccess('')
      setSaveError(err.response?.data?.message || 'Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (e, itemId) => {
    e.stopPropagation()
    if (!window.confirm('Are you sure you want to remove this item?')) return
    try {
      await deleteItem(itemId)
      setMyItems(prev => prev.filter(i => i.id !== itemId))
    } catch (err) {
      const msg = err.response?.data?.message || err.message || ''
      if (msg.toLowerCase().includes('claimed')) {
        alert('This item has already been claimed and cannot be deleted.')
      }
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const filteredItems = myItems.filter(item => {
    const matchSearch = item.name?.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'All'
      || (typeFilter === 'Lost' && item.itemType === 'LOST' && item.status !== 'CLAIMED')
      || (typeFilter === 'Found' && item.itemType === 'FOUND' && item.status !== 'CLAIMED')
      || (typeFilter === 'Claimed' && item.status === 'CLAIMED')
    return matchSearch && matchType
  })

  const displayName = profile?.name || authUser?.name || 'Username'
  const displayEmail = profile?.email || authUser?.email || ''
  const avatarSrc = profile?.profilePicture || null

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>

  return (
    <div className="min-h-screen flex flex-col bg-white">

      {/* Main content */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-10">
        <div className="flex gap-16 items-start">

          {/* Left — avatar + info */}
          <div className="w-64 flex-shrink-0 flex flex-col items-center">
            <div className="w-52 h-52 rounded-full overflow-hidden flex-shrink-0 mb-4">
              {avatarSrc
                ? <img src={avatarSrc} alt={displayName} className="w-full h-full object-cover" />
                : <DefaultAvatar size={208} />
              }
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-0.5">{displayName}</h2>
            <p className="text-xs text-gray-700 mb-5">{displayEmail}</p>
            <button
              onClick={openEdit}
              className="w-full py-2 rounded-lg text-sm font-medium text-gray-800 hover:bg-gray-100 transition-colors"
              style={{ backgroundColor: '#D1D5DB' }}
            >
              Edit profile
            </button>
          </div>

          {/* Right — search + items list */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <div className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5">
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Find an item ..."
                  className="w-full text-sm outline-none text-gray-700 placeholder-gray-400"
                />
              </div>
              <div className="relative" ref={typeRef}>
                <button
                  onClick={() => setTypeOpen(o => !o)}
                  className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {typeFilter === 'All' ? 'Type' : typeFilter} <ChevronDown size={14} />
                </button>
                {typeOpen && (
                  <div className="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                    {['All', 'Lost', 'Found', 'Claimed'].map(opt => (
                      <button
                        key={opt}
                        onClick={() => { setTypeFilter(opt); setTypeOpen(false) }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${typeFilter === opt ? 'font-semibold text-gray-900' : 'text-gray-700'}`}
                      >
                        {opt === 'All' ? 'All types' : opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {filteredItems.length === 0 ? (
                <p className="text-sm text-gray-400 py-10 text-center">No items found.</p>
              ) : (
                filteredItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => navigate(`/items/${item.id}`)}
                    className="py-4 cursor-pointer hover:bg-gray-50 px-2 -mx-2 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-medium text-gray-900">{item.name}</span>
                        <StatusBadge item={item} />
                      </div>
                      <p className="text-xs text-gray-400">Updated on {formatDate(item.datePosted)}</p>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, item.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-4 px-6 mt-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-gray-400">
          <span>© 2021 Themesberg, LLC. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/></svg>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32"/></svg>
          </div>
        </div>
      </footer>

      {/* Edit Profile Modal */}
      {editOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setEditOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            <h2 className="text-lg font-bold text-gray-900 mb-5">Edit Profile</h2>

            {/* Avatar upload */}
            <div className="flex flex-col items-center mb-5">
              <div className="relative w-24 h-24 rounded-full overflow-hidden mb-2">
                {avatarPreview || avatarSrc
                  ? <img src={avatarPreview || avatarSrc} alt="avatar" className="w-full h-full object-cover" />
                  : <DefaultAvatar size={96} />
                }
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity rounded-full"
                >
                  <Camera size={20} className="text-white" />
                </button>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-blue-600 hover:underline"
              >
                {uploadingAvatar ? 'Uploading…' : 'Change photo'}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            {/* Name */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">Display name</label>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Your name"
              />
            </div>

            <hr className="my-4 border-gray-100" />
            <p className="text-xs font-medium text-gray-500 mb-3">Change password <span className="font-normal">(leave blank to keep current)</span></p>

            {/* Current password */}
            <div className="mb-3 relative">
              <label className="block text-xs font-medium text-gray-600 mb-1">Current password</label>
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-7 text-gray-400">
                {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* New password */}
            <div className="mb-3 relative">
              <label className="block text-xs font-medium text-gray-600 mb-1">New password</label>
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-7 text-gray-400">
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {saveError && <p className="text-xs text-red-600 mb-3">{saveError}</p>}
            {saveSuccess && <p className="text-xs text-green-600 mb-3">{saveSuccess}</p>}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#F5A623' }}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
