import { useEffect, useRef, useState, useCallback } from 'react'
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import api from '../../lib/api'
import {
  AnswerResponse,
  PracticeSession,
  PracticeSettings,
  SentenceQuestion,
  SentenceToken,
} from '../../lib/practiceTypes'

interface LocationState {
  firstQuestion?: SentenceQuestion
  session?: PracticeSession
}

type Phase = 'asking' | 'feedback'

export default function PracticeSentenceSessionPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state as LocationState) || {}

  const [session, setSession] = useState<PracticeSession | null>(state.session || null)
  const [question, setQuestion] = useState<SentenceQuestion | null>(state.firstQuestion || null)
  const [userAnswer, setUserAnswer] = useState('')
  const [phase, setPhase] = useState<Phase>('asking')
  const [feedback, setFeedback] = useState<AnswerResponse | null>(null)
  const [progress, setProgress] = useState({ answered: 0, total: 0, correct: 0, wrong: 0 })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exitDialogOpen, setExitDialogOpen] = useState(false)

  const [showFurigana, setShowFurigana] = useState(true)
  const [hoveredToken, setHoveredToken] = useState<number | null>(null)
  const [settings, setSettings] = useState<PracticeSettings | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.get('/practice_setting').then((r) => {
      setSettings(r.data)
      if (typeof r.data.furigana_default_visible === 'boolean') {
        setShowFurigana(r.data.furigana_default_visible)
      }
    }).catch(() => { /* settings optional */ })
  }, [])

  useEffect(() => {
    if (question || !id) return
    api
      .get(`/practice_sessions/${id}`)
      .then((r) => {
        setSession(r.data.session)
        setQuestion(r.data.next_question as SentenceQuestion)
        if (r.data.session) {
          setProgress({
            answered: r.data.session.correct_count + r.data.session.incorrect_count,
            total: r.data.session.total_questions,
            correct: r.data.session.correct_count,
            wrong: r.data.session.incorrect_count,
          })
        }
        if (!r.data.next_question) {
          navigate(`/practice/sentence/session/${id}/summary`, { replace: true })
        }
      })
      .catch(() => setError('Could not load session.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (question && progress.total === 0) {
      setProgress((p) => ({ ...p, total: question.total }))
    }
  }, [question, progress.total])

  useEffect(() => {
    if (phase === 'asking' && inputRef.current) {
      inputRef.current.focus()
    }
  }, [phase, question?.subject_id])

  useEffect(() => {
    setHoveredToken(null)
  }, [question?.subject_id])

  const submitAnswer = useCallback(async () => {
    if (!id || !question || submitting || !userAnswer.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const { data } = await api.post<AnswerResponse>(
        `/practice_sessions/${id}/answer`,
        { answer: userAnswer }
      )
      setFeedback(data)
      setProgress(data.progress)
      setPhase('feedback')
    } catch {
      setError('Could not submit answer.')
    } finally {
      setSubmitting(false)
    }
  }, [id, question, submitting, userAnswer])

  const advance = useCallback(async () => {
    if (!feedback) return
    if (feedback.is_last) {
      try {
        await api.post(`/practice_sessions/${id}/complete`)
      } catch { /* fall through */ }
      navigate(`/practice/sentence/session/${id}/summary`, { replace: true })
      return
    }
    setQuestion(feedback.next_question as SentenceQuestion)
    setUserAnswer('')
    setFeedback(null)
    setPhase('asking')
  }, [feedback, id, navigate])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (exitDialogOpen) {
        if (e.key === 'Escape') setExitDialogOpen(false)
        return
      }
      if (phase === 'feedback') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          advance()
        } else if (e.key === 'Escape') {
          setExitDialogOpen(true)
        }
      } else if (phase === 'asking') {
        if (e.key === 'Escape') setExitDialogOpen(true)
        if ((e.key === 'f' || e.key === 'F') && document.activeElement !== inputRef.current) {
          setShowFurigana((v) => !v)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, advance, exitDialogOpen])

  // "End session" goes straight to dashboard (per user's choice).
  // "Return to setup" goes back to /practice/sentence/setup; session stays in_progress.
  async function handleEndSession() {
    if (!id) return
    try {
      await api.post(`/practice_sessions/${id}/abandon`)
    } catch { /* ignore */ }
    setExitDialogOpen(false)
    navigate('/dashboard')
  }

  function handleReturnToSetup() {
    setExitDialogOpen(false)
    navigate('/practice/sentence/setup')
  }

  if (error && !question) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-4">
        <div className="bg-pink-soft border-2 border-pink-hot rounded-[10px] p-4 font-mono text-sm shadow-hard-sm">
          {error}
        </div>
        <Link to="/dashboard" className="font-mono text-[0.78rem] uppercase tracking-wider text-ink/70 hover:text-pink-hot">
          ← Back to dashboard
        </Link>
      </div>
    )
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center font-mono text-sm opacity-60">
        Loading…
      </div>
    )
  }

  const progressPercent = progress.total > 0 ? (progress.answered / progress.total) * 100 : 0
  const breakdownMode = settings?.breakdown_panel_mode || 'on_incorrect'
  const showBreakdown =
    phase === 'feedback' && feedback && (
      breakdownMode === 'always' || (breakdownMode === 'on_incorrect' && !feedback.correct)
    )

  return (
    <div className="min-h-screen bg-cream flex flex-col relative">
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(#1a0b2e 1px, transparent 1px), linear-gradient(90deg, #1a0b2e 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <header className="relative px-5 sm:px-8 py-4 flex justify-between items-center gap-5 border-b-[3px] border-ink bg-cream z-10">
        <button
          onClick={() => setExitDialogOpen(true)}
          className="w-9 h-9 rounded-full border-2 border-ink/30 text-ink/50 hover:border-pink-hot hover:text-pink-hot transition-colors flex items-center justify-center text-lg"
          aria-label="Exit session"
        >
          ×
        </button>

        <div className="flex-1 max-w-[500px]">
          <div className="h-3 bg-ink/10 border-2 border-ink rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-purple-electric border-r-2 border-ink"
              initial={false}
              animate={{ width: `${Math.max(2, progressPercent)}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <div className="mt-1 flex justify-between font-mono text-[0.65rem] opacity-65 uppercase tracking-wider">
            <span>Sentence {progress.answered + (phase === 'asking' ? 1 : 0)} of {progress.total}</span>
            <span>{progress.total - progress.answered} left</span>
          </div>
        </div>

        <div className="flex gap-4 font-mono text-[0.78rem]">
          <div>
            <div className="text-[0.6rem] opacity-55 uppercase tracking-wider">Correct</div>
            <div className="font-display text-base text-[#00b76a]">{progress.correct}</div>
          </div>
          <div>
            <div className="text-[0.6rem] opacity-55 uppercase tracking-wider">Wrong</div>
            <div className="font-display text-base text-pink-hot">{progress.wrong}</div>
          </div>
        </div>
      </header>

      <main className="relative flex-1 px-5 sm:px-8 py-8 max-w-[900px] mx-auto w-full z-10">
        <div className="flex flex-wrap gap-2 justify-center mb-4">
          <span
            className="inline-flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.15em] bg-ink text-mint px-3 py-1.5 rounded-full border-2 border-ink"
            style={{ boxShadow: '3px 3px 0 #ff3d8a' }}
          >
            // TRANSLATE
          </span>
          <span className={`inline-flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-wider px-2.5 py-1 rounded-full border-2 border-ink font-bold ${
            question.stage <= 4 ? 'bg-yellow-pop' : 'bg-mint'
          }`}>
            {question.stage_label}
          </span>
          <button
            onClick={() => setShowFurigana((v) => !v)}
            className={`inline-flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-wider px-2.5 py-1 rounded-full border-2 border-ink font-bold hover:bg-pink-soft transition-colors ${
              showFurigana ? 'bg-mint' : 'bg-white'
            }`}
            title="Toggle furigana (F)"
          >
            ふ {showFurigana ? 'ON' : 'OFF'}
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${question.subject_id}-${question.phrase_id}`}
            initial={{ opacity: 0, y: 20, rotate: -3 }}
            animate={{ opacity: 1, y: 0, rotate: -1 }}
            exit={{ opacity: 0, y: -16, rotate: 1 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white border-[3px] border-ink rounded-3xl overflow-hidden mx-auto max-w-[760px]"
            style={{ boxShadow: '8px 8px 0 #1a0b2e' }}
          >
            <div className="relative bg-pink-hot text-cream p-7 sm:p-10 text-center">
              <span className="absolute top-3 left-4 font-mono text-[0.62rem] uppercase tracking-wider opacity-85">
                ⌐ {question.source.toUpperCase()}
                {question.source === 'tatoeba' && question.source_id && (
                  <span className="opacity-60"> #{question.source_id}</span>
                )}
              </span>
              <span className="absolute top-3 right-4 font-mono text-[0.62rem] uppercase tracking-wider opacity-85">
                LEVEL {question.level}
              </span>

              <div className="my-3 sm:my-5">
                <TokenizedSentence
                  tokens={question.tokens || []}
                  fallback={question.japanese}
                  showFurigana={showFurigana}
                  hoveredIndex={hoveredToken}
                  onHover={setHoveredToken}
                  targetSubjectId={question.subject_id}
                />
              </div>
            </div>

            <div className="bg-ink text-cream px-5 py-3 flex justify-between items-center font-mono text-[0.65rem] uppercase tracking-wider gap-2 flex-wrap">
              <span>{question.length} chars</span>
              <span className="opacity-65">click any word for info</span>
            </div>
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {hoveredToken !== null && question.tokens && question.tokens[hoveredToken] && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mt-3 mx-auto max-w-[600px] bg-white border-[2.5px] border-ink rounded-xl p-4 shadow-hard-md"
            >
              <TokenInfo
                token={question.tokens[hoveredToken]}
                hideTargetMeaning={phase === 'asking' && question.tokens[hoveredToken].subject_id === question.subject_id}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {phase === 'feedback' && feedback ? (
            <motion.div
              key="feedback"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div
                className={`mt-6 rounded-2xl border-[3px] border-ink p-5 text-center ${
                  feedback.correct ? 'bg-mint text-ink' : 'bg-pink-hot text-cream'
                }`}
                style={{ boxShadow: '5px 5px 0 #1a0b2e' }}
              >
                <div className="font-display text-[0.85rem] uppercase tracking-[0.15em] opacity-90">
                  {feedback.correct ? '✓ CORRECT' : '✕ NOT QUITE'}
                </div>
                {!feedback.correct && (
                  <div className="mt-1.5 font-mono text-sm opacity-85">
                    You said: <s>{userAnswer || '—'}</s>
                  </div>
                )}
                <div className="font-body font-bold text-lg mt-2">
                  "{feedback.expected.primary}"
                </div>
                {feedback.srs_change && <SrsChangeBadge change={feedback.srs_change} />}
              </div>

              {showBreakdown && feedback.vocab_breakdown && feedback.vocab_breakdown.length > 0 && (
                <div className="mt-4 bg-white border-[2.5px] border-ink rounded-2xl p-5 shadow-hard-md">
                  <div className="font-mono text-[0.65rem] uppercase tracking-[0.12em] opacity-60 mb-2.5">
                    // VOCAB IN THIS SENTENCE
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {feedback.vocab_breakdown.map((item) => (
                      <div
                        key={item.subject_id}
                        className={`p-2.5 border-2 border-ink rounded-md ${
                          item.is_target ? 'bg-yellow-pop' : 'bg-cream'
                        }`}
                      >
                        <div className="font-body font-black text-base">
                          {item.characters}
                          {item.is_target && <span className="text-pink-hot ml-1">★</span>}
                        </div>
                        {item.reading && (
                          <div className="font-body text-[0.7rem] opacity-65">{item.reading}</div>
                        )}
                        {item.meaning && (
                          <div className="font-mono text-[0.6rem] opacity-65 uppercase truncate">
                            {item.meaning}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-center mt-6">
                <button
                  onClick={advance}
                  autoFocus
                  className="px-6 py-3.5 bg-ink text-cream border-[3px] border-ink rounded-2xl font-display text-base hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform"
                  style={{ boxShadow: '5px 5px 0 #8b3dff' }}
                >
                  {feedback.is_last ? 'See summary →' : 'Next sentence →'}
                </button>
                <div className="mt-3 font-mono text-[0.7rem] opacity-55">
                  <Kbd>Enter</Kbd> or <Kbd>Space</Kbd> to continue
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6"
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  submitAnswer()
                }}
                className="bg-white border-[3px] border-ink rounded-2xl p-5 sm:p-6"
                style={{ boxShadow: '6px 6px 0 #1a0b2e' }}
              >
                <label className="font-mono text-[0.7rem] uppercase font-bold tracking-[0.1em] mb-2 opacity-70 flex justify-between items-center">
                  <span>// YOUR TRANSLATION</span>
                  <span className="normal-case opacity-55 text-[0.7rem]">
                    articles, punctuation optional
                  </span>
                </label>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    ref={inputRef}
                    type="text"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="type the English translation…"
                    disabled={submitting}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    className="flex-1 px-4 py-3.5 border-[2.5px] border-ink rounded-xl font-body text-base font-medium bg-cream/60 outline-none focus:border-pink-hot focus:bg-cream transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={submitting || !userAnswer.trim()}
                    className="px-5 py-3.5 bg-ink text-cream border-[2.5px] border-ink rounded-xl font-display text-sm disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:-translate-x-0.5 enabled:hover:-translate-y-0.5 transition-transform"
                    style={{ boxShadow: '4px 4px 0 #ff3d8a' }}
                  >
                    Submit →
                  </button>
                </div>
                <div className="mt-3 font-mono text-[0.7rem] opacity-55 text-center">
                  <Kbd>Enter</Kbd> submit · <Kbd>F</Kbd> furigana · <Kbd>Esc</Kbd> exit
                </div>
                {error && (
                  <div className="mt-3 bg-pink-soft border-2 border-pink-hot rounded-md p-2 font-mono text-[0.78rem]">
                    ⚠ {error}
                  </div>
                )}
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {exitDialogOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/70 z-50 flex items-center justify-center p-6"
            onClick={() => setExitDialogOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-cream border-[3px] border-ink rounded-2xl p-6 max-w-[460px] w-full shadow-hard-lg"
            >
              <h3 className="font-display text-xl mb-2">Leaving so soon?</h3>
              <p className="text-sm opacity-75 mb-5 leading-relaxed">
                You're {progress.answered} of {progress.total} sentences in. Pick what to do:
              </p>
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => setExitDialogOpen(false)}
                  className="w-full text-left px-4 py-3 bg-mint border-[2.5px] border-ink rounded-lg shadow-hard-sm hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform"
                >
                  <div className="font-display text-[0.85rem]">Keep going →</div>
                </button>
                <button
                  onClick={handleReturnToSetup}
                  className="w-full text-left px-4 py-3 bg-white border-[2.5px] border-ink rounded-lg shadow-hard-sm hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform"
                >
                  <div className="font-display text-[0.85rem]">Return to setup</div>
                  <div className="font-mono text-[0.7rem] opacity-65 mt-0.5">
                    Save progress · pick different filters
                  </div>
                </button>
                <button
                  onClick={handleEndSession}
                  className="w-full text-left px-4 py-3 bg-ink text-cream border-[2.5px] border-ink rounded-lg hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform"
                  style={{ boxShadow: '3px 3px 0 #ff3d8a' }}
                >
                  <div className="font-display text-[0.85rem]">End session</div>
                  <div className="font-mono text-[0.7rem] opacity-75 mt-0.5">
                    Done for now · go to dashboard
                  </div>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Renders the SRS change badge for the feedback banner. Three modes:
//   - gated:    "⏳ SRS GATED · next review in 4h"
//   - promoted: "↑ APPRENTICE 2 → APPRENTICE 3 · next in 8h"
//   - demoted:  "↓ APPRENTICE 3 → APPRENTICE 2 · next in 4h"
function SrsChangeBadge({ change }: { change: NonNullable<AnswerResponse['srs_change']> }) {
  const c = change as {
    gated?: boolean
    previous: string
    current: string
    direction: 'promoted' | 'demoted' | null
    next_review_in?: string | null
  }

  if (c.gated) {
    return (
      <div className="mt-3 inline-flex items-center gap-2 bg-black/15 px-3 py-1 rounded-full font-mono text-[0.7rem] uppercase tracking-wider font-bold">
        ⏳ SRS GATED · {c.current}{c.next_review_in ? ` · next in ${c.next_review_in}` : ''}
      </div>
    )
  }

  return (
    <div className="mt-3 inline-flex items-center gap-2 bg-black/15 px-3 py-1 rounded-full font-mono text-[0.7rem] uppercase tracking-wider font-bold">
      {c.direction === 'promoted' ? '↑' : '↓'} {c.previous} → {c.current}
      {c.next_review_in && <span className="opacity-75">· next in {c.next_review_in}</span>}
    </div>
  )
}

// Renders the sentence as hoverable tokens.
// All tokens (kanji, kana, particles) are now hoverable — even ones without WK matches.
// Target word gets the yellow highlight visible during asking too.
function TokenizedSentence({
  tokens,
  fallback,
  showFurigana,
  hoveredIndex,
  onHover,
  targetSubjectId,
}: {
  tokens: SentenceToken[]
  fallback: string
  showFurigana: boolean
  hoveredIndex: number | null
  onHover: (i: number | null) => void
  targetSubjectId: number
}) {
  if (!tokens || tokens.length === 0) {
    return (
      <span className="font-body font-bold leading-[1.6] text-[clamp(1.3rem,3vw,1.9rem)]">
        {fallback}
      </span>
    )
  }

  return (
    <span className="inline-block font-body font-bold leading-[1.7] text-[clamp(1.3rem,3vw,1.9rem)]">
      {tokens.map((t, i) => {
        const showRuby = showFurigana && t.is_kanji && t.reading_hira
        const isHovered = hoveredIndex === i
        const isTarget = t.subject_id === targetSubjectId

        // Target gets the persistent yellow highlight — re-added per user request.
        // ALL tokens are hoverable; non-target hovered tokens get a softer pop.
        const className = [
          'token',
          'token-clickable',
          isHovered ? 'token-hovered' : '',
          isTarget ? 'token-target' : ''
        ].filter(Boolean).join(' ')

        return (
          <span
            key={i}
            className={className}
            onMouseEnter={() => onHover(i)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onHover(isHovered ? null : i)}
          >
            {showRuby ? (
              <ruby>
                {t.surface}
                <rt>{t.reading_hira}</rt>
              </ruby>
            ) : (
              t.surface
            )}
          </span>
        )
      })}

      <style>{`
        .token {
          position: relative;
          padding: 0 1px;
          border-radius: 3px;
          cursor: pointer;
          transition: background 0.12s, color 0.12s;
        }
        .token-hovered {
          background: rgba(255, 255, 255, 0.45);
          color: #1a0b2e;
        }
        .token-target {
          background: #ffd60a;
          color: #1a0b2e;
          padding: 0 4px;
          border-radius: 4px;
        }
        .token-target.token-hovered {
          background: #ffd60a;
          box-shadow: 0 0 0 2px rgba(26, 11, 46, 0.5);
        }
        ruby {
          ruby-position: over;
        }
        rt {
          font-size: 0.45em;
          font-family: 'Zen Maru Gothic', sans-serif;
          font-weight: 500;
          opacity: 0.85;
          line-height: 1.1;
        }
      `}</style>
    </span>
  )
}

// Hover popover. Three cases:
//   - Target during asking: hide the meaning (don't spoil the answer), show "answer first"
//   - Token matches a WK subject: show full WK info
//   - No WK match (particles, katakana loanwords, grammar): show surface + reading + part of speech
function TokenInfo({
  token,
  hideTargetMeaning,
}: {
  token: SentenceToken
  hideTargetMeaning: boolean
}) {
  // Asking + target = hide meaning, show position only
  if (hideTargetMeaning) {
    return (
      <div className="text-center">
        <div className="font-body font-black text-2xl mb-1 text-pink-hot">{token.surface}</div>
        <div className="font-mono text-[0.7rem] opacity-65 italic">
          ⓘ This is the word you need to translate
        </div>
        <div className="font-mono text-[0.65rem] opacity-50 mt-1">
          (answer first to see its meaning)
        </div>
      </div>
    )
  }

  // WK-known word: show full info
  if (token.subject_info) {
    const info = token.subject_info
    return (
      <div className="flex items-start gap-4">
        <div className="font-body font-black text-3xl">{info.characters}</div>
        <div className="flex-1">
          <div className="font-mono text-[0.6rem] uppercase tracking-wider opacity-55 mb-1">
            {info.type} · LEVEL {info.level}
            {!info.unlocked && <span className="ml-2 text-pink-hot">· not unlocked yet</span>}
          </div>
          {info.reading && (
            <div className="font-body text-base opacity-75">{info.reading}</div>
          )}
          {info.meaning && (
            <div className="font-body font-bold text-base mt-0.5">{info.meaning}</div>
          )}
        </div>
      </div>
    )
  }

  // Other tokens: katakana, particles, grammar — show what we know
  return (
    <div className="text-center">
      <div className="font-body font-black text-2xl mb-1">{token.surface}</div>
      {token.reading_hira && token.reading_hira !== token.surface && (
        <div className="font-body text-base opacity-65 mb-1.5">{token.reading_hira}</div>
      )}
      <div className="font-mono text-[0.65rem] uppercase tracking-wider opacity-50">
        {posLabel(token.pos)}
        {token.dictionary_form !== token.surface && ` · base: ${token.dictionary_form}`}
      </div>
    </div>
  )
}

function posLabel(pos: string | null): string {
  if (!pos) return 'unknown'
  const map: Record<string, string> = {
    '名詞': 'noun',
    '動詞': 'verb',
    '形容詞': 'adjective',
    '副詞': 'adverb',
    '助詞': 'particle',
    '助動詞': 'auxiliary',
    '接続詞': 'conjunction',
    '感動詞': 'interjection',
    '連体詞': 'adnominal',
    '記号': 'symbol',
    'フィラー': 'filler',
  }
  return map[pos] || pos
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="bg-ink text-cream px-1.5 py-0.5 rounded text-[0.65rem] mx-0.5">{children}</kbd>
  )
}
