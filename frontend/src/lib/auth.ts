import { create } from 'zustand'
import api from './api'

interface User {
  id: number
  email: string
  username: string
  admin: boolean
}

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
  signup: (email: string, username: string, password: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  hydrate: () => void
  fetchUser: () => Promise<void>
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('auth_token'),
  loading: false,

  signup: async (email, username, password) => {
    set({ loading: true })
    try {
      const { data } = await api.post('/auth/signup', { email, username, password })
      localStorage.setItem('auth_token', data.token)
      set({ user: data.user, token: data.token })
    } finally {
      set({ loading: false })
    }
  },

  login: async (email, password) => {
    set({ loading: true })
    try {
      const { data } = await api.post('/auth/login', { email, password })
      localStorage.setItem('auth_token', data.token)
      set({ user: data.user, token: data.token })
    } finally {
      set({ loading: false })
    }
  },

  logout: async () => {
    try {
      await api.delete('/auth/logout')
    } catch {
      // best effort
    }
    localStorage.removeItem('auth_token')
    set({ user: null, token: null })
  },

  hydrate: () => {
    const token = localStorage.getItem('auth_token')
    if (token) set({ token })
  },

  // Refetches user info from /me — used to load `admin` flag for users who
  // logged in before the admin column existed.
  fetchUser: async () => {
    const { token } = get()
    if (!token) return
    try {
      const { data } = await api.get('/me')
      set({ user: data.user })
    } catch {
      // token may be invalid; clear it
      localStorage.removeItem('auth_token')
      set({ user: null, token: null })
    }
  },
}))
