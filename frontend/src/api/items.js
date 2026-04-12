import api from './axios'

export const getItems = (params) => api.get('/items', { params })
export const getItem = (id) => api.get(`/items/${id}`)
export const reportFound = (data) => api.post('/items/found', data)
export const reportLost = (data) => api.post('/items/lost', data)
export const claimItem = (id) => api.post(`/items/${id}/claim`)
export const getMyItems = () => api.get('/items/my')

export const uploadImage = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/upload', formData)
}
