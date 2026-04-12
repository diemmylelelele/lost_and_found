import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Send, Image, MessageSquare } from 'lucide-react'
import { getConversations, getConversation, sendMessage } from '../api/messages'
import { getUserById } from '../api/users'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function getDisplayName(name, email) {
  if (name && name.trim()) return name
  if (email) return email.split('@')[0]
  return 'Unknown'
}

const AVATAR_COLORS = ['#6B7280', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B']
function getAvatarColor(id) {
  return AVATAR_COLORS[(Number(id) || 0) % AVATAR_COLORS.length]
}

export default function ChatPage() {
  const { partnerId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loadingConvos, setLoadingConvos] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [activePartner, setActivePartner] = useState(null)
  const [search, setSearch] = useState('')
  const [convoFilter, setConvoFilter] = useState('all')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    getConversations()
      .then(res => setConversations(res.data || []))
      .catch(() => {})
      .finally(() => setLoadingConvos(false))
  }, [])

  useEffect(() => {
    if (!partnerId) return
    setLoadingMessages(true)
    getConversation(partnerId)
      .then(res => setMessages(res.data || []))
      .catch(() => {})
      .finally(() => setLoadingMessages(false))
  }, [partnerId])

  useEffect(() => {
    if (!partnerId) return
    const partner = conversations.find(c => String(c.partnerId) === String(partnerId))
    if (partner) {
      setActivePartner(partner)
    } else {
      // Not in conversation list yet — fetch user info directly
      getUserById(partnerId)
        .then(res => setActivePartner({
          partnerId,
          partnerName: res.data.name || '',
          partnerEmail: res.data.email || '',
        }))
        .catch(() => setActivePartner({ partnerId, partnerName: '', partnerEmail: '' }))
    }
  }, [partnerId, conversations])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !partnerId) return
    setSending(true)
    try {
      const res = await sendMessage(partnerId, newMessage.trim())
      setMessages(prev => [...prev, res.data || res])
      setNewMessage('')
      // Update conversation list preview
      setConversations(prev => prev.map(c =>
        String(c.partnerId) === String(partnerId)
          ? { ...c, lastMessage: newMessage.trim(), lastMessageTime: new Date().toISOString() }
          : c
      ))
    } catch { /* ignore */ }
    finally { setSending(false) }
  }

  const filteredConvos = conversations.filter(c => {
    const name = getDisplayName(c.partnerName, c.partnerEmail).toLowerCase()
    const matchSearch = name.includes(search.toLowerCase())
    const matchFilter = convoFilter === 'all' || c.unreadCount > 0
    return matchSearch && matchFilter
  })

  const activePartnerName = activePartner
    ? getDisplayName(activePartner.partnerName, activePartner.partnerEmail)
    : ''

  // Group messages to show time dividers
  const groupedMessages = messages.reduce((acc, msg, i) => {
    const prev = messages[i - 1]
    const showTime = !prev || (new Date(msg.sentAt) - new Date(prev.sentAt)) > 5 * 60 * 1000
    acc.push({ ...msg, showTime })
    return acc
  }, [])

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-50">

      {/* Left panel — conversations */}
      <div className="w-80 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        {/* Title */}
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-2xl font-bold text-gray-900">Chat</h2>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Searching..."
              className="bg-transparent text-sm outline-none flex-1 text-gray-600 placeholder-gray-400"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-4 pb-3">
          {['all', 'unread'].map(tab => (
            <button
              key={tab}
              onClick={() => setConvoFilter(tab)}
              className={`px-4 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
                convoFilter === tab ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'all' ? 'All' : 'Unread'}
            </button>
          ))}
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvos ? (
            <div className="flex justify-center p-6"><LoadingSpinner /></div>
          ) : filteredConvos.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <MessageSquare size={32} className="text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">No conversations yet</p>
            </div>
          ) : (
            filteredConvos.map(convo => {
              const name = getDisplayName(convo.partnerName, convo.partnerEmail)
              const isActive = String(convo.partnerId) === String(partnerId)
              return (
                <button
                  key={convo.partnerId}
                  onClick={() => navigate(`/chat/${convo.partnerId}`)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${isActive ? 'bg-gray-50' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: getAvatarColor(convo.partnerId) }}
                    >
                      <span className="text-white font-bold text-base">
                        {name.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-900 truncate">{name}</span>
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                          {timeAgo(convo.lastMessageTime)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-gray-500 truncate flex-1">
                          {convo.lastMessage || 'Start a conversation'}
                        </p>
                        {convo.unreadCount > 0 && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Right panel — active chat */}
      <div className="flex-1 flex flex-col bg-white">
        {!partnerId ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center p-8">
            <MessageSquare size={48} className="text-gray-200 mb-3" />
            <p className="text-gray-500 font-medium">Select a conversation</p>
            <p className="text-sm text-gray-400 mt-1">Click Chat on any item to start messaging.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: getAvatarColor(activePartner?.partnerId) }}
              >
                <span className="text-white font-bold">
                  {activePartnerName.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
              <span className="font-bold text-gray-900 text-base">{activePartnerName}</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
              {loadingMessages ? (
                <div className="flex justify-center py-8"><LoadingSpinner /></div>
              ) : groupedMessages.length === 0 ? (
                <div className="text-center text-sm text-gray-400 py-8">No messages yet. Say hello!</div>
              ) : (
                groupedMessages.map(msg => {
                  // A message is mine if I sent it TO the partner (recipientId === partnerId)
                  const isMine = String(msg.recipientId) === String(partnerId)
                  return (
                    <div key={msg.id}>
                      {msg.showTime && (
                        <div className="flex justify-center my-3">
                          <span className="text-xs text-gray-400">{formatTime(msg.sentAt)}</span>
                        </div>
                      )}
                      <div className={`flex items-end gap-2 mb-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                        {/* Avatar for received messages */}
                        {!isMine && (
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5"
                            style={{ backgroundColor: getAvatarColor(activePartner?.partnerId) }}
                          >
                            <span className="text-white text-xs font-bold">
                              {activePartnerName.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                        )}
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm text-gray-900 ${
                            isMine
                              ? 'bg-gray-200 rounded-br-sm'
                              : 'bg-gray-100 rounded-bl-sm'
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="flex items-center gap-3 px-4 py-3 border-t border-gray-200 bg-gray-50">
              <button type="button" className="text-gray-400 hover:text-gray-600 flex-shrink-0 p-1">
                <Image size={22} />
              </button>
              <input
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Typing ..."
                className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400 py-2"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="text-gray-400 hover:text-brand-gold disabled:opacity-30 transition-colors flex-shrink-0 p-1"
              >
                <Send size={20} />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
