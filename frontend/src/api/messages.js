import api from './axios'

export const getConversations = () => api.get('/conversations')
export const getConversation = (partnerId) => api.get(`/messages/${partnerId}`)
export const sendMessage = (recipientId, content) => api.post(`/messages/${recipientId}`, { content })
