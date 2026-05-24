import { Link } from 'react-router-dom'
import Logo from '../components/landing/Logo'

type Entry = {
  version: string
  date: string
  changes: { type: 'added' | 'fixed' | 'changed' | 'removed'; text: string }[]
}

const changelog: Entry[] = [
  {
    version: '0.1.0-beta',
    date: '2026-05-23',
    changes: [
      { type: 'added', text: 'Initial beta launch.' },
      { type: 'added', text: 'WaniKani API v2 sync: subjects, assignments, and review statistics.' },
      { type: 'added', text: 'Item practice sessions: meaning, reading, and mixed modes.' },
      { type: 'added', text: 'Sentence practice sessions for Guru+ vocabulary.' },
      { type: 'added', text: 'Local SRS progression tracking per sentence.' },
      { type: 'added', text: 'Optional sync of correct answers back to WaniKani.' },
      { type: 'added', text: 'Dashboard with level card, streak, SRS distribution, and recommended items.' },
      { type: 'fixed', text: 'Resolved double API call on dashboard load.' },
      { type: 'fixed', text: 'Fixed token refresh bug causing premature logout.' },
    ],
  },
]

const typeBadge: Record<Entry['changes'][number]['type'], { label: string; cls: string }> = {
  added:   { label: 'Added',   cls: 'bg-mint text-ink' },
  fixed:   { label: 'Fixed',   cls: 'bg-pink-hot text-cream' },
  changed: { label: 'Changed', cls: 'bg-yellow-pop text-ink' },
  removed: { label: 'Removed', cls: 'bg-purple-electric text-cream' },
}

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-cream">
      <header className="px-5 sm:px-8 py-4 flex justify-between items-center border-b-[3px] border-ink bg-cream">
        <Link to="/" className="no-underline">
          <Logo />
        </Link>
        <Link
          to="/"
          className="font-mono text-[0.8rem] opacity-60 hover:opacity-100 no-underline transition-opacity"
        >
          ← Back to home
        </Link>
      </header>

      <main className="max-w-[860px] mx-auto px-5 sm:px-8 py-16">
        <div className="mb-14">
          <span className="inline-block font-mono text-[0.78rem] uppercase tracking-[0.15em] text-pink-hot font-bold mb-3.5 px-2.5 py-1 bg-cream border-2 border-pink-hot rounded-md">
            // changelog
          </span>
          <h1 className="font-display text-[clamp(2rem,5vw,3.4rem)] leading-none tracking-[-0.02em] text-ink mt-3">
            What's changed.
          </h1>
          <p className="text-[0.95rem] opacity-70 mt-3">
            A running log of updates, fixes, and new features.
          </p>
        </div>

        <div className="flex flex-col gap-10">
          {changelog.map((entry) => (
            <div key={entry.version} className="border-[3px] border-ink rounded-[18px] overflow-hidden shadow-hard-md">
              <div className="px-6 py-4 bg-ink text-cream flex justify-between items-center flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-display text-xl">v{entry.version}</span>
                  <span className="px-2.5 py-0.5 bg-pink-hot text-cream font-mono text-[0.7rem] rounded-md uppercase font-bold">
                    latest
                  </span>
                </div>
                <span className="font-mono text-[0.8rem] opacity-60">{entry.date}</span>
              </div>
              <ul className="divide-y-2 divide-ink/10">
                {entry.changes.map((change, i) => {
                  const badge = typeBadge[change.type]
                  return (
                    <li key={i} className="px-6 py-4 flex items-start gap-4 bg-white">
                      <span
                        className={`flex-shrink-0 px-2.5 py-0.5 border-2 border-ink rounded-md font-mono text-[0.7rem] uppercase font-bold mt-0.5 ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                      <span className="text-[0.93rem] leading-[1.55]">{change.text}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </main>

      <footer className="max-w-[860px] mx-auto px-5 sm:px-8 py-8 border-t border-ink/10 flex justify-between flex-wrap gap-4 font-mono text-[0.78rem] opacity-60">
        <span>© 2026 KaniCompanion // built with 愛</span>
        <Link to="/" className="no-underline hover:opacity-100 transition-opacity">← home</Link>
      </footer>
    </div>
  )
}
