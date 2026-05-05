import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import api from '../../lib/api'
import { SessionSummary, SetupParams } from '../../lib/practiceTypes'

export default function PracticeSummaryPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<SessionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [replaying, setReplaying] = useState(false)

  useEffect(() => {
    if (!id) return
    api
      .post<SessionSummary>(`/practice_sessions/${id}/complete`)
      .then((r) => setData(r.data))
      .catch(() => setError('Could not load session summary.'))
      .finally(() => setLoading(false))
  }, [id])

  // "Practice again" — kicks off a brand new session with the EXACT same setup params
  // as the one we just finished, then jumps straight into it (skipping the setup page).
  async function handlePracticeAgain() {
    if (!data?.setup_params || replaying) return
    setReplaying(true)
    try {
      const p: SetupParams = data.setup_params
      const { data: newSession } = await api.post('/practice_sessions', {
        session_type:  p.session_type || 'item',
        item_types:    p.item_types,
        levels:        p.levels,
        count:         p.count || data.summary.total,
        practice_mode: p.practice_mode,
        review_order:  p.review_order || 'random',
      })
      navigate(`/practice/session/${newSession.session.id}`, {
        state: { firstQuestion: newSession.first_question, session: newSession.session },
        replace: true,
      })
    } catch {
      setReplaying(false)
      setError('Could not start a new session. Try again from setup.')
    }
  }

  // "Return to setup" — go back to the setup page with the same params pre-filled
  // so the user can tweak before starting again.
  function handleReturnToSetup() {
    navigate('/practice/setup', {
      state: data?.setup_params ? { setupParams: data.setup_params } : undefined,
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center font-mono text-sm opacity-60">
        Loading summary…
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-4 px-6">
        <div className="bg-pink-soft border-2 border-pink-hot rounded-[10px] p-4 font-mono text-sm shadow-hard-sm">
          ⚠ {error || 'Could not load summary.'}
        </div>
        <Link
          to="/dashboard"
          className="font-mono text-[0.78rem] uppercase tracking-wider text-ink/70 hover:text-pink-hot"
        >
          ← Back to dashboard
        </Link>
      </div>
    )
  }

  const { summary } = data
  const accuracy = summary.accuracy
  const minutes = Math.floor(summary.duration_seconds / 60)
  const seconds = summary.duration_seconds % 60

  const tier =
    accuracy >= 90
      ? { label: 'Excellent!', emoji: '🎉' }
      : accuracy >= 70
      ? { label: 'Good work', emoji: '👏' }
      : accuracy >= 50
      ? { label: 'Keep practicing', emoji: '💪' }
      : { label: "Don't give up", emoji: '🌱' }

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
        <Link to="/dashboard" className="flex items-center gap-2.5 no-underline text-ink">
          <div className="grid place-items-center w-9 h-9 bg-pink-hot border-[2.5px] border-ink rounded-lg font-body font-black text-cream text-xl shadow-hard-sm -rotate-[4deg]">
            蟹
          </div>
          <span className="font-display text-base">KaniCompanion</span>
        </Link>
        <Link
          to="/dashboard"
          className="font-mono text-[0.78rem] uppercase tracking-wider text-ink/60 hover:text-pink-hot transition-colors no-underline"
        >
          Dashboard →
        </Link>
      </header>

      <main className="relative z-10 max-w-[980px] mx-auto px-5 sm:px-8 py-10">
        {/* Hero summary card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="bg-pink-hot text-cream border-[3px] border-ink rounded-3xl p-8 sm:p-10 shadow-hard-xl mb-8 relative overflow-hidden"
        >
          <span
            className="absolute -top-4 -right-2 font-body font-black text-[14rem] leading-none pointer-events-none select-none"
            style={{ color: 'rgba(255,255,255,0.1)' }}
          >
            終
          </span>

          <span className="inline-block font-mono text-[0.7rem] uppercase tracking-[0.15em] font-bold opacity-85 mb-3 relative">
            // SESSION COMPLETE
          </span>

          <h1 className="font-display text-[clamp(2rem,5vw,3.4rem)] leading-[0.95] tracking-[-0.02em] relative">
            {tier.emoji} {tier.label}
          </h1>

          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 relative">
            <SummaryStat label="Accuracy" value={`${accuracy}%`} variant="big" />
            <SummaryStat label="Total" value={summary.total} />
            <SummaryStat label="Correct" value={summary.correct} accent="mint" />
            <SummaryStat label="Wrong" value={summary.wrong} accent="ink" />
          </div>

          <div className="mt-6 font-mono text-[0.78rem] opacity-85 relative">
            ⏱ Took {minutes}m {seconds}s
          </div>
        </motion.div>

        {/* Wrong items list */}
        {summary.wrong_items.length > 0 ? (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="bg-white border-[3px] border-ink rounded-2xl p-6 sm:p-8 shadow-hard-md mb-8"
          >
            <div className="flex justify-between items-baseline mb-4 flex-wrap gap-2">
              <span className="font-display text-base">// REVIEW THESE</span>
              <span className="font-mono text-[0.7rem] opacity-55 uppercase">
                {summary.wrong_items.length} item{summary.wrong_items.length === 1 ? '' : 's'} missed
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {summary.wrong_items.map((item, i) => (
                <motion.div
                  key={`${item.subject_id}-${item.question_type}-${i}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + i * 0.04 }}
                  className="bg-pink-soft/60 border-2 border-ink rounded-xl p-4 flex gap-4 items-start"
                >
                  <div className="font-body font-black text-[2.4rem] leading-none">
                    {item.characters}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[0.6rem] uppercase tracking-wider opacity-65">
                      {item.type} · LV {item.level} · {item.question_type}
                    </div>
                    <div className="mt-1.5">
                      <span className="font-mono text-[0.7rem] opacity-60">You said: </span>
                      <span className="font-body font-bold text-[0.9rem] text-pink-hot line-through">
                        {item.user_answer || '—'}
                      </span>
                    </div>
                    <div className="mt-0.5">
                      <span className="font-mono text-[0.7rem] opacity-60">Answer: </span>
                      <span className="font-body font-bold text-[0.9rem]">
                        {item.expected.primary}
                      </span>
                      {item.expected.accepted.length > 1 && (
                        <span className="font-mono text-[0.7rem] opacity-50 ml-1">
                          (also: {item.expected.accepted
                            .filter((a) => a !== item.expected.primary)
                            .slice(0, 2)
                            .join(', ')})
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        ) : (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="bg-mint/40 border-[3px] border-mint rounded-2xl p-8 text-center mb-8"
          >
            <div className="font-display text-xl">✓ Perfect score</div>
            <p className="opacity-75 mt-2 font-mono text-sm">
              No mistakes this session — go you.
            </p>
          </motion.section>
        )}

        {/* Action buttons — REORDERED per user request:
            left → right: Practice again (same setup) · Return to setup · Return to dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          <button
            onClick={handlePracticeAgain}
            disabled={replaying || !data.setup_params}
            className="px-5 py-4 bg-ink text-cream border-[2.5px] border-ink rounded-[12px] font-display text-[0.9rem] disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:-translate-x-0.5 enabled:hover:-translate-y-0.5 transition-transform"
            style={{ boxShadow: '5px 5px 0 #ff3d8a' }}
          >
            {replaying ? 'Starting…' : 'Practice again →'}
          </button>

          <button
            onClick={handleReturnToSetup}
            className="px-5 py-4 bg-yellow-pop border-[2.5px] border-ink rounded-[12px] font-display text-[0.9rem] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform"
            style={{ boxShadow: '5px 5px 0 #1a0b2e' }}
          >
            Return to setup
          </button>

          <Link
            to="/dashboard"
            className="px-5 py-4 bg-white border-[2.5px] border-ink rounded-[12px] font-display text-[0.9rem] no-underline text-ink text-center hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform"
            style={{ boxShadow: '5px 5px 0 #1a0b2e' }}
          >
            Return to dashboard
          </Link>
        </motion.div>
      </main>
    </div>
  )
}

function SummaryStat({
  label,
  value,
  variant,
  accent,
}: {
  label: string
  value: string | number
  variant?: 'big'
  accent?: 'mint' | 'ink'
}) {
  const valueColor =
    accent === 'mint' ? 'text-mint' : accent === 'ink' ? 'text-ink' : 'text-cream'

  return (
    <div>
      <div className="font-mono text-[0.65rem] uppercase tracking-[0.1em] opacity-75">
        {label}
      </div>
      <div
        className={`font-display leading-[0.95] mt-1 ${
          variant === 'big' ? 'text-[clamp(2.4rem,5vw,3.6rem)]' : 'text-2xl'
        } ${valueColor}`}
      >
        {value}
      </div>
    </div>
  )
}
