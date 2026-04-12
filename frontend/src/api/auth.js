import api from './axios'

export const register = (data) => api.post('/auth/register', data)
export const login = (data) => api.post('/auth/login', data)
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email })
export const verifyResetCode = (email, code) => api.post('/auth/verify-reset-code', { email, code })
export const resetPassword = (email, code, newPassword) => api.post('/auth/reset-password', { email, code, newPassword })
