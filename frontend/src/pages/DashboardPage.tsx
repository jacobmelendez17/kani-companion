import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import api from '../lib/api'
import { DashboardData } from '../lib/dashboardTypes'
import LevelHeroCard from '../components/dashboard/LevelHeroCard'
import StreakCard from '../components/dashboard/StreakCard'
import SyncCard from '../components/dashboard/SyncCard'
import StatCard from '../components/dashboard/StatCard'
import RecommendedCard from '../components/dashboard/RecommendedCard'
import WeakItemsCard from '../components/dashboard/WeakItemsCard'
import RecentMistakesCard from '../components/dashboard/RecentMistakesCard'
import DashboardSkeleton from '../components/dashboard/DashboardSkeleton'
import UserMenu from '../components/UserMenu'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user, fetchUser } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = useCallback(async () => {
    setError(null)
    try {
      const res = await api.get<DashboardData>('/dashboard')
      setData(res.data)
    } catch {
      setError('Could not load dashboard data. Try refreshing.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
    // Make sure user has the admin flag loaded for the dropdown
    fetchUser()
  }, [fetchDashboard, fetchUser])

  // Auto-refresh while syncing — poll every 5s
  useEffect(() => {
    if (data?.sync_status !== 'syncing' && data?.sync_status !== 'pending') return
    const interval = setInterval(fetchDashboard, 5000)
    return () => clearInterval(interval)
  }, [data?.sync_status, fetchDashboard])

  const srsBars = data
    ? (() => {
        const d = data.srs_distribution
        const max = Math.max(d.apprentice, d.guru, d.master, d.enlightened, d.burned, 1)
        return [d.apprentice, d.guru, d.master, d.enlightened, d.burned].map(
          (v) => (v / max) * 100
        )
      })()
    : []

  return (
    <div className="min-h-screen bg-cream relative">
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(#1a0b2e 1px, transparent 1px), linear-gradient(90deg, #1a0b2e 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <header className="relative z-10 px-5 sm:px-8 py-4 flex justify-between items-center border-b-[3px] border-ink bg-cream">
        <Link to="/" className="flex items-center gap-2.5 no-underline text-ink">
          <div className="grid place-items-center w-9 h-9 bg-pink-hot border-[2.5px] border-ink rounded-lg font-body font-black text-cream text-xl shadow-hard-sm -rotate-[4deg]">
            蟹
          </div>
          <span className="font-display text-base">KaniCompanion</span>
        </Link>

        <UserMenu showSyncedBadge syncStatus={data?.sync_status as 'completed' | 'pending' | 'syncing' | 'failed' | null} />
      </header>

      <main className="relative z-00 max-w-[1400px] mx-auto px-5 sm:px-8 py-8">
        {/* Greeting + dual CTA buttons */}
        <div className="flex justify-between items-end flex-wrap gap-4 mb-8">
          <div>
            <span className="inline-block font-mono text-[0.7rem] uppercase tracking-[0.15em] text-pink-hot font-bold mb-3 px-2.5 py-1 bg-cream border-2 border-pink-hot rounded-md">
              // dashboard
            </span>
            <h1 className="font-display text-[clamp(1.8rem,4vw,2.6rem)] leading-[0.95] tracking-[-0.02em] mt-1">
              Hey,{' '}
              <span className="relative inline-block text-pink-hot">
                {user?.username || 'there'}
                <span
                  className="absolute bottom-0.5 left-0 right-0 h-2 bg-yellow-pop -z-10"
                  style={{ transform: 'skew(-8deg)' }}
                />
              </span>
              .
            </h1>
            <p className="text-base opacity-70 mt-1.5">Pick your practice mode.</p>
          </div>
          <div className="flex gap-2.5 flex-wrap">
            <Link
              to="/practice/setup"
              className="px-5 py-2.5 bg-ink text-cream border-[2.5px] border-ink rounded-[10px] font-display text-[0.85rem] no-underline transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5"
              style={{ boxShadow: '4px 4px 0 #ff3d8a' }}
            >
              Drill items →
            </Link>
            <Link
              to="/practice/sentence/setup"
              className="px-5 py-2.5 bg-mint text-ink border-[2.5px] border-ink rounded-[10px] font-display text-[0.85rem] no-underline transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5"
              style={{ boxShadow: '4px 4px 0 #8b3dff' }}
            >
              Translate sentences →
            </Link>
          </div>
        </div>

        {data?.sync_status === 'failed' && (
          <div className="bg-pink-soft border-2 border-pink-hot rounded-[10px] px-4 py-3 mb-5 font-mono text-[0.8rem] flex justify-between items-center shadow-hard-sm">
            <span>⚠ Last sync failed: {data.last_sync_error || 'Unknown error'}</span>
          </div>
        )}

        {loading ? (
          <DashboardSkeleton />
        ) : error ? (
          <div className="bg-pink-soft border-2 border-pink-hot rounded-[10px] p-6 font-mono text-sm">
            {error}
          </div>
        ) : data ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <LevelHeroCard data={data} />
            <StreakCard data={data} />
            <SyncCard data={data} onResync={fetchDashboard} />

            <StatCard
              label="// KANJI LEARNED"
              value={data.learned_kanji}
              subline={
                data.learned_kanji_weekly > 0
                  ? `+${data.learned_kanji_weekly} this week`
                  : 'across all levels'
              }
              variant="default"
              bars={srsBars}
            />
            <StatCard
              label="// VOCAB LEARNED"
              value={data.learned_vocabulary}
              subline={
                data.learned_vocabulary_weekly > 0
                  ? `+${data.learned_vocabulary_weekly} this week`
                  : 'across all levels'
              }
              variant="pink"
              bars={srsBars}
              barColors={[
                'bg-pink-soft',
                'bg-pink-hot',
                'bg-purple-electric',
                'bg-purple-deep',
                'bg-ink',
              ]}
            />
            <StatCard
              label="// SENTENCES READY"
              value={data.sentence_eligible}
              subline="Guru+ items unlocked"
              variant="mint"
              bars={[100, 80, 60, 40, 20]}
              barColors={['bg-mint', 'bg-mint', 'bg-mint', 'bg-mint', 'bg-mint']}
            />

            <RecommendedCard data={data} />
            <WeakItemsCard data={data} />
            <RecentMistakesCard data={data} />
          </div>
        ) : null}
      </main>
    </div>
  )
}
