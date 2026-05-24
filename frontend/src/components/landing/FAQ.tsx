import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'

const faqs = [
  {
    q: 'Is KaniCompanion affiliated with WaniKani or Tofugu?',
    a: 'No. KaniCompanion is an independent, unofficial companion app. It is not affiliated with, endorsed by, or sponsored by Tofugu LLC or WaniKani.',
  },
  {
    q: 'Do I need a WaniKani account to use this?',
    a: 'Yes. KaniCompanion syncs your subjects, assignments, and SRS data from WaniKani using your API v2 token. A paid or trial WaniKani account is required.',
  },
  {
    q: 'Is my WaniKani API token safe?',
    a: 'Your token is encrypted at rest and never sent to the browser after the initial connection. We never log it, and it is only used to sync your data from WaniKani.',
  },
  {
    q: 'Does practicing here count toward my WaniKani reviews?',
    a: 'It depends on the mode. Some practice sessions can optionally sync correct answers back to WaniKani as reviews. You control this per session.',
  },
  {
    q: 'How does sentence practice unlock?',
    a: 'Once a vocabulary item reaches Guru on WaniKani it becomes eligible for sentence practice here. Items progress through their own local SRS as you practice them in context.',
  },
  {
    q: 'Is KaniCompanion free?',
    a: 'KaniCompanion is currently in open beta. Pricing details will be announced before the full launch — early users will be taken care of.',
  },
]

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-[2.5px] border-ink rounded-[14px] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex justify-between items-center px-6 py-5 text-left bg-white hover:bg-cream transition-colors"
      >
        <span className="font-display text-[1rem] leading-snug tracking-[-0.01em] pr-4">{q}</span>
        <span
          className="flex-shrink-0 w-7 h-7 bg-ink text-cream rounded-md grid place-items-center font-mono text-base font-bold transition-transform"
          style={{ transform: open ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
        >
          +
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <p className="px-6 py-5 text-[0.93rem] leading-[1.6] opacity-80 border-t-2 border-ink bg-cream">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FAQ() {
  return (
    <section id="faq" className="bg-cream py-24 px-5 sm:px-8">
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-14 max-w-[700px]">
          <span className="inline-block font-mono text-[0.78rem] uppercase tracking-[0.15em] text-pink-hot font-bold mb-3.5 px-2.5 py-1 bg-cream border-2 border-pink-hot rounded-md">
            // faq
          </span>
          <h2 className="font-display text-[clamp(2rem,4.5vw,3.4rem)] leading-none tracking-[-0.02em] text-ink mt-3">
            Common questions.
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-[1100px]">
          {faqs.map((faq) => (
            <FAQItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </div>
    </section>
  )
}
