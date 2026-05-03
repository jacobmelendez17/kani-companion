import { create } from 'zustand'
import api from './api'

interface User {
  id: number
  email: string
  username: string
}

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
  signup: (email: string, username: string, password: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  hydrate: () => void
}

export const useAuth = create<AuthState>((set) => ({
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
}))
