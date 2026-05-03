import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import api from '../lib/api'

interface DashboardData {
  wanikani_level: number | null
  sync_status: string | null
  last_synced_at: string | null
  learned_kanji: number
  learned_vocabulary: number
  sentence_eligible: number
  daily_streak: number
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get<DashboardData>('/dashboard')
      .then((res) => setData(res.data))
      .catch(() => {
        // If dashboard fails, the protected route guard already handled auth.
        // Just stop loading so we render the empty state.
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-cream relative">
      {/* Bg grid */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(#1a0b2e 1px, transparent 1px), linear-gradient(90deg, #1a0b2e 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Top nav */}
      <header className="relative z-10 px-6 sm:px-12 py-5 flex justify-between items-center border-b-[3px] border-ink">
        <div className="flex items-center gap-2.5">
          <div className="grid place-items-center w-9 h-9 bg-pink-hot border-[2.5px] border-ink rounded-lg font-body font-black text-cream text-xl shadow-hard-sm -rotate-[4deg]">
            蟹
          </div>
          <span className="font-display text-base">KaniCompanion</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden sm:block font-mono text-[0.78rem] opacity-70">
            {user?.username}
          </span>
          <button
            onClick={handleLogout}
            className="font-mono text-[0.78rem] uppercase tracking-wider text-ink/60 hover:text-pink-hot transition-colors"
          >
            Log out
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 max-w-[1400px] mx-auto px-6 sm:px-12 py-10">
        <span className="inline-block font-mono text-[0.7rem] uppercase tracking-[0.15em] text-pink-hot font-bold mb-3 px-2.5 py-1 bg-cream border-2 border-pink-hot rounded-md">
          // dashboard
        </span>
        <h1 className="font-display text-[clamp(2rem,4.5vw,3.2rem)] leading-[0.95] tracking-[-0.03em] mb-2">
          Hey,{' '}
          <span className="relative inline-block text-pink-hot">
            {user?.username || 'there'}
            <span
              className="absolute bottom-0.5 left-0 right-0 h-2 bg-yellow-pop -z-10"
              style={{ transform: 'skew(-8deg)' }}
            />
          </span>
        </h1>
        <p className="text-lg opacity-75 mb-10">Ready to drill?</p>

        {loading ? (
          <div className="font-mono text-sm opacity-60">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <DashCard
              label="WaniKani Level"
              value={data?.wanikani_level?.toString() || '—'}
              variant="pink"
            />
            <DashCard
              label="Daily Streak"
              value={`${data?.daily_streak ?? 0} 日`}
              variant="yellow"
            />
            <DashCard
              label="Kanji Learned"
              value={data?.learned_kanji?.toString() || '0'}
              variant="purple"
            />
            <DashCard
              label="Sentences Ready"
              value={data?.sentence_eligible?.toString() || '0'}
              variant="mint"
            />
          </div>
        )}

        {/* Big CTA cards — placeholder for now */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white border-[3px] border-ink rounded-[18px] p-8 shadow-hard-md transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[9px_9px_0_#1a0b2e] cursor-pointer">
            <div className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-pink-hot font-bold mb-3">
              // QUICK START
            </div>
            <h3 className="font-display text-2xl mb-2 tracking-[-0.02em]">
              Kanji & Vocab Practice
            </h3>
            <p className="text-base opacity-75 mb-4">
              Drill radicals, kanji, or vocab. Pick your levels and modes.
            </p>
            <span className="font-mono text-sm font-bold text-pink-hot">
              Coming soon →
            </span>
          </div>

          <div className="bg-purple-electric text-cream border-[3px] border-ink rounded-[18px] p-8 shadow-hard-md transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[9px_9px_0_#1a0b2e] cursor-pointer">
            <div className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-yellow-pop font-bold mb-3">
              // GURU UNLOCK
            </div>
            <h3 className="font-display text-2xl mb-2 tracking-[-0.02em]">
              Sentence Practice
            </h3>
            <p className="text-base opacity-85 mb-4">
              Practice with sentences and word combinations from your Guru+ items.
            </p>
            <span className="font-mono text-sm font-bold text-yellow-pop">
              Coming soon →
            </span>
          </div>
        </div>

        {/* Sync status */}
        {data?.sync_status && (
          <div className="mt-8 inline-flex items-center gap-3 bg-white border-2 border-ink rounded-full px-4 py-2 shadow-hard-sm">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                data.sync_status === 'completed'
                  ? 'bg-[#00b76a]'
                  : data.sync_status === 'syncing'
                  ? 'bg-yellow-pop animate-pulse'
                  : data.sync_status === 'failed'
                  ? 'bg-pink-hot'
                  : 'bg-ink/30'
              }`}
            />
            <span className="font-mono text-[0.78rem] uppercase tracking-wider">
              Sync: {data.sync_status}
            </span>
          </div>
        )}
      </main>
    </div>
  )
}

function DashCard({
  label,
  value,
  variant,
}: {
  label: string
  value: string
  variant: 'pink' | 'yellow' | 'purple' | 'mint'
}) {
  const variants = {
    pink: 'bg-pink-hot text-cream',
    yellow: 'bg-yellow-pop text-ink',
    purple: 'bg-purple-electric text-cream',
    mint: 'bg-mint text-ink',
  }
  return (
    <div
      className={`border-[3px] border-ink rounded-[18px] p-5 shadow-hard-md transition-all hover:-translate-y-1 hover:shadow-[8px_8px_0_#1a0b2e] ${variants[variant]}`}
    >
      <div className="font-mono text-[0.65rem] uppercase tracking-[0.1em] font-bold opacity-80 mb-1">
        {label}
      </div>
      <div className="font-display text-3xl tracking-[-0.02em]">{value}</div>
    </div>
  )
}
