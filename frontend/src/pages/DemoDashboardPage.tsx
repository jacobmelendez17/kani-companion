import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import api from '../lib/api'
import { useAuth } from '../lib/auth'

type SubjectType = 'radical' | 'kanji' | 'vocabulary'

interface DemoSubject {
  id: number
  characters: string
  subject_type: SubjectType
  level: number
  meaning: string
  reading: string | null
  slug: string
}

const typeColor: Record<SubjectType, string> = {
  radical:    'bg-blue-400 text-white',
  kanji:      'bg-pink-hot text-cream',
  vocabulary: 'bg-purple-electric text-cream',
}

const typeLabel: Record<SubjectType, string> = {
  radical:    'R',
  kanji:      '漢',
  vocabulary: 'V',
}

const baseURL = import.meta.env.VITE_API_BASE_URL || ''

export default function DemoDashboardPage() {
  const navigate = useNavigate()
  const { user, fetchUser } = useAuth()

  const [levels, setLevels] = useState<Record<number, DemoSubject[]>>({})
  const [starting, setStarting] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // If already a real (non-demo) logged-in user, redirect to dashboard
  useEffect(() => {
    if (user && !user.demo) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, navigate])

  // Bootstrap: start the demo session, then load subjects
  useEffect(() => {
    async function init() {
      setStarting(true)
      try {
        // Only create a new demo session if we don't already have one
        const existing = localStorage.getItem('auth_token')
        if (!existing || !user?.demo) {
          const { data } = await axios.post(`${baseURL}/api/v1/demo/session`, {})
          localStorage.setItem('auth_token', data.token)
          // Sync the auth store so practice pages work normally
          await fetchUser()
        }

        // Load level 1-3 subjects for display
        const { data } = await api.get<{ levels: Record<string, DemoSubject[]> }>('/demo/subjects')
        // Convert string keys to numbers
        const parsed: Record<number, DemoSubject[]> = {}
        for (const [k, v] of Object.entries(data.levels)) {
          parsed[Number(k)] = v
        }
        setLevels(parsed)
        setReady(true)
      } catch {
        setError('Could not start the demo. Please try again.')
      } finally {
        setStarting(false)
      }
    }

    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function exitDemo() {
    localStorage.removeItem('auth_token')
    navigate('/')
  }

  const totalKanji = Object.values(levels).flat().filter(s => s.subject_type === 'kanji').length
  const totalVocab = Object.values(levels).flat().filter(s => s.subject_type === 'vocabulary').length

  if (starting) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="font-mono text-sm opacity-60">Starting demo…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-4">
        <div className="font-mono text-sm text-pink-hot">{error}</div>
        <button onClick={() => window.location.reload()} className="font-mono text-sm underline opacity-60">Try again</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream relative">
      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(#1a0b2e 1px, transparent 1px), linear-gradient(90deg, #1a0b2e 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Header */}
      <header className="relative z-10 px-5 sm:px-8 py-4 flex justify-between items-center border-b-[3px] border-ink bg-cream">
        <Link to="/" className="flex items-center gap-2.5 no-underline text-ink">
          <div className="grid place-items-center w-9 h-9 bg-pink-hot border-[2.5px] border-ink rounded-lg font-body font-black text-cream text-xl shadow-hard-sm -rotate-[4deg]">
            蟹
          </div>
          <span className="font-display text-base">KaniCompanion</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline font-mono text-[0.72rem] opacity-50">demo mode · levels 1-3</span>
          <Link
            to="/signup"
            onClick={exitDemo}
            className="px-3.5 py-2 bg-pink-hot text-cream border-[2.5px] border-ink rounded-[8px] font-mono text-[0.72rem] font-bold uppercase no-underline shadow-hard-sm hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform"
          >
            Sign up free →
          </Link>
        </div>
      </header>

      {/* Demo banner */}
      <div className="relative z-10 bg-yellow-pop border-b-[3px] border-ink px-5 sm:px-8 py-3 flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[0.65rem] font-bold uppercase tracking-wider">⚡ Demo mode</span>
          <span className="font-mono text-[0.72rem]">Levels 1-3 unlocked — practice any item or sentence below.</span>
        </div>
        <button onClick={exitDemo} className="font-mono text-[0.65rem] opacity-60 hover:opacity-100 transition-opacity underline">
          Exit demo
        </button>
      </div>

      <main className="relative z-10 max-w-[1200px] mx-auto px-5 sm:px-8 py-8">
        {/* Hero row */}
        <div className="flex justify-between items-end flex-wrap gap-4 mb-8">
          <div>
            <span className="inline-block font-mono text-[0.7rem] uppercase tracking-[0.15em] text-pink-hot font-bold mb-3 px-2.5 py-1 bg-cream border-2 border-pink-hot rounded-md">
              // demo dashboard
            </span>
            <h1 className="font-display text-[clamp(1.8rem,4vw,2.6rem)] leading-[0.95] tracking-[-0.02em] mt-1">
              Levels 1-3 unlocked.
            </h1>
            <p className="text-base opacity-70 mt-1.5">
              {totalKanji} kanji · {totalVocab} vocabulary · all ready to practice.
            </p>
          </div>
          <div className="flex gap-2.5 flex-wrap">
            <Link
              to="/practice/setup"
              className="px-5 py-2.5 bg-ink text-cream border-[2.5px] border-ink rounded-[10px] font-display text-[0.85rem] no-underline transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5"
              style={{ boxShadow: '4px 4px 0 #ff3d8a' }}
            >
              Practice items →
            </Link>
            <Link
              to="/practice/sentence/setup"
              className="px-5 py-2.5 bg-mint text-ink border-[2.5px] border-ink rounded-[10px] font-display text-[0.85rem] no-underline transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5"
              style={{ boxShadow: '4px 4px 0 #8b3dff' }}
            >
              Practice sentences →
            </Link>
          </div>
        </div>

        {/* Level cards */}
        {ready && (
          <div className="flex flex-col gap-6">
            {[1, 2, 3].map((lvl) => {
              const items = levels[lvl] ?? []
              const radicals = items.filter(s => s.subject_type === 'radical')
              const kanji    = items.filter(s => s.subject_type === 'kanji')
              const vocab    = items.filter(s => s.subject_type === 'vocabulary')

              return (
                <div key={lvl} className="bg-white border-[3px] border-ink rounded-[18px] overflow-hidden shadow-hard-md">
                  {/* Level header */}
                  <div className="px-5 py-3.5 bg-ink text-cream flex items-center gap-4">
                    <span className="font-display text-2xl">Level {lvl}</span>
                    <div className="flex gap-2 font-mono text-[0.7rem] opacity-70">
                      {radicals.length > 0 && <span>{radicals.length} radical{radicals.length !== 1 ? 's' : ''}</span>}
                      {kanji.length > 0    && <span>{kanji.length} kanji</span>}
                      {vocab.length > 0    && <span>{vocab.length} vocab</span>}
                    </div>
                    <span className="ml-auto px-2 py-0.5 bg-mint text-ink font-mono text-[0.65rem] rounded-md font-bold uppercase">
                      Unlocked
                    </span>
                  </div>

                  {/* Items grid */}
                  <div className="p-5">
                    {[
                      { label: 'Radicals', items: radicals },
                      { label: 'Kanji', items: kanji },
                      { label: 'Vocabulary', items: vocab },
                    ].filter(g => g.items.length > 0).map((group) => (
                      <div key={group.label} className="mb-4 last:mb-0">
                        <div className="font-mono text-[0.65rem] uppercase tracking-wider opacity-50 mb-2">{group.label}</div>
                        <div className="flex flex-wrap gap-2">
                          {group.items.map((s) => (
                            <div
                              key={s.id}
                              className="group relative"
                              title={`${s.meaning}${s.reading ? ` · ${s.reading}` : ''}`}
                            >
                              <div className={`px-3 py-1.5 border-2 border-ink rounded-lg font-body font-bold text-base cursor-default select-none transition-transform hover:-translate-y-0.5 ${typeColor[s.subject_type]}`}>
                                {s.characters}
                              </div>
                              {/* Hover tooltip */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center pointer-events-none z-20">
                                <div className="bg-ink text-cream text-[0.65rem] font-mono px-2 py-1 rounded-md whitespace-nowrap border border-ink shadow-hard-sm">
                                  {s.meaning}{s.reading ? ` · ${s.reading}` : ''}
                                </div>
                                <div className="w-2 h-2 bg-ink rotate-45 -mt-1" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Signup CTA */}
        <div className="mt-10 bg-ink text-cream border-[3px] border-ink rounded-[18px] p-8 shadow-hard-md flex flex-col sm:flex-row justify-between items-center gap-6">
          <div>
            <div className="font-mono text-[0.72rem] uppercase tracking-wider text-mint mb-2 opacity-80">// ready to go further?</div>
            <div className="font-display text-2xl leading-tight">Connect your WaniKani account<br />to unlock all 60 levels.</div>
          </div>
          <Link
            to="/signup"
            onClick={exitDemo}
            className="flex-shrink-0 px-7 py-3.5 bg-pink-hot text-cream border-[2.5px] border-pink-soft rounded-[12px] font-display text-base no-underline hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform"
            style={{ boxShadow: '4px 4px 0 #ffd60a' }}
          >
            Sign up free →
          </Link>
        </div>
      </main>
    </div>
  )
}
