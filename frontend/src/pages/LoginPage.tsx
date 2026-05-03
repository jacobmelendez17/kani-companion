import { useState, FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import AuthLayout from '../components/auth/AuthLayout'
import {
  FormField,
  SubmitButton,
  Divider,
  GoogleButton,
  ErrorBanner,
} from '../components/auth/FormControls'
import { useAuth } from '../lib/auth'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, loading } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const from = (location.state as { from?: string })?.from || '/dashboard'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : null
      setError(message || 'Could not log in. Check your email and password.')
    }
  }

  return (
    <AuthLayout
      eyebrow="// welcome back"
      title={
        <>
          Welcome <span className="relative inline-block text-pink-hot">
            back
            <span
              className="absolute bottom-0.5 left-0 right-0 h-2 bg-yellow-pop -z-10"
              style={{ transform: 'skew(-8deg)' }}
            />
          </span>.
        </>
      }
      subtitle="Pick up where you left off — your streak is waiting."
      footer={
        <>
          New to KaniCompanion?{' '}
          <Link to="/signup" className="text-pink-hot font-bold no-underline hover:underline">
            Create account →
          </Link>
        </>
      }
    >
      {error && <ErrorBanner message={error} />}

      <form onSubmit={handleSubmit}>
        <FormField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
        <FormField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
        <SubmitButton loading={loading}>Log in →</SubmitButton>
      </form>

      <div className="mt-4">
        <Divider />
        <div className="mt-4">
          <GoogleButton />
        </div>
      </div>
    </AuthLayout>
  )
}
