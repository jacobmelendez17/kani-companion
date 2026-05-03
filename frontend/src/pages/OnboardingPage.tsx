import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'

interface Slide {
  eyebrow: string
  title: React.ReactNode
  description: string
  visual: React.ReactNode
}

const slides: Slide[] = [
  {
    eyebrow: '// SLIDE 01',
    title: (
      <>
        Drill the way{' '}
        <span className="relative inline-block text-pink-hot">
          you want
          <span
            className="absolute bottom-0.5 left-0 right-0 h-2 bg-yellow-pop -z-10"
            style={{ transform: 'skew(-8deg)' }}
          />
        </span>
        .
      </>
    ),
    description:
      'Pick any combination of levels, item types, and modes. Drill kanji → meaning, meaning → kanji, reading → vocab — whatever you need.',
    visual: <ModesVisual />,
  },
  {
    eyebrow: '// SLIDE 02',
    title: (
      <>
        Your{' '}
        <span className="relative inline-block text-pink-hot">
          private SRS
          <span
            className="absolute bottom-0.5 left-0 right-0 h-2 bg-yellow-pop -z-10"
            style={{ transform: 'skew(-8deg)' }}
          />
        </span>
        .
      </>
    ),
    description:
      'Practice as much as you want. KaniCompanion has its own SRS that tracks your performance separately — your real WaniKani reviews are never touched.',
    visual: <SrsVisual />,
  },
  {
    eyebrow: '// SLIDE 03',
    title: (
      <>
        Sentence practice that{' '}
        <span className="relative inline-block text-pink-hot">
          grows
          <span
            className="absolute bottom-0.5 left-0 right-0 h-2 bg-yellow-pop -z-10"
            style={{ transform: 'skew(-8deg)' }}
          />
        </span>{' '}
        with you.
      </>
    ),
    description:
      "Once an item hits Guru on WaniKani, it unlocks here. You'll see it in phrases first — then as full context sentences as you progress.",
    visual: <SentencesVisual />,
  },
  {
    eyebrow: '// SLIDE 04',
    title: (
      <>
        Keep your{' '}
        <span className="relative inline-block text-pink-hot">
          streak
          <span
            className="absolute bottom-0.5 left-0 right-0 h-2 bg-yellow-pop -z-10"
            style={{ transform: 'skew(-8deg)' }}
          />
        </span>{' '}
        alive.
      </>
    ),
    description:
      "Your dashboard shows weak items, recent mistakes, daily streaks, and what to drill next — so every session has a goal.",
    visual: <DashboardVisual />,
  },
  {
    eyebrow: '// SLIDE 05',
    title: (
      <>
        Ready when{' '}
        <span className="relative inline-block text-pink-hot">
          you are
          <span
            className="absolute bottom-0.5 left-0 right-0 h-2 bg-yellow-pop -z-10"
            style={{ transform: 'skew(-8deg)' }}
          />
        </span>
        .
      </>
    ),
    description:
      "We're syncing your WaniKani data in the background. You can start drilling as soon as the first batch lands — usually under a minute.",
    visual: <FinalVisual />,
  },
]

export default function OnboardingPage() {
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(1)

  const isLast = index === slides.length - 1

  function next() {
    if (isLast) {
      navigate('/dashboard', { replace: true })
      return
    }
    setDirection(1)
    setIndex((i) => i + 1)
  }

  function back() {
    if (index === 0) return
    setDirection(-1)
    setIndex((i) => i - 1)
  }

  function skip() {
    navigate('/dashboard', { replace: true })
  }

  const slide = slides[index]

  return (
    <div className="min-h-screen bg-cream relative overflow-hidden flex flex-col">
      {/* Bg grid */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(#1a0b2e 1px, transparent 1px), linear-gradient(90deg, #1a0b2e 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Top bar */}
      <header className="relative z-10 px-6 sm:px-12 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <div className="grid place-items-center w-9 h-9 bg-pink-hot border-[2.5px] border-ink rounded-lg font-body font-black text-cream text-xl shadow-hard-sm -rotate-[4deg]">
            蟹
          </div>
          <span className="font-display text-base">KaniCompanion</span>
        </div>
        <button
          onClick={skip}
          className="font-mono text-[0.78rem] uppercase tracking-wider text-ink/60 hover:text-pink-hot transition-colors"
        >
          Skip tour →
        </button>
      </header>

      {/* Slide content */}
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 px-6 sm:px-12 pb-12 relative z-10 max-w-[1400px] w-full mx-auto">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={index}
            custom={direction}
            initial={{ opacity: 0, x: direction * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * 60 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16 w-full"
          >
            {/* Text */}
            <div className="flex-1 max-w-[520px]">
              <span className="inline-block font-mono text-[0.7rem] uppercase tracking-[0.15em] text-pink-hot font-bold mb-3 px-2.5 py-1 bg-cream border-2 border-pink-hot rounded-md">
                {slide.eyebrow}
              </span>
              <h1 className="font-display text-[clamp(2rem,4.5vw,3.2rem)] leading-[0.95] tracking-[-0.03em] text-ink mt-2">
                {slide.title}
              </h1>
              <p className="text-lg leading-relaxed opacity-80 mt-5">
                {slide.description}
              </p>
            </div>

            {/* Visual */}
            <div className="flex-1 flex items-center justify-center min-h-[300px] lg:min-h-[400px]">
              {slide.visual}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom controls */}
      <footer className="relative z-10 px-6 sm:px-12 py-6 flex justify-between items-center max-w-[1400px] w-full mx-auto">
        <button
          onClick={back}
          disabled={index === 0}
          className="font-mono text-[0.78rem] uppercase tracking-wider text-ink/60 disabled:opacity-30 disabled:cursor-not-allowed hover:text-pink-hot transition-colors"
        >
          ← Back
        </button>

        {/* Dots */}
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setDirection(i > index ? 1 : -1)
                setIndex(i)
              }}
              className={`h-2.5 rounded-full border-2 border-ink transition-all ${
                i === index ? 'w-10 bg-pink-hot' : 'w-2.5 bg-cream hover:bg-pink-soft'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        <button
          onClick={next}
          className="px-6 py-3 bg-ink text-cream border-[2.5px] border-ink rounded-[10px] font-display text-[0.85rem] tracking-[0.02em] cursor-pointer transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5"
          style={{ boxShadow: '4px 4px 0 #ff3d8a' }}
        >
          {isLast ? 'Enter dashboard →' : 'Next →'}
        </button>
      </footer>
    </div>
  )
}

// ===== Visual components for each slide =====

function ModesVisual() {
  const modes = [
    { from: '漢字', to: 'meaning' },
    { from: '漢字', to: 'reading' },
    { from: 'meaning', to: '漢字' },
    { from: '日本語', to: 'English' },
  ]
  return (
    <div className="bg-purple-electric border-[3px] border-ink rounded-[24px] p-7 shadow-hard-lg w-full max-w-[420px]">
      <div className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-yellow-pop font-bold mb-4">
        // PRACTICE MODES
      </div>
      <div className="flex flex-col gap-2.5">
        {modes.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className="bg-white/15 backdrop-blur-md border-2 border-white/30 rounded-[10px] px-4 py-3 font-mono text-[0.95rem] flex items-center gap-3 text-cream"
          >
            <span className="font-body font-bold">{m.from}</span>
            <span className="text-yellow-pop font-bold">→</span>
            <span className="font-body">{m.to}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function SrsVisual() {
  const stages = [
    { label: 'APPRENTICE', cls: 'bg-pink-soft text-ink' },
    { label: 'GURU', cls: 'bg-pink-hot text-white' },
    { label: 'MASTER', cls: 'bg-purple-electric text-white' },
    { label: 'ENLIGHTENED', cls: 'bg-purple-deep text-white' },
    { label: 'BURNED', cls: 'bg-ink text-mint' },
  ]
  return (
    <div className="bg-white border-[3px] border-ink rounded-[24px] p-7 shadow-hard-lg w-full max-w-[420px]">
      <div className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-pink-hot font-bold mb-4">
        // YOUR LOCAL SRS
      </div>
      <div className="flex flex-col gap-2">
        {stages.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 + i * 0.08 }}
            className={`px-4 py-2.5 border-2 border-ink rounded-md font-mono text-[0.78rem] font-bold uppercase tracking-wider flex justify-between items-center ${s.cls}`}
          >
            <span>{s.label}</span>
            <span className="opacity-60">stage {i + 1}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function SentencesVisual() {
  return (
    <div className="bg-yellow-pop border-[3px] border-ink rounded-[24px] p-7 shadow-hard-lg w-full max-w-[420px]">
      <div className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink font-bold mb-4">
        // SENTENCE PROGRESSION
      </div>
      <div className="flex flex-col gap-3">
        <SentenceRow stage="Apprentice I" jp="一頭の" highlight="馬" jpEnd="" en="One horse" />
        <SentenceRow stage="Apprentice III" jp="あの大きな" highlight="馬" jpEnd="" en="That great horse" />
        <SentenceRow stage="Guru" jp="あの" highlight="馬" jpEnd="は速く走る。" en="That horse runs fast." />
      </div>
    </div>
  )
}

function SentenceRow({
  stage,
  jp,
  highlight,
  jpEnd,
  en,
}: {
  stage: string
  jp: string
  highlight: string
  jpEnd: string
  en: string
}) {
  return (
    <div className="bg-white border-[2.5px] border-ink rounded-[10px] p-3 shadow-hard-sm">
      <div className="font-body font-bold text-base">
        {jp}
        <span className="bg-pink-hot text-white px-1 rounded">{highlight}</span>
        {jpEnd}
      </div>
      <div className="text-xs opacity-70 italic mt-0.5">{en}</div>
      <span className="inline-block mt-1.5 px-2 py-0.5 bg-ink text-mint font-mono text-[0.6rem] rounded uppercase font-bold">
        {stage}
      </span>
    </div>
  )
}

function DashboardVisual() {
  return (
    <div className="bg-ink text-cream border-[3px] border-ink rounded-[24px] p-6 shadow-hard-lg w-full max-w-[420px]">
      <div className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-mint font-bold mb-4">
        // YOUR DASHBOARD
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Stat value="247" label="Streak days" color="text-pink-hot" />
        <Stat value="38" label="Items learned" color="text-yellow-pop" />
        <Stat value="12" label="Weak items" color="text-mint" />
        <Stat value="89%" label="Accuracy" color="text-pink-soft" />
      </div>
      <div className="mt-4 bg-white/5 border border-white/20 rounded-[10px] p-3">
        <div className="font-mono text-[0.6rem] text-mint font-bold mb-1.5">
          ⚡ RECOMMENDED NEXT
        </div>
        <div className="text-sm">Drill 12 weak Apprentice items →</div>
      </div>
    </div>
  )
}

function Stat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="bg-white/5 border border-white/20 rounded-[10px] p-3">
      <div className={`font-display text-2xl ${color}`}>{value}</div>
      <div className="text-[0.7rem] opacity-70 uppercase tracking-wider mt-0.5">
        {label}
      </div>
    </div>
  )
}

function FinalVisual() {
  return (
    <div className="relative w-full max-w-[420px] flex items-center justify-center min-h-[400px]">
      {/* Big celebration kanji card */}
      <motion.div
        initial={{ scale: 0.8, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 12 }}
        className="bg-pink-hot border-[3px] border-ink rounded-[24px] p-10 shadow-hard-lg text-cream relative"
      >
        <div className="font-body font-black text-[8rem] leading-none text-center">
          蟹
        </div>
        <div className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-center mt-3">
          KANI · CRAB · 学
        </div>
      </motion.div>

      {/* Floating sparkles */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        className="absolute -top-4 -right-4"
      >
        <Spark color="#ffd60a" size={40} />
      </motion.div>
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        className="absolute -bottom-4 -left-4"
      >
        <Spark color="#7df9c0" size={32} />
      </motion.div>

      {/* SRS badge */}
      <div
        className="absolute top-2 -left-6 bg-ink text-mint px-3 py-1.5 rounded-full font-mono text-[0.7rem] font-bold border-2 border-ink animate-bob"
        style={{ boxShadow: '3px 3px 0 #ffd60a' }}
      >
        ★ READY
      </div>
    </div>
  )
}

function Spark({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36">
      <path
        d="M18 2 L20 16 L34 18 L20 20 L18 34 L16 20 L2 18 L16 16 Z"
        fill={color}
        stroke="#1a0b2e"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}
