import { useEffect, useRef, useState, useCallback } from 'react'
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { bind, unbind, toHiragana } from 'wanakana'
import api from '../../lib/api'
import {
  PracticeQuestion,
  PracticeSession,
  AnswerResponse,
} from '../../lib/practiceTypes'

interface LocationState {
  firstQuestion?: PracticeQuestion
  session?: PracticeSession
}

type Phase = 'asking' | 'feedback'

export default function PracticeSessionPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state as LocationState) || {}

  const [session, setSession] = useState<PracticeSession | null>(state.session || null)
  const [question, setQuestion] = useState<PracticeQuestion | null>(state.firstQuestion || null)
  const [userAnswer, setUserAnswer] = useState('')
  const [phase, setPhase] = useState<Phase>('asking')
  const [feedback, setFeedback] = useState<AnswerResponse | null>(null)
  const [progress, setProgress] = useState({ answered: 0, total: 0, correct: 0, wrong: 0 })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exitDialogOpen, setExitDialogOpen] = useState(false)
  const [exiting, setExiting] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  // Initialize: fetch session if not in nav state
  useEffect(() => {
    if (question || !id) return

    api
      .get(`/practice_sessions/${id}`)
      .then((r) => {
        setSession(r.data.session)
        setQuestion(r.data.next_question)
        if (r.data.session) {
          setProgress({
            answered: r.data.session.correct_count + r.data.session.incorrect_count,
            total: r.data.session.total_questions,
            correct: r.data.session.correct_count,
            wrong: r.data.session.incorrect_count,
          })
        }
        if (!r.data.next_question) {
          navigate(`/practice/session/${id}/summary`, { replace: true })
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

  // Bind/unbind wanakana for reading questions.
  // CRITICAL: wanakana mutates the input's `value` directly via DOM listeners.
  // React's controlled input would clobber those mutations on the next render.
  // Solution: listen to the `input` event AFTER wanakana has converted, and sync
  // React state from `el.value` rather than from the keystroke.
  useEffect(() => {
    if (phase !== 'asking' || !inputRef.current || !question) return

    const el = inputRef.current
    el.focus()

    if (question.question_type === 'reading') {
      // Bind first, THEN attach our sync listener so it fires after wanakana's listener.
      bind(el, { IMEMode: 'toHiragana' })

      const syncFromDom = () => {
        // Read whatever's in the DOM (wanakana has already done its conversion).
        setUserAnswer(el.value)
      }

      el.addEventListener('input', syncFromDom)

      return () => {
        el.removeEventListener('input', syncFromDom)
        try {
          unbind(el)
        } catch {
          /* element may already be detached */
        }
      }
    }
    // For meaning questions: no IME, normal React-controlled input.
  }, [phase, question])

  const submitAnswer = useCallback(async () => {
    if (!id || !question || submitting) return

    let answerToSubmit = userAnswer.trim()
    if (!answerToSubmit) return

    if (question.question_type === 'reading') {
      // Final safety: convert any leftover romaji to hiragana before submitting.
      answerToSubmit = toHiragana(answerToSubmit, { IMEMode: false })
    }

    setSubmitting(true)
    setError(null)
    try {
      const { data } = await api.post<AnswerResponse>(
        `/practice_sessions/${id}/answer`,
        { answer: answerToSubmit }
      )
      setFeedback(data)
      setProgress(data.progress)
      setPhase('feedback')
    } catch {
      setError('Could not submit answer. Try again.')
    } finally {
      setSubmitting(false)
    }
  }, [id, question, submitting, userAnswer])

  const advance = useCallback(async () => {
    if (!feedback) return

    if (feedback.is_last) {
      try {
        await api.post(`/practice_sessions/${id}/complete`)
      } catch {
        // continue to summary regardless — that route handles completion
      }
      navigate(`/practice/session/${id}/summary`, { replace: true })
      return
    }

    setQuestion(feedback.next_question)
    setUserAnswer('')
    setFeedback(null)
    setPhase('asking')
  }, [feedback, id, navigate])

  // Exit dialog actions
  async function handleReturnToDashboard() {
    // Leaves session in_progress so user can resume later from dashboard
    setExiting(true)
    setExitDialogOpen(false)
    navigate('/dashboard')
  }

  async function handleEndSession() {
    // Marks session abandoned permanently and goes to dashboard
    if (!id) return
    setExiting(true)
    try {
      await api.post(`/practice_sessions/${id}/abandon`)
    } catch {
      /* even if abandon fails, exit anyway */
    }
    setExitDialogOpen(false)
    navigate('/dashboard')
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
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
      } else if (phase === 'asking' && e.key === 'Escape') {
        setExitDialogOpen(true)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [phase, advance, exitDialogOpen])

  if (error && !question) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-4">
        <div className="bg-pink-soft border-2 border-pink-hot rounded-[10px] p-4 font-mono text-sm shadow-hard-sm">
          {error}
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

  if (!question) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center font-mono text-sm opacity-60">
        Loading…
      </div>
    )
  }

  const progressPercent = progress.total > 0 ? (progress.answered / progress.total) * 100 : 0
  const questionTypeLabel = question.question_type === 'meaning' ? 'MEANING' : 'READING'
  const placeholder =
    question.question_type === 'reading'
      ? 'type romaji — auto-converts to かな'
      : 'type the meaning…'

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Top progress bar */}
      <header className="px-5 sm:px-8 py-4 flex justify-between items-center gap-5 border-b-[3px] border-ink bg-cream">
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
              className="h-full bg-pink-hot border-r-2 border-ink"
              initial={false}
              animate={{ width: `${Math.max(2, progressPercent)}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <div className="mt-1 flex justify-between font-mono text-[0.65rem] opacity-65 uppercase tracking-wider">
            <span>
              Question {progress.answered + (phase === 'asking' ? 1 : 0)} of {progress.total}
            </span>
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

      {/* Question banner */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${question.subject_id}-${question.question_type}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className={`relative overflow-hidden text-center ${
            question.subject_type === 'radical'
              ? 'bg-mint text-ink'
              : question.subject_type === 'kanji'
              ? 'bg-pink-hot text-cream'
              : 'bg-purple-electric text-cream'
          }`}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `
                radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 40%),
                radial-gradient(circle at 80% 70%, rgba(0,0,0,0.15) 0%, transparent 40%)
              `,
            }}
          />

          <div className="relative px-6 py-16 sm:py-20">
            <span
              className="inline-block font-mono text-[0.78rem] uppercase tracking-[0.2em] bg-ink text-mint px-3.5 py-1.5 rounded-full border-2 border-ink mb-6"
              style={{ boxShadow: '3px 3px 0 #ff3d8a' }}
            >
              // {questionTypeLabel}
            </span>

            <div
              className="font-body font-black text-[clamp(5rem,15vw,9rem)] leading-[0.9] mt-3 mb-3"
              style={{
                textShadow:
                  question.subject_type === 'kanji' || question.subject_type === 'vocabulary'
                    ? '4px 4px 0 #1a0b2e'
                    : 'none',
              }}
            >
              {question.prompt}
            </div>

            <div className="font-mono text-[0.78rem] uppercase tracking-[0.15em] opacity-85">
              {question.subject_type.toUpperCase()} · LEVEL {question.level}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Feedback banner */}
      <AnimatePresence mode="wait">
        {phase === 'feedback' && feedback ? (
          <motion.div
            key="feedback"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`overflow-hidden border-y-[3px] border-ink ${
              feedback.correct ? 'bg-mint text-ink' : 'bg-pink-hot text-cream'
            }`}
          >
            <div className="px-6 py-5 text-center">
              <div className="font-display text-[0.85rem] uppercase tracking-[0.15em] opacity-90">
                {feedback.correct ? '✓ CORRECT' : '✕ NOT QUITE'}
              </div>
              <div className="font-body font-bold text-xl mt-1.5">
                {feedback.expected.primary}
                {feedback.expected.accepted.length > 1 && (
                  <span className="opacity-70 text-base ml-2">
                    · also: {feedback.expected.accepted
                      .filter((a) => a !== feedback.expected.primary)
                      .join(', ')}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Input / Next button */}
      <div className="flex-1 px-6 py-10 max-w-[700px] mx-auto w-full">
        {phase === 'asking' ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submitAnswer()
            }}
          >
            <label className="block font-mono text-[0.7rem] uppercase font-bold tracking-[0.1em] mb-2 opacity-70">
              // YOUR ANSWER
              {question.question_type === 'reading' && (
                <span className="ml-2 normal-case opacity-60">(romaji → かな)</span>
              )}
            </label>
            <div className="flex gap-2.5">
              <input
                ref={inputRef}
                type="text"
                // For reading questions, wanakana drives the value via DOM events.
                // We still set `value` to `userAnswer` because React requires it for controlled inputs,
                // but the input listener syncs userAnswer FROM el.value, not the other way around.
                value={userAnswer}
                onChange={(e) => {
                  // For meaning questions, this is the primary update path.
                  // For reading questions, our DOM listener also fires this — both set userAnswer to the same value.
                  if (question.question_type !== 'reading') {
                    setUserAnswer(e.target.value)
                  }
                  // For reading, the dom 'input' listener has already updated state from el.value.
                  // We let React's onChange fire too but the state is already in sync.
                }}
                placeholder={placeholder}
                disabled={submitting}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                lang={question.question_type === 'reading' ? 'ja' : 'en'}
                className="flex-1 px-5 py-4 border-[3px] border-ink rounded-2xl font-body text-xl font-bold bg-white shadow-hard-md outline-none focus:border-pink-hot focus:-translate-x-0.5 focus:-translate-y-0.5 focus:shadow-hard-pink transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={submitting || !userAnswer.trim()}
                className="px-6 py-4 bg-ink text-cream border-[3px] border-ink rounded-2xl font-display text-base disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:-translate-x-0.5 enabled:hover:-translate-y-0.5 transition-transform"
                style={{ boxShadow: '5px 5px 0 #ff3d8a' }}
              >
                Submit →
              </button>
            </div>
            <div className="mt-3 font-mono text-[0.7rem] opacity-55 text-center">
              <Kbd>Enter</Kbd> submit · <Kbd>Esc</Kbd> exit
            </div>
            {error && (
              <div className="mt-4 bg-pink-soft border-2 border-pink-hot rounded-[10px] p-3 font-mono text-[0.78rem] shadow-hard-sm">
                ⚠ {error}
              </div>
            )}
          </form>
        ) : (
          <div className="text-center">
            <button
              onClick={advance}
              autoFocus
              className="px-7 py-4 bg-ink text-cream border-[3px] border-ink rounded-2xl font-display text-base hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform"
              style={{ boxShadow: '5px 5px 0 #ff3d8a' }}
            >
              {feedback?.is_last ? 'See summary →' : 'Next question →'}
            </button>
            <div className="mt-3 font-mono text-[0.7rem] opacity-55">
              <Kbd>Enter</Kbd> or <Kbd>Space</Kbd> to continue
            </div>
          </div>
        )}
      </div>

      {/* Exit dialog — now with three options */}
      <AnimatePresence>
        {exitDialogOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/70 z-50 flex items-center justify-center p-6"
            onClick={() => !exiting && setExitDialogOpen(false)}
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
                You're {progress.answered} of {progress.total} questions in. Pick what to do:
              </p>

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => setExitDialogOpen(false)}
                  disabled={exiting}
                  className="w-full text-left px-4 py-3 bg-mint border-[2.5px] border-ink rounded-lg shadow-hard-sm hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform disabled:opacity-50"
                >
                  <div className="font-display text-[0.85rem]">Keep going →</div>
                  <div className="font-mono text-[0.7rem] opacity-65 mt-0.5">
                    Resume the session right here
                  </div>
                </button>

                <button
                  onClick={handleReturnToDashboard}
                  disabled={exiting}
                  className="w-full text-left px-4 py-3 bg-white border-[2.5px] border-ink rounded-lg shadow-hard-sm hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform disabled:opacity-50"
                >
                  <div className="font-display text-[0.85rem]">Return to dashboard</div>
                  <div className="font-mono text-[0.7rem] opacity-65 mt-0.5">
                    Save progress · come back to it later
                  </div>
                </button>

                <button
                  onClick={handleEndSession}
                  disabled={exiting}
                  className="w-full text-left px-4 py-3 bg-ink text-cream border-[2.5px] border-ink rounded-lg hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform disabled:opacity-50"
                  style={{ boxShadow: '3px 3px 0 #ff3d8a' }}
                >
                  <div className="font-display text-[0.85rem]">End session</div>
                  <div className="font-mono text-[0.7rem] opacity-75 mt-0.5">
                    Done for now · don't come back to this one
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

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="bg-ink text-cream px-1.5 py-0.5 rounded text-[0.65rem] mx-0.5">
      {children}
    </kbd>
  )
}
