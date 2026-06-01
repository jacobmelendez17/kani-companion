import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import Logo from '../components/landing/Logo'

type ChangeType = 'added' | 'fixed' | 'changed' | 'removed'

interface ChangelogEntry {
  id: number
  version: string
  release_date: string
  changes: { type: ChangeType; text: string }[]
  position: number
}

const typeBadge: Record<ChangeType, { label: string; cls: string }> = {
  added:   { label: 'Added',   cls: 'bg-mint text-ink' },
  fixed:   { label: 'Fixed',   cls: 'bg-pink-hot text-cream' },
  changed: { label: 'Changed', cls: 'bg-yellow-pop text-ink' },
  removed: { label: 'Removed', cls: 'bg-purple-electric text-cream' },
}

export default function ChangelogPage() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    api.get<{ entries: ChangelogEntry[] }>('/changelog_entries')
      .then(({ data }) => setEntries(data.entries))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

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

        {loading && (
          <div className="font-mono text-sm opacity-60">Loading…</div>
        )}

        {error && (
          <div className="font-mono text-sm text-pink-hot">Could not load changelog. Try refreshing.</div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div className="font-mono text-sm opacity-60">No entries yet.</div>
        )}

        <div className="flex flex-col gap-10">
          {entries.map((entry, i) => (
            <div key={entry.id} className="border-[3px] border-ink rounded-[18px] overflow-hidden shadow-hard-md">
              <div className="px-6 py-4 bg-ink text-cream flex justify-between items-center flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-display text-xl">v{entry.version}</span>
                  {i === 0 && (
                    <span className="px-2.5 py-0.5 bg-pink-hot text-cream font-mono text-[0.7rem] rounded-md uppercase font-bold">
                      latest
                    </span>
                  )}
                </div>
                <span className="font-mono text-[0.8rem] opacity-60">{entry.release_date}</span>
              </div>
              <ul className="divide-y-2 divide-ink/10">
                {entry.changes.map((change, j) => {
                  const badge = typeBadge[change.type] ?? typeBadge.changed
                  return (
                    <li key={j} className="px-6 py-4 flex items-start gap-4 bg-white">
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
