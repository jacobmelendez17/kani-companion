import axios, { AxiosInstance, AxiosError } from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

const client: AxiosInstance = axios.create({
  baseURL: `${baseURL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
})

// Attach auth token from localStorage to every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Global 401 handler — clear auth and redirect
client.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      // Soft redirect — let React Router handle it if available
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default client
