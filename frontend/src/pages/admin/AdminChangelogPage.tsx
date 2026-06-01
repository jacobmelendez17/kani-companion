import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import { useAuth } from '../../lib/auth'

type ChangeType = 'added' | 'fixed' | 'changed' | 'removed'

interface ChangelogEntry {
  id: number
  version: string
  release_date: string
  changes: { type: ChangeType; text: string }[]
  published: boolean
  position: number
}

const CHANGE_TYPES: ChangeType[] = ['added', 'fixed', 'changed', 'removed']

const typeCls: Record<ChangeType, string> = {
  added:   'bg-mint text-ink',
  fixed:   'bg-pink-hot text-cream',
  changed: 'bg-yellow-pop text-ink',
  removed: 'bg-purple-electric text-cream',
}

export default function AdminChangelogPage() {
  const navigate = useNavigate()
  const { user, fetchUser } = useAuth()
  const [authChecked, setAuthChecked] = useState(false)
  const [entries, setEntries] = useState<ChangelogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ChangelogEntry | null>(null)

  useEffect(() => {
    fetchUser().finally(() => setAuthChecked(true))
  }, [fetchUser])

  useEffect(() => {
    if (authChecked && user && !user.admin) navigate('/dashboard', { replace: true })
  }, [authChecked, user, navigate])

  useEffect(() => {
    if (!authChecked || !user?.admin) return
    api.get<{ entries: ChangelogEntry[] }>('/admin/changelog_entries')
      .then(({ data }) => setEntries(data.entries))
      .finally(() => setLoading(false))
  }, [authChecked, user])

  if (!authChecked) return <div className="min-h-screen bg-cream flex items-center justify-center font-mono text-sm opacity-60">Checking access…</div>
  if (!user?.admin)  return <div className="min-h-screen bg-cream flex items-center justify-center font-mono text-sm">Admin access required</div>

  async function togglePublished(entry: ChangelogEntry) {
    const { data } = await api.patch(`/admin/changelog_entries/${entry.id}`, {
      changelog_entry: { published: !entry.published },
    })
    setEntries((curr) => curr.map((e) => e.id === entry.id ? data.entry : e))
  }

  async function deleteEntry(id: number) {
    if (!confirm('Delete this changelog entry?')) return
    await api.delete(`/admin/changelog_entries/${id}`)
    setEntries((curr) => curr.filter((e) => e.id !== id))
  }

  function openEdit(entry: ChangelogEntry) {
    setEditing(entry)
    setShowForm(true)
  }

  function openNew() {
    setEditing(null)
    setShowForm(true)
  }

  function onSaved(entry: ChangelogEntry, isNew: boolean) {
    if (isNew) {
      setEntries((curr) => [entry, ...curr])
    } else {
      setEntries((curr) => curr.map((e) => e.id === entry.id ? entry : e))
    }
    setShowForm(false)
    setEditing(null)
  }

  return (
    <div className="min-h-screen bg-cream relative">
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(#1a0b2e 1px, transparent 1px), linear-gradient(90deg, #1a0b2e 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <header className="relative z-10 px-5 sm:px-8 py-4 flex justify-between items-center border-b-[3px] border-ink bg-cream">
        <Link to="/dashboard" className="flex items-center gap-2.5 no-underline text-ink">
          <div className="grid place-items-center w-9 h-9 bg-pink-hot border-[2.5px] border-ink rounded-lg font-body font-black text-cream text-xl shadow-hard-sm -rotate-[4deg]">
            蟹
          </div>
          <span className="font-display text-base">KaniCompanion · Admin</span>
        </Link>
        <Link to="/dashboard" className="font-mono text-[0.78rem] uppercase tracking-wider text-ink/60 hover:text-pink-hot transition-colors no-underline">
          ← Dashboard
        </Link>
      </header>

      <main className="relative z-10 max-w-[860px] mx-auto px-5 sm:px-8 py-8">
        <div className="flex justify-between items-end flex-wrap gap-4 mb-6">
          <div>
            <span className="inline-block font-mono text-[0.7rem] uppercase tracking-[0.15em] text-pink-hot font-bold mb-3 px-2.5 py-1 bg-cream border-2 border-pink-hot rounded-md">
              // admin · changelog
            </span>
            <h1 className="font-display text-[clamp(1.6rem,3vw,2.2rem)] leading-[0.95] tracking-[-0.02em] mt-1">
              Manage changelog
            </h1>
          </div>
          <button
            onClick={openNew}
            className="px-4 py-2.5 bg-ink text-cream border-[2.5px] border-ink rounded-[10px] font-mono text-[0.75rem] font-bold uppercase shadow-hard-sm hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform"
            style={{ boxShadow: '3px 3px 0 #ff3d8a' }}
          >
            + New entry
          </button>
        </div>

        {showForm && (
          <EntryForm
            initial={editing}
            onSaved={onSaved}
            onCancel={() => { setShowForm(false); setEditing(null) }}
          />
        )}

        {loading ? (
          <div className="font-mono text-sm opacity-60 py-8">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="bg-white border-[2.5px] border-dashed border-ink/30 rounded-xl p-8 text-center font-mono text-sm opacity-60">
            No entries yet. Create one with the button above.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {entries.map((entry) => (
              <div key={entry.id} className="bg-white border-[3px] border-ink rounded-[18px] overflow-hidden shadow-hard-md">
                <div className="px-5 py-3 bg-ink text-cream flex justify-between items-center flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-display text-lg">v{entry.version}</span>
                    <span className={`px-2.5 py-0.5 border-2 border-white/20 rounded-md font-mono text-[0.65rem] uppercase font-bold ${entry.published ? 'bg-mint text-ink' : 'bg-white/10 text-cream/60'}`}>
                      {entry.published ? 'published' : 'draft'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[0.75rem] opacity-60">{entry.release_date}</span>
                    <button
                      onClick={() => togglePublished(entry)}
                      className="px-2.5 py-1 bg-white/10 border border-white/20 rounded-md font-mono text-[0.65rem] font-bold uppercase hover:bg-white/20 transition-colors"
                    >
                      {entry.published ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      onClick={() => openEdit(entry)}
                      className="px-2.5 py-1 bg-yellow-pop text-ink border-2 border-ink rounded-md font-mono text-[0.65rem] font-bold uppercase"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="px-2.5 py-1 bg-pink-soft text-pink-hot border-2 border-pink-hot rounded-md font-mono text-[0.65rem] font-bold uppercase"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <ul className="divide-y divide-ink/10">
                  {entry.changes.map((c, i) => (
                    <li key={i} className="px-5 py-3 flex items-start gap-3">
                      <span className={`flex-shrink-0 px-2 py-0.5 border-2 border-ink rounded-md font-mono text-[0.65rem] uppercase font-bold mt-0.5 ${typeCls[c.type]}`}>
                        {c.type}
                      </span>
                      <span className="text-[0.88rem] leading-snug">{c.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function EntryForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial: ChangelogEntry | null
  onSaved: (entry: ChangelogEntry, isNew: boolean) => void
  onCancel: () => void
}) {
  const [version, setVersion]     = useState(initial?.version ?? '')
  const [date, setDate]           = useState(initial?.release_date ?? new Date().toISOString().slice(0, 10))
  const [published, setPublished] = useState(initial?.published ?? false)
  const [changes, setChanges]     = useState<{ type: ChangeType; text: string }[]>(
    initial?.changes ?? [{ type: 'added', text: '' }]
  )
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  function addChange() {
    setChanges((c) => [...c, { type: 'added', text: '' }])
  }

  function removeChange(i: number) {
    setChanges((c) => c.filter((_, idx) => idx !== i))
  }

  function updateChange(i: number, field: 'type' | 'text', value: string) {
    setChanges((c) => c.map((ch, idx) => idx === i ? { ...ch, [field]: value } : ch))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const filtered = changes.filter((c) => c.text.trim())
    if (!version.trim() || filtered.length === 0) {
      setError('Version and at least one change are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = { changelog_entry: { version: version.trim(), release_date: date, published, changes: filtered } }
      if (initial) {
        const { data } = await api.patch(`/admin/changelog_entries/${initial.id}`, payload)
        onSaved(data.entry, false)
      } else {
        const { data } = await api.post('/admin/changelog_entries', payload)
        onSaved(data.entry, true)
      }
    } catch {
      setError('Save failed. Check the fields and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="bg-cream border-[3px] border-ink rounded-[18px] p-6 mb-6 shadow-hard-md flex flex-col gap-4"
    >
      <div className="font-display text-base mb-1">
        {initial ? `Edit v${initial.version}` : 'New entry'}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="font-mono text-[0.65rem] uppercase opacity-60">Version</label>
          <input
            type="text"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="0.2.0"
            className="px-3 py-2 border-[2.5px] border-ink rounded-lg font-mono text-sm bg-white outline-none focus:border-pink-hot"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-mono text-[0.65rem] uppercase opacity-60">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 border-[2.5px] border-ink rounded-lg font-mono text-sm bg-white outline-none focus:border-pink-hot"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer pb-2">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="w-4 h-4 accent-pink-hot"
          />
          <span className="font-mono text-[0.75rem] uppercase font-bold">Publish</span>
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <div className="font-mono text-[0.65rem] uppercase opacity-60">Changes</div>
        {changes.map((c, i) => (
          <div key={i} className="flex gap-2 items-center">
            <select
              value={c.type}
              onChange={(e) => updateChange(i, 'type', e.target.value)}
              className="px-2 py-2 border-[2.5px] border-ink rounded-lg font-mono text-[0.72rem] bg-white outline-none focus:border-pink-hot"
            >
              {CHANGE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input
              type="text"
              value={c.text}
              onChange={(e) => updateChange(i, 'text', e.target.value)}
              placeholder="Describe the change…"
              className="flex-1 px-3 py-2 border-[2.5px] border-ink rounded-lg font-body text-sm bg-white outline-none focus:border-pink-hot"
            />
            <button
              type="button"
              onClick={() => removeChange(i)}
              className="px-2.5 py-2 bg-pink-soft text-pink-hot border-2 border-pink-hot rounded-lg font-mono text-[0.7rem] font-bold"
              disabled={changes.length === 1}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addChange}
          className="self-start px-3 py-1.5 bg-white border-2 border-ink rounded-lg font-mono text-[0.65rem] font-bold uppercase hover:bg-cream transition-colors"
        >
          + Add change
        </button>
      </div>

      {error && <p className="font-mono text-[0.75rem] text-pink-hot">⚠ {error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 bg-ink text-cream border-[2.5px] border-ink rounded-[10px] font-mono text-[0.75rem] font-bold uppercase disabled:opacity-50"
          style={{ boxShadow: '3px 3px 0 #ff3d8a' }}
        >
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Create entry'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 bg-white border-[2.5px] border-ink rounded-[10px] font-mono text-[0.75rem] font-bold uppercase"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
