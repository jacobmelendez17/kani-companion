import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthLayout from '../components/auth/AuthLayout'
import {
  FormField,
  SubmitButton,
  ErrorBanner,
} from '../components/auth/FormControls'
import api from '../lib/api'

export default function ConnectWanikaniPage() {
  const navigate = useNavigate()
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await api.post('/wanikani_profile', { api_token: token.trim() })
      // Sync kicked off in background — head to onboarding while it runs
      navigate('/welcome', { replace: true })
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : null
      setError(message || 'Could not connect your WaniKani account. Check your token.')
    } finally {
      setLoading(false)
    }
  }

  function handleSkip() {
    navigate('/welcome', { replace: true })
  }

  return (
    <AuthLayout
      eyebrow="// connect wanikani"
      title={
        <>
          Drop your{' '}
          <span className="relative inline-block text-pink-hot">
            token
            <span
              className="absolute bottom-0.5 left-0 right-0 h-2 bg-yellow-pop -z-10"
              style={{ transform: 'skew(-8deg)' }}
            />
          </span>
          .
        </>
      }
      subtitle="Paste your WaniKani API v2 token to sync your subjects, assignments, and synonyms. We'll encrypt it and never expose it again."
    >
      {error && <ErrorBanner message={error} />}

      <form onSubmit={handleSubmit}>
        <FormField
          label="WaniKani API v2 Token"
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="abcd1234-..."
          autoComplete="off"
          required
          minLength={20}
        />

        {/* Token instructions */}
        <div className="bg-white border-[2.5px] border-ink rounded-[12px] p-4 mb-4 shadow-hard-sm">
          <div className="font-mono text-[0.7rem] uppercase font-bold tracking-[0.08em] text-pink-hot mb-2">
            🔑 How to get your token
          </div>
          <ol className="text-[0.85rem] leading-relaxed space-y-1 list-decimal list-inside opacity-85">
            <li>
              Go to{' '}
              <a
                href="https://www.wanikani.com/settings/personal_access_tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-hot font-bold no-underline hover:underline"
              >
                wanikani.com/settings/personal_access_tokens
              </a>
            </li>
            <li>Click <strong>"Generate a new token"</strong></li>
            <li>Name it something like <em>"KaniCompanion"</em>, leave permissions read-only</li>
            <li>Copy and paste it above ↑</li>
          </ol>
        </div>

        {/* Encryption assurance */}
        <div className="bg-ink text-cream rounded-[10px] p-3.5 mb-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-mint text-ink rounded-lg grid place-items-center text-base flex-shrink-0">
            🔒
          </div>
          <div className="font-mono text-[0.75rem] leading-snug">
            <div className="text-mint font-bold">ENCRYPTED AT REST</div>
            <div className="opacity-80">Never logged. Never sent to your browser. Revokable any time.</div>
          </div>
        </div>

        <SubmitButton loading={loading} disabled={token.trim().length < 20}>
          Connect & sync →
        </SubmitButton>

        <button
          type="button"
          onClick={handleSkip}
          className="w-full mt-3 py-2.5 text-ink/60 font-mono text-[0.78rem] uppercase tracking-wider hover:text-pink-hot transition-colors"
        >
          Skip for now
        </button>
      </form>
    </AuthLayout>
  )
}
