import { useEffect, useState } from 'react'
import api from './api'

export type AvailabilityStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

const VALID_USERNAME = /^[a-zA-Z0-9_]{3,30}$/

export function useUsernameAvailability(username: string) {
  const [status, setStatus] = useState<AvailabilityStatus>('idle')

  useEffect(() => {
    if (!username) {
      setStatus('idle')
      return
    }

    if (!VALID_USERNAME.test(username)) {
      setStatus('invalid')
      return
    }

    setStatus('checking')

    const t = setTimeout(async () => {
      try {
        const { data } = await api.get('/auth/username_available', {
          params: { username },
        })
        setStatus(data.available ? 'available' : 'taken')
      } catch {
        // Network error — treat as idle so we don't block the user
        setStatus('idle')
      }
    }, 400)

    return () => clearTimeout(t)
  }, [username])

  return status
}

export function useEmailAvailability(email: string) {
  const [status, setStatus] = useState<AvailabilityStatus>('idle')

  useEffect(() => {
    if (!email) {
      setStatus('idle')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus('invalid')
      return
    }

    setStatus('checking')

    const t = setTimeout(async () => {
      try {
        const { data } = await api.get('/auth/email_available', {
          params: { email },
        })
        setStatus(data.available ? 'available' : 'taken')
      } catch {
        setStatus('idle')
      }
    }, 400)

    return () => clearTimeout(t)
  }, [email])

  return status
}
