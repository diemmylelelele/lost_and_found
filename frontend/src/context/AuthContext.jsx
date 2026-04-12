import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    if (storedToken && storedUser) {
      try {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
      } catch {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
  }, [])

  const login = (authResponse) => {
    const userData = {
      id: authResponse.userId,
      name: authResponse.name,
      email: authResponse.email
    }
    localStorage.setItem('token', authResponse.token)
    localStorage.setItem('user', JSON.stringify(userData))
    setToken(authResponse.token)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
