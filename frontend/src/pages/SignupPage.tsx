import { useState, FormEvent, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/auth/AuthLayout'
import {
  FormField,
  SubmitButton,
  Divider,
  GoogleButton,
  ErrorBanner,
} from '../components/auth/FormControls'
import { useAuth } from '../lib/auth'
import {
  useUsernameAvailability,
  useEmailAvailability,
  AvailabilityStatus,
} from '../lib/availability'

export default function SignupPage() {
  const navigate = useNavigate()
  const { signup, loading } = useAuth()

  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const usernameStatus = useUsernameAvailability(username)
  const emailStatus = useEmailAvailability(email)

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password])

  const canSubmit =
    emailStatus === 'available' &&
    usernameStatus === 'available' &&
    passwordStrength.level !== 'weak' &&
    !loading

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    try {
      await signup(email, username, password)
      // After successful signup → connect WaniKani token
      navigate('/connect-wanikani', { replace: true })
    } catch (err: unknown) {
      const errors =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { errors?: string[]; error?: string } } }).response
              ?.data
          : null

      if (errors?.errors?.length) {
        setError(errors.errors.join(', '))
      } else if (errors?.error) {
        setError(errors.error)
      } else {
        setError('Could not create account. Try again.')
      }
    }
  }

  return (
    <AuthLayout
      eyebrow="// create account"
      title={
        <>
          Start drilling in{' '}
          <span className="relative inline-block text-pink-hot">
            30 seconds
            <span
              className="absolute bottom-0.5 left-0 right-0 h-2 bg-yellow-pop -z-10"
              style={{ transform: 'skew(-8deg)' }}
            />
          </span>
          .
        </>
      }
      subtitle="Sign up, drop your WaniKani token, and you're practicing. No card. No commitment."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="text-pink-hot font-bold no-underline hover:underline">
            Log in →
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
          status={<StatusBadge status={emailStatus} type="email" />}
        />
        <FormField
          label="Username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="kanji_warrior"
          autoComplete="username"
          minLength={3}
          maxLength={30}
          required
          status={<StatusBadge status={usernameStatus} type="username" />}
        />
        <FormField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          minLength={8}
          required
        />
        {password && <PasswordStrengthMeter strength={passwordStrength} />}

        <SubmitButton loading={loading} disabled={!canSubmit}>
          Create account →
        </SubmitButton>
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

function StatusBadge({ status, type }: { status: AvailabilityStatus; type: 'email' | 'username' }) {
  if (status === 'idle') return null

  if (status === 'checking') {
    return <span className="text-ink/50">…</span>
  }

  if (status === 'available') {
    return <span className="text-[#00b76a]">✓ AVAILABLE</span>
  }

  if (status === 'taken') {
    return (
      <span className="text-pink-hot">
        ✕ {type === 'email' ? 'IN USE' : 'TAKEN'}
      </span>
    )
  }

  if (status === 'invalid') {
    return <span className="text-pink-hot">✕ INVALID</span>
  }

  return null
}

interface PasswordStrength {
  score: number // 0-4
  level: 'weak' | 'medium' | 'strong'
  label: string
}

function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, level: 'weak', label: '' }

  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 2) return { score, level: 'weak', label: 'WEAK' }
  if (score <= 3) return { score, level: 'medium', label: 'MEDIUM' }
  return { score, level: 'strong', label: 'STRONG' }
}

function PasswordStrengthMeter({ strength }: { strength: PasswordStrength }) {
  const colors = {
    weak: 'bg-pink-hot',
    medium: 'bg-yellow-pop',
    strong: 'bg-mint',
  }

  const widths = { weak: 'w-1/3', medium: 'w-2/3', strong: 'w-full' }

  return (
    <div className="mb-4 -mt-2 flex items-center gap-3">
      <div className="flex-1 h-2 bg-ink/10 border-2 border-ink rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${colors[strength.level]} ${widths[strength.level]}`}
        />
      </div>
      <span className="font-mono text-[0.65rem] font-bold uppercase tracking-wider opacity-70 w-14 text-right">
        {strength.label}
      </span>
    </div>
  )
}
