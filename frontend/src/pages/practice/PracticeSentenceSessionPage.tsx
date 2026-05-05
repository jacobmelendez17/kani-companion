import { useEffect, useRef, useState, useCallback } from 'react'
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import api from '../../lib/api'
import {
  AnswerResponse,
  PracticeSession,
  PracticeSettings,
  SentenceQuestion,
} from '../../lib/practiceTypes'
import { renderJapaneseHtml, highlightTarget } from '../../lib/furigana'

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

  // Furigana toggle (default ON per user choice, persisted)
  const [showFurigana, setShowFurigana] = useState(true)

  // Settings (for breakdown panel mode)
  const [settings, setSettings] = useState<PracticeSettings | null>(null)

  // Rendered Japanese HTML (with furigana) — async
  const [renderedJa, setRenderedJa] = useState<string>('')
  const [renderingJa, setRenderingJa] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  // Load settings (for breakdown panel mode + furigana default)
  useEffect(() => {
    api.get('/practice_setting').then((r) => {
      setSettings(r.data)
      if (typeof r.data.furigana_default_visible === 'boolean') {
        setShowFurigana(r.data.furigana_default_visible)
      }
    }).catch(() => {/* settings optional */})
  }, [])

  // Initialize question if not in nav state
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

  // Render Japanese with furigana (async — kuroshiro takes time on first load)
  useEffect(() => {
    if (!question) return
    setRenderingJa(true)
    let canceled = false

    renderJapaneseHtml(question.japanese, { showFurigana })
      .then((html) => {
        if (canceled) return
        // Highlight the target word inside the rendered HTML.
        // Note: highlighting AFTER ruby tags requires a more careful approach;
        // we do a best-effort by wrapping the target characters wherever they appear.
        const highlighted = highlightInRubyHtml(html, question.characters)
        setRenderedJa(highlighted)
      })
      .catch(() => {
        if (canceled) return
        setRenderedJa(highlightTarget(question.japanese, question.characters))
      })
      .finally(() => {
        if (!canceled) setRenderingJa(false)
      })

    return () => {
      canceled = true
    }
  }, [question, showFurigana])

  // Auto-focus input when asking
  useEffect(() => {
    if (phase === 'asking' && inputRef.current) {
      inputRef.current.focus()
    }
  }, [phase, question?.subject_id])

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
      } catch {/* continue regardless */}
      navigate(`/practice/sentence/session/${id}/summary`, { replace: true })
      return
    }

    setQuestion(feedback.next_question as SentenceQuestion)
    setUserAnswer('')
    setFeedback(null)
    setPhase('asking')
  }, [feedback, id, navigate])

  // Keyboard shortcuts
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
        if (e.key === 'f' || e.key === 'F') {
          // Don't trigger if user is typing in the input
          if (document.activeElement !== inputRef.current) {
            setShowFurigana((v) => !v)
          }
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, advance, exitDialogOpen])

  async function handleEndSession() {
    if (!id) return
    try {
      await api.post(`/practice_sessions/${id}/abandon`)
    } catch {/* ignore */}
    setExitDialogOpen(false)
    navigate('/dashboard')
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

  // Decide whether to show breakdown panel based on user setting
  const breakdownMode = settings?.breakdown_panel_mode || 'on_incorrect'
  const showBreakdown =
    phase === 'feedback' && feedback && (
      breakdownMode === 'always' ||
      (breakdownMode === 'on_incorrect' && !feedback.correct)
    )

  return (
    <div className="min-h-screen bg-cream flex flex-col relative">
      {/* Subtle bg grid */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(#1a0b2e 1px, transparent 1px), linear-gradient(90deg, #1a0b2e 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Top progress bar */}
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
        {/* Top tags row */}
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
            {question.stage_label} · {question.stage <= 4 ? 'PHRASE' : 'CONTEXT SENTENCE'}
          </span>
          <button
            onClick={() => setShowFurigana((v) => !v)}
            className="inline-flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-wider px-2.5 py-1 rounded-full border-2 border-ink bg-white font-bold hover:bg-pink-soft"
            title="Toggle furigana (F)"
          >
            ふ {showFurigana ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* The Floating Card */}
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
            {/* Pink header section with the Japanese */}
            <div className="relative bg-pink-hot text-cream p-7 sm:p-10 text-center">
              <span className="absolute top-3 left-4 font-mono text-[0.62rem] uppercase tracking-wider opacity-85">
                ⌐ FROM {question.source.toUpperCase()}
                {question.source === 'tatoeba' && question.source_id && (
                  <span className="opacity-60"> #{question.source_id}</span>
                )}
              </span>
              <span className="absolute top-3 right-4 font-mono text-[0.62rem] uppercase tracking-wider opacity-85">
                LV {question.level} · {question.characters}
              </span>

              <div className="my-3 sm:my-5">
                {renderingJa ? (
                  <div className="opacity-60 font-mono text-sm">rendering…</div>
                ) : (
                  <div
                    className="ja-sentence font-body font-bold leading-[1.6] tracking-wider text-[clamp(1.3rem,3vw,1.9rem)]"
                    dangerouslySetInnerHTML={{ __html: renderedJa }}
                  />
                )}
              </div>

              {question.source === 'tatoeba' && showFurigana && (
                <div className="font-mono text-[0.6rem] opacity-60 mt-2">
                  ⓘ Furigana auto-generated
                </div>
              )}
            </div>

            {/* Dark footer with metadata */}
            <div className="bg-ink text-cream px-5 py-3 flex justify-between items-center font-mono text-[0.65rem] uppercase tracking-wider">
              <span>{question.length} chars</span>
              <span>Target: <span className="text-mint">{question.characters}</span> · "{question.target_meaning}"</span>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Feedback / Input area */}
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
                {feedback.srs_change && (
                  <div className="mt-3 inline-flex items-center gap-2 bg-black/15 px-3 py-1 rounded-full font-mono text-[0.7rem] uppercase tracking-wider font-bold">
                    {feedback.srs_change.direction === 'promoted' ? '↑' : '↓'}{' '}
                    {feedback.srs_change.previous} → {feedback.srs_change.current}
                  </div>
                )}
              </div>

              {/* Optional vocab breakdown */}
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

      {/* Exit dialog */}
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
                  onClick={() => navigate('/dashboard')}
                  className="w-full text-left px-4 py-3 bg-white border-[2.5px] border-ink rounded-lg shadow-hard-sm hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform"
                >
                  <div className="font-display text-[0.85rem]">Return to dashboard</div>
                  <div className="font-mono text-[0.7rem] opacity-65 mt-0.5">
                    Save progress · come back later
                  </div>
                </button>
                <button
                  onClick={handleEndSession}
                  className="w-full text-left px-4 py-3 bg-ink text-cream border-[2.5px] border-ink rounded-lg hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform"
                  style={{ boxShadow: '3px 3px 0 #ff3d8a' }}
                >
                  <div className="font-display text-[0.85rem]">End session</div>
                  <div className="font-mono text-[0.7rem] opacity-75 mt-0.5">
                    Done for now · don't come back
                  </div>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .ja-sentence ruby { ruby-position: over; }
        .ja-sentence rt {
          font-size: 0.45em;
          font-family: 'Zen Maru Gothic', sans-serif;
          font-weight: 500;
          opacity: 0.85;
          line-height: 1.1;
        }
        .target-word {
          background: #ffd60a;
          color: #1a0b2e;
          padding: 0 4px;
          border-radius: 4px;
        }
      `}</style>
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="bg-ink text-cream px-1.5 py-0.5 rounded text-[0.65rem] mx-0.5">{children}</kbd>
  )
}

// Best-effort highlighter for the target word inside an HTML string with possible <ruby> tags.
// Looks for the target characters and wraps them in a target-word span. If they're inside ruby,
// we wrap the entire <ruby>…</ruby> block. Imperfect but works for most cases.
function highlightInRubyHtml(html: string, target: string): string {
  if (!target || !html.includes(target)) return html

  // Try to wrap any contiguous occurrence of target characters
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(${escaped})`, 'g')
  return html.replace(re, '<span class="target-word">$1</span>')
}
