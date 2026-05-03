import { motion } from 'motion/react'

const steps = [
  { num: '01', title: 'Sign up', desc: 'Make a KaniCompanion account in under 30 seconds.' },
  {
    num: '02',
    title: 'Drop your token',
    desc: 'Paste your WaniKani API v2 token. We sync your subjects, assignments, and synonyms.',
  },
  {
    num: '03',
    title: 'Pick your battle',
    desc: 'Levels, item type, mode, count. Or hit "recommended" and let us pick your weakest items.',
  },
  {
    num: '04',
    title: 'Drill & repeat',
    desc: 'Practice. Earn local SRS progression. Unlock sentence reviews as items mature.',
  },
]

export default function HowItWorks() {
  return (
    <section
      id="how"
      className="bg-purple-night text-cream py-24 px-5 sm:px-8 relative overflow-hidden"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(255, 61, 138, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(139, 61, 255, 0.2) 0%, transparent 50%)
          `,
        }}
      />

      <div className="max-w-[1400px] mx-auto relative z-10">
        <div className="mb-15 max-w-[700px]">
          <span className="inline-block font-mono text-[0.78rem] uppercase tracking-[0.15em] text-mint font-bold mb-3.5 px-2.5 py-1 bg-purple-night border-2 border-mint rounded-md">
            // the loop
          </span>
          <h2 className="font-display text-[clamp(2rem,4.5vw,3.4rem)] leading-none tracking-[-0.02em] text-cream mt-3">
            Four steps. Zero friction.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-15">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              className="bg-white/5 border-2 border-pink-soft/30 rounded-[18px] p-7 backdrop-blur-md transition-all duration-300 hover:border-pink-hot hover:-translate-y-1.5"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <div
                className="font-display text-5xl leading-none text-pink-hot mb-4"
                style={{ WebkitTextStroke: '1px #fef3e0' }}
              >
                {step.num}
              </div>
              <h4 className="font-display text-lg mb-2.5 tracking-[-0.01em]">
                {step.title}
              </h4>
              <p className="text-[0.9rem] leading-[1.5] opacity-80">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
