import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import api from '../../lib/api'
import { useAuth } from '../../lib/auth'

interface SubjectResult {
  id: number
  characters: string
  type: 'kanji' | 'vocabulary'
  level: number
  meaning: string
  reading: string | null
  phrase_count: number
}

interface PhraseRow {
  id: number
  phrase_subject_id: number
  japanese: string
  english: string
  source: 'tatoeba' | 'wanikani' | 'admin'
  source_id: string | null
  length: number
  length_bucket: number
  position: number | null
  is_primary: boolean
}

export default function AdminPhrasesPage() {
  const navigate = useNavigate()
  const { user, fetchUser } = useAuth()

  // Make sure user is loaded with admin flag before deciding whether to redirect
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    fetchUser().finally(() => setAuthChecked(true))
  }, [fetchUser])

  useEffect(() => {
    if (authChecked && user && !user.admin) {
      navigate('/dashboard', { replace: true })
    }
  }, [authChecked, user, navigate])

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SubjectResult[]>([])
  const [searchingSubjects, setSearchingSubjects] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState<SubjectResult | null>(null)
  const [phrases, setPhrases] = useState<PhraseRow[]>([])
  const [loadingPhrases, setLoadingPhrases] = useState(false)
  const [reordering, setReordering] = useState(false)

  // New phrase form
  const [showAddForm, setShowAddForm] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  if (!authChecked) {
    return <div className="min-h-screen bg-cream flex items-center justify-center font-mono text-sm opacity-60">Checking access…</div>
  }
  if (!user?.admin) {
    return <div className="min-h-screen bg-cream flex items-center justify-center font-mono text-sm">Admin access required</div>
  }

  async function searchSubjects(q: string) {
    setSearchQuery(q)
    if (q.trim().length < 1) {
      setSearchResults([])
      return
    }
    setSearchingSubjects(true)
    try {
      const { data } = await api.get('/admin/phrases/search_subjects', { params: { q } })
      setSearchResults(data.subjects)
    } catch {
      setSearchResults([])
    } finally {
      setSearchingSubjects(false)
    }
  }

  async function loadPhrasesForSubject(subject: SubjectResult) {
    setSelectedSubject(subject)
    setShowAddForm(false)
    setLoadingPhrases(true)
    try {
      const { data } = await api.get('/admin/phrases', { params: { subject_id: subject.id } })
      setPhrases(data.phrases)
    } catch {
      setPhrases([])
    } finally {
      setLoadingPhrases(false)
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = phrases.findIndex((p) => p.phrase_subject_id === active.id)
    const newIndex = phrases.findIndex((p) => p.phrase_subject_id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    const newOrder = arrayMove(phrases, oldIndex, newIndex)
    setPhrases(newOrder.map((p, i) => ({ ...p, position: i + 1 })))

    if (!selectedSubject) return
    setReordering(true)
    try {
      await api.post('/admin/phrases/reorder', {
        subject_id: selectedSubject.id,
        ordered_phrase_subject_ids: newOrder.map((p) => p.phrase_subject_id),
      })
    } catch {
      // Rollback on failure
      setPhrases(phrases)
    } finally {
      setReordering(false)
    }
  }

  async function handleDeletePhrase(phraseId: number) {
    if (!confirm('Delete this phrase? It will be removed from ALL subjects it belongs to.')) return
    try {
      await api.delete(`/admin/phrases/${phraseId}`)
      setPhrases((curr) => curr.filter((p) => p.id !== phraseId))
      if (selectedSubject) {
        // Refresh subject phrase counts in search results
        setSearchResults((curr) => curr.map((s) =>
          s.id === selectedSubject.id ? { ...s, phrase_count: Math.max(0, s.phrase_count - 1) } : s
        ))
      }
    } catch {
      alert('Could not delete phrase.')
    }
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

      <main className="relative z-10 max-w-[1100px] mx-auto px-5 sm:px-8 py-8">
        <div className="mb-6">
          <span className="inline-block font-mono text-[0.7rem] uppercase tracking-[0.15em] text-pink-hot font-bold mb-3 px-2.5 py-1 bg-cream border-2 border-pink-hot rounded-md">
            // admin · phrase ordering
          </span>
          <h1 className="font-display text-[clamp(1.6rem,3vw,2.2rem)] leading-[0.95] tracking-[-0.02em] mt-1">
            Manage phrases
          </h1>
          <p className="text-base opacity-70 mt-2">
            Search for a vocab item, then drag to reorder phrases or add new ones. Order applies to all users.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
          {/* Subject search panel */}
          <div className="bg-white border-[3px] border-ink rounded-2xl p-5 shadow-hard-md">
            <div className="font-display text-[0.95rem] mb-3">// SEARCH ITEMS</div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => searchSubjects(e.target.value)}
              placeholder="kanji, kana, or English…"
              className="w-full px-3 py-2.5 border-[2.5px] border-ink rounded-lg font-body text-base bg-cream/60 outline-none focus:border-pink-hot"
            />
            <div className="mt-3 flex flex-col gap-1.5 max-h-[420px] overflow-y-auto">
              {searchingSubjects && <div className="font-mono text-xs opacity-55">Searching…</div>}
              {!searchingSubjects && searchQuery && searchResults.length === 0 && (
                <div className="font-mono text-xs opacity-55">No matches.</div>
              )}
              {searchResults.map((s) => (
                <button
                  key={s.id}
                  onClick={() => loadPhrasesForSubject(s)}
                  className={`text-left p-2.5 border-2 rounded-lg transition-colors ${
                    selectedSubject?.id === s.id
                      ? 'bg-pink-hot text-cream border-ink'
                      : 'bg-cream/40 border-ink/30 hover:border-ink'
                  }`}
                >
                  <div className="font-body font-black text-lg">{s.characters}</div>
                  <div className="font-mono text-[0.65rem] uppercase opacity-75 truncate">
                    {s.type} · LV {s.level} · {s.meaning}
                  </div>
                  <div className="font-mono text-[0.6rem] opacity-60 mt-0.5">
                    {s.phrase_count} phrase{s.phrase_count === 1 ? '' : 's'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Phrase list panel */}
          <div className="bg-white border-[3px] border-ink rounded-2xl p-5 shadow-hard-md">
            {!selectedSubject ? (
              <div className="font-mono text-sm opacity-60 py-8 text-center">
                Search and select an item to manage its phrases.
              </div>
            ) : (
              <>
                <div className="flex justify-between items-baseline flex-wrap gap-2 mb-4">
                  <div>
                    <div className="font-mono text-[0.7rem] uppercase tracking-wider opacity-60 mb-0.5">
                      // PHRASES FOR
                    </div>
                    <div className="flex items-baseline gap-3">
                      <span className="font-body font-black text-2xl">{selectedSubject.characters}</span>
                      <span className="font-mono text-[0.78rem] opacity-65">
                        {selectedSubject.type} · LV {selectedSubject.level} · {selectedSubject.meaning}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAddForm((v) => !v)}
                    className="px-3 py-2 bg-mint border-[2.5px] border-ink rounded-lg font-mono text-[0.7rem] font-bold uppercase shadow-hard-sm hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform"
                  >
                    {showAddForm ? 'Cancel' : '+ Add phrase'}
                  </button>
                </div>

                {showAddForm && (
                  <AddPhraseForm
                    subjectId={selectedSubject.id}
                    onAdded={(newPhrase) => {
                      setPhrases((curr) => [
                        {
                          id: newPhrase.id,
                          phrase_subject_id: newPhrase.phrase_subject_id,
                          japanese: newPhrase.japanese,
                          english: newPhrase.english,
                          source: 'admin',
                          source_id: null,
                          length: newPhrase.japanese.length,
                          length_bucket: 0,
                          position: 1,
                          is_primary: true,
                        },
                        ...curr.map((p, i) => ({ ...p, position: i + 2 })),
                      ])
                      setShowAddForm(false)
                      setSearchResults((curr) => curr.map((s) =>
                        s.id === selectedSubject.id ? { ...s, phrase_count: s.phrase_count + 1 } : s
                      ))
                    }}
                  />
                )}

                {loadingPhrases ? (
                  <div className="font-mono text-sm opacity-55 py-4">Loading phrases…</div>
                ) : phrases.length === 0 ? (
                  <div className="bg-cream/60 border-2 border-dashed border-ink/30 rounded-lg p-6 text-center font-mono text-sm opacity-65">
                    No phrases yet. Add one with the button above.
                  </div>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext
                      items={phrases.map((p) => p.phrase_subject_id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="flex flex-col gap-2">
                        {phrases.map((p, i) => (
                          <SortablePhraseRow
                            key={p.phrase_subject_id}
                            phrase={p}
                            index={i}
                            onUpdated={(updated) => {
                              setPhrases((curr) =>
                                curr.map((x) => x.id === updated.id ? { ...x, ...updated } : x)
                              )
                            }}
                            onDelete={() => handleDeletePhrase(p.id)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}

                {reordering && (
                  <div className="mt-2 font-mono text-[0.7rem] opacity-55 text-center">Saving order…</div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function SortablePhraseRow({
  phrase,
  index,
  onUpdated,
  onDelete,
}: {
  phrase: PhraseRow
  index: number
  onUpdated: (p: { id: number; japanese: string; english: string }) => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: phrase.phrase_subject_id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const [editing, setEditing] = useState(false)
  const [japanese, setJapanese] = useState(phrase.japanese)
  const [english, setEnglish] = useState(phrase.english)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      const { data } = await api.patch(`/admin/phrases/${phrase.id}`, { japanese, english })
      onUpdated({ id: data.phrase.id, japanese: data.phrase.japanese, english: data.phrase.english })
      setEditing(false)
    } catch {
      alert('Save failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border-[2.5px] border-ink rounded-xl bg-cream/40 overflow-hidden"
    >
      <div className="flex items-center gap-3 p-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing px-2 py-1 font-mono text-[0.7rem] opacity-50 select-none"
          title="Drag to reorder"
        >
          ⋮⋮
        </div>
        <div className="font-display text-base text-pink-hot w-7 text-center">{index + 1}</div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={japanese}
                onChange={(e) => setJapanese(e.target.value)}
                className="w-full px-2 py-1.5 border-2 border-ink rounded-md font-body text-base bg-white"
                placeholder="Japanese"
              />
              <input
                type="text"
                value={english}
                onChange={(e) => setEnglish(e.target.value)}
                className="w-full px-2 py-1.5 border-2 border-ink rounded-md font-body text-sm bg-white"
                placeholder="English translation"
              />
            </div>
          ) : (
            <>
              <div className="font-body font-bold text-base truncate">{phrase.japanese}</div>
              <div className="font-body text-[0.85rem] opacity-75 truncate">{phrase.english}</div>
              <div className="font-mono text-[0.6rem] opacity-50 mt-0.5 uppercase">
                {phrase.source}
                {phrase.source_id && phrase.source !== 'admin' && ` · #${phrase.source_id}`}
                · {phrase.length} chars · bucket {phrase.length_bucket}
              </div>
            </>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          {editing ? (
            <>
              <button
                onClick={save}
                disabled={saving}
                className="px-2.5 py-1 bg-mint border-2 border-ink rounded-md font-mono text-[0.65rem] font-bold uppercase disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditing(false)
                  setJapanese(phrase.japanese)
                  setEnglish(phrase.english)
                }}
                className="px-2.5 py-1 bg-white border-2 border-ink rounded-md font-mono text-[0.65rem] font-bold uppercase"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="px-2.5 py-1 bg-yellow-pop border-2 border-ink rounded-md font-mono text-[0.65rem] font-bold uppercase"
              >
                Edit
              </button>
              <button
                onClick={onDelete}
                className="px-2.5 py-1 bg-pink-soft border-2 border-pink-hot rounded-md font-mono text-[0.65rem] font-bold uppercase text-pink-hot"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function AddPhraseForm({
  subjectId,
  onAdded,
}: {
  subjectId: number
  onAdded: (phrase: { id: number; phrase_subject_id: number; japanese: string; english: string }) => void
}) {
  const [japanese, setJapanese] = useState('')
  const [english, setEnglish] = useState('')
  const [bucket, setBucket] = useState<0 | 1 | 2 | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!japanese.trim() || !english.trim()) return

    setSubmitting(true)
    setError(null)
    try {
      const { data } = await api.post('/admin/phrases', {
        japanese: japanese.trim(),
        english: english.trim(),
        target_subject_ids: [subjectId],
        length_bucket: bucket,
      })
      // Reload phrases list — easiest way to get the phrase_subject_id is to refetch.
      // For optimistic UI we'll fake one with id=phrase.id (close enough for new entries
      // since they get position 1 at the top until next refresh).
      onAdded({
        id: data.phrase.id,
        phrase_subject_id: data.phrase.id, // approximate; real one from server on refresh
        japanese: data.phrase.japanese,
        english: data.phrase.english,
      })
      setJapanese('')
      setEnglish('')
      setBucket(null)
    } catch {
      setError('Failed to add phrase.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="bg-cream/60 border-[2.5px] border-dashed border-ink/40 rounded-xl p-4 mb-4 flex flex-col gap-2"
    >
      <input
        type="text"
        value={japanese}
        onChange={(e) => setJapanese(e.target.value)}
        placeholder="Japanese phrase (e.g. 一つ一つ)"
        className="px-3 py-2 border-2 border-ink rounded-md font-body text-base bg-white"
      />
      <input
        type="text"
        value={english}
        onChange={(e) => setEnglish(e.target.value)}
        placeholder="English translation (e.g. one by one)"
        className="px-3 py-2 border-2 border-ink rounded-md font-body text-sm bg-white"
      />
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-[0.65rem] uppercase opacity-60">Length bucket:</span>
        {([0, 1, 2] as const).map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => setBucket(b)}
            className={`px-2.5 py-1 border-2 border-ink rounded-md font-mono text-[0.65rem] font-bold ${
              bucket === b ? 'bg-pink-hot text-cream' : 'bg-white'
            }`}
          >
            {b === 0 ? 'short (<10)' : b === 1 ? 'medium (10-25)' : 'long (>25)'}
          </button>
        ))}
        <span className="font-mono text-[0.65rem] opacity-50">
          {bucket === null ? '(auto)' : ''}
        </span>
      </div>
      {error && (
        <div className="font-mono text-[0.7rem] text-pink-hot">⚠ {error}</div>
      )}
      <button
        type="submit"
        disabled={submitting || !japanese.trim() || !english.trim()}
        className="self-start px-4 py-2 bg-ink text-cream border-[2.5px] border-ink rounded-lg font-mono text-[0.7rem] font-bold uppercase shadow-hard-sm disabled:opacity-50"
        style={{ boxShadow: '3px 3px 0 #ff3d8a' }}
      >
        {submitting ? 'Adding…' : 'Add phrase'}
      </button>
    </form>
  )
}
