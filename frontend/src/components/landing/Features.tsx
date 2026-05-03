import { motion } from 'motion/react'

const cardAnimation = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
}

export default function Features() {
  return (
    <section id="features" className="max-w-[1400px] mx-auto px-5 sm:px-8 py-20">
      <div className="mb-15 max-w-[700px]">
        <span className="inline-block font-mono text-[0.78rem] uppercase tracking-[0.15em] text-pink-hot font-bold mb-3.5 px-2.5 py-1 bg-cream border-2 border-pink-hot rounded-md">
          // what you get
        </span>
        <h2 className="font-display text-[clamp(2rem,4.5vw,3.4rem)] leading-none tracking-[-0.02em] text-ink mt-3">
          Drill smarter,
          <br />
          not harder.
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Feature 1: Local SRS */}
        <motion.div
          className="bg-white border-[3px] border-ink rounded-[18px] p-7 shadow-hard-md transition-all duration-300 hover:-translate-x-[3px] hover:-translate-y-[3px] hover:shadow-[9px_9px_0_#1a0b2e] lg:col-span-7 min-h-[320px] relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #fff 0%, #fff5fa 100%)' }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={cardAnimation}
        >
          <div className="w-14 h-14 rounded-[14px] grid place-items-center font-body font-black text-[1.8rem] mb-5 border-[2.5px] border-ink bg-pink-hot text-white">
            SRS
          </div>
          <h3 className="font-display text-2xl leading-tight mb-3 tracking-[-0.02em]">
            Your own private SRS
          </h3>
          <p className="text-[0.95rem] leading-[1.55] opacity-85 mb-5">
            Practice as much as you want. KaniCompanion tracks your performance with its{' '}
            <em>own</em> SRS — your real WaniKani reviews stay untouched.
          </p>
          <div className="flex gap-2 flex-wrap mt-4">
            {[
              { label: 'Apprentice', cls: 'bg-pink-soft' },
              { label: 'Guru', cls: 'bg-pink-hot text-white' },
              { label: 'Master', cls: 'bg-purple-electric text-white' },
              { label: 'Enlightened', cls: 'bg-purple-deep text-white' },
              { label: 'Burned', cls: 'bg-ink text-mint' },
            ].map((s) => (
              <span
                key={s.label}
                className={`px-3 py-1.5 border-2 border-ink rounded-md font-mono text-[0.72rem] font-bold uppercase ${s.cls}`}
              >
                {s.label}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Feature 2: Modes */}
        <motion.div
          className="bg-purple-electric text-white border-[3px] border-ink rounded-[18px] p-7 shadow-hard-md transition-all duration-300 hover:-translate-x-[3px] hover:-translate-y-[3px] hover:shadow-[9px_9px_0_#1a0b2e] lg:col-span-5 min-h-[320px]"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={cardAnimation}
        >
          <div className="w-14 h-14 rounded-[14px] grid place-items-center font-body font-black text-[1.8rem] mb-5 border-[2.5px] border-ink bg-yellow-pop text-ink">
            ⇆
          </div>
          <h3 className="font-display text-2xl leading-tight mb-3 tracking-[-0.02em]">
            Every direction.
          </h3>
          <p className="text-[0.95rem] leading-[1.55] opacity-85 mb-5">
            Pick your mode. Drill the way that matches your weak spots — or mix it up.
          </p>
          <div className="flex flex-col gap-2.5 mt-5">
            {[
              <>漢字 <span className="text-yellow-pop font-bold">→</span> meaning</>,
              <>漢字 <span className="text-yellow-pop font-bold">→</span> reading</>,
              <>meaning <span className="text-yellow-pop font-bold">→</span> 漢字</>,
              <>日本語 <span className="text-yellow-pop font-bold">⇄</span> English</>,
            ].map((label, i) => (
              <div
                key={i}
                className="bg-white/15 backdrop-blur-md border-2 border-white/30 rounded-[10px] px-3.5 py-2.5 font-mono text-[0.85rem] flex items-center gap-2.5 transition-all hover:bg-white/25 hover:translate-x-1"
              >
                {label}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Feature 3: Sentences */}
        <motion.div
          className="bg-yellow-pop border-[3px] border-ink rounded-[18px] p-7 shadow-hard-md transition-all duration-300 hover:-translate-x-[3px] hover:-translate-y-[3px] hover:shadow-[9px_9px_0_#1a0b2e] lg:col-span-5 min-h-[320px]"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={cardAnimation}
        >
          <div className="w-14 h-14 rounded-[14px] grid place-items-center font-body font-black text-[1.8rem] mb-5 border-[2.5px] border-ink bg-ink text-mint">
            文
          </div>
          <h3 className="font-display text-2xl leading-tight mb-3 tracking-[-0.02em]">
            Sentence practice that grows with you.
          </h3>
          <p className="text-[0.95rem] leading-[1.55] opacity-85 mb-5">
            Once an item hits Guru on WaniKani, it unlocks here. You'll see it in phrases first, then full context sentences as you progress.
          </p>
          <div className="bg-white border-[2.5px] border-ink rounded-xl p-4 mt-5 shadow-hard">
            <div className="font-body font-bold text-[1.1rem] mb-1.5">
              あの大きな
              <span className="bg-pink-hot text-white px-1 rounded">馬</span>
              が走る。
            </div>
            <div className="text-[0.85rem] opacity-70 italic">That great horse runs.</div>
            <span className="inline-block mt-2.5 px-2.5 py-0.5 bg-ink text-mint font-mono text-[0.7rem] rounded uppercase font-bold">
              Apprentice III
            </span>
          </div>
        </motion.div>

        {/* Feature 4: Token security */}
        <motion.div
          className="bg-ink text-cream border-[3px] border-ink rounded-[18px] p-7 shadow-hard-md transition-all duration-300 hover:-translate-x-[3px] hover:-translate-y-[3px] hover:shadow-[9px_9px_0_#1a0b2e] lg:col-span-7 min-h-[320px]"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={cardAnimation}
        >
          <div className="w-14 h-14 rounded-[14px] grid place-items-center font-body font-black text-[1.8rem] mb-5 border-[2.5px] border-ink bg-mint text-ink">
            🔒
          </div>
          <h3 className="font-display text-2xl leading-tight mb-3 tracking-[-0.02em]">
            Your token, locked tight.
          </h3>
          <p className="text-[0.95rem] leading-[1.55] opacity-85 mb-5">
            WaniKani API tokens are encrypted at rest, never logged, and never sent to the browser. Revoke any time from settings.
          </p>
          <div className="bg-white/5 border-2 border-dashed border-mint rounded-[10px] p-3.5 mt-5 font-mono text-[0.85rem] flex items-center gap-3">
            <div className="w-8 h-8 bg-mint text-ink rounded-lg grid place-items-center text-base flex-shrink-0">
              🔐
            </div>
            <div>
              <div className="opacity-60 text-[0.7rem] mb-0.5">YOUR TOKEN</div>
              <div>
                ••••-••••-••••-••••-••••{' '}
                <span className="text-mint">[ENCRYPTED]</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
