import { motion } from 'motion/react'
import KanjiCard from './KanjiCard'
import Sparkle from './Sparkle'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15 },
  },
}

export default function Hero() {
  return (
    <section className="relative grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-15 lg:gap-[60px] items-center max-w-[1400px] mx-auto min-h-screen px-5 sm:px-8 pt-[100px] lg:pt-[120px] pb-20">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none z-0"
        style={{
          backgroundImage:
            'linear-gradient(#1a0b2e 1px, transparent 1px), linear-gradient(90deg, #1a0b2e 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Content */}
      <motion.div
        className="relative z-[2]"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        <motion.div
          className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-mint border-2 border-ink rounded-full font-mono text-xs font-bold shadow-hard-sm mb-7 animate-badge-bob"
          variants={fadeUp}
        >
          <span className="w-2 h-2 bg-[#00b76a] rounded-full animate-pulse-dot" />
          SUPPLEMENTARY · NOT A REPLACEMENT
        </motion.div>

        <motion.h1
          className="font-display text-[clamp(2.8rem,6.5vw,5rem)] leading-[0.95] tracking-[-0.03em] mb-6 text-ink"
          variants={fadeUp}
        >
          Practice{' '}
          <span className="relative inline-block text-pink-hot">
            kanji
            <span
              className="absolute bottom-1 left-0 right-0 h-3 bg-yellow-pop -z-10"
              style={{ transform: 'skew(-8deg)' }}
            />
          </span>
          <br />
          <span className="font-body font-black text-purple-electric inline-block -rotate-[3deg] mx-2">
            ガンガン
          </span>
          <br />
          beyond the crab.
        </motion.h1>

        <motion.p
          className="text-lg leading-relaxed text-ink/85 max-w-[520px] mb-9"
          variants={fadeUp}
        >
          A companion app that syncs with your{' '}
          <strong className="bg-pink-soft px-1.5 py-px rounded font-bold">WaniKani</strong>{' '}
          account so you can drill radicals, kanji, vocab — and full sentences — without
          ever touching your official SRS reviews.
        </motion.p>

        <motion.div className="flex gap-4 flex-wrap mb-9" variants={fadeUp}>
          <a href="/signup" className="btn btn-large">
            Connect WaniKani →
          </a>
          <a href="#how" className="btn btn-large btn-purple">
            See how it works
          </a>
        </motion.div>

        <motion.div
          className="flex gap-8 flex-wrap pt-6 border-t-2 border-dashed border-ink"
          variants={fadeUp}
        >
          <div className="flex flex-col">
            <span className="font-display text-[1.6rem] text-purple-electric">60</span>
            <span className="text-[0.78rem] uppercase tracking-[0.08em] opacity-70 mt-0.5">
              Levels covered
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-display text-[1.6rem] text-purple-electric">2K+</span>
            <span className="text-[0.78rem] uppercase tracking-[0.08em] opacity-70 mt-0.5">
              Kanji drillable
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-display text-[1.6rem] text-purple-electric">∞</span>
            <span className="text-[0.78rem] uppercase tracking-[0.08em] opacity-70 mt-0.5">
              Practice sessions
            </span>
          </div>
        </motion.div>
      </motion.div>

      {/* Visual */}
      <div className="relative h-[480px] lg:h-[560px] z-[1] max-w-[460px] mx-auto lg:max-w-none">
        <KanjiCard
          variant="pink"
          level="01"
          radical="大"
          kanji="人"
          reading="ひと"
          meaning="person"
          className="top-0 left-[30px] animate-float-1"
          style={{ transform: 'rotate(-8deg)' }}
        />
        <KanjiCard
          variant="purple"
          level="04"
          radical="火"
          kanji="日"
          reading="にち"
          meaning="day"
          className="top-[60px] left-[220px] z-[3] animate-float-2"
          style={{ transform: 'rotate(5deg)' }}
        />
        <KanjiCard
          variant="yellow"
          level="02"
          radical="木"
          kanji="山"
          reading="やま"
          meaning="mountain"
          className="top-[280px] left-[60px] animate-float-3"
          style={{ transform: 'rotate(-4deg)' }}
        />
        <KanjiCard
          variant="mint"
          level="03"
          radical="水"
          kanji="川"
          reading="かわ"
          meaning="river"
          className="top-[320px] left-[260px] animate-float-1"
          style={{ transform: 'rotate(7deg)', animationDirection: 'reverse' }}
        />

        <div className="absolute top-5 right-0 bg-ink text-mint px-3.5 py-2 rounded-full font-mono text-xs font-bold border-2 border-ink animate-bob"
             style={{ boxShadow: '3px 3px 0 #ff3d8a' }}>
          ⚡ APPRENTICE I
        </div>
        <div className="absolute bottom-[60px] right-10 bg-ink text-mint px-3.5 py-2 rounded-full font-mono text-xs font-bold border-2 border-ink animate-bob"
             style={{ boxShadow: '3px 3px 0 #ff3d8a', animationDirection: 'reverse' }}>
          ★ ENLIGHTENED
        </div>

        <Sparkle color="#ff3d8a" size={36} className="top-[100px] -right-2.5" />
        <Sparkle color="#ffd60a" size={28} className="top-[250px] -left-5" delay={1} />
        <Sparkle color="#7df9c0" size={24} className="bottom-[100px] right-[200px]" delay={2} />
      </div>
    </section>
  )
}
