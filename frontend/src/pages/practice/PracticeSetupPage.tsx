import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import api from '../../lib/api'
import { PracticeMode, ItemType, ReviewOrder, SetupParams } from '../../lib/practiceTypes'

interface DashboardSnapshot {
  wanikani_level: number | null
  learned_kanji: number
  learned_vocabulary: number
}

interface LocationState {
  setupParams?: SetupParams
}

const REALMS = [
  { name: 'PLEASANT', kanji: '快', range: [1, 10] },
  { name: 'PAINFUL', kanji: '苦', range: [11, 20] },
  { name: 'DEATH', kanji: '死', range: [21, 30] },
  { name: 'HELL', kanji: '地獄', range: [31, 40] },
  { name: 'PARADISE', kanji: '天国', range: [41, 50] },
  { name: 'REALITY', kanji: '現実', range: [51, 60] },
] as const

const MODES: Array<{ id: PracticeMode; jp: string; arrow: string; en: string; desc: string }> = [
  { id: 'kanji_to_meaning', jp: '日本語', arrow: '→', en: 'meaning', desc: 'See the kanji/word, type the English meaning' },
  { id: 'kanji_to_reading', jp: '日本語', arrow: '→', en: 'reading', desc: 'See the kanji/word, type the Japanese reading' },
  { id: 'mixed', jp: 'Mixed', arrow: '', en: '', desc: 'Random direction every question' },
]

const COUNT_PRESETS = [10, 20, 50, 100]

export default function PracticeSetupPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const preset = searchParams.get('preset')
  const incomingParams = (location.state as LocationState | null)?.setupParams

  const [itemTypes, setItemTypes] = useState<ItemType[]>(['kanji'])
  const [selectedLevels, setSelectedLevels] = useState<number[]>([])
  const [levelMode, setLevelMode] = useState<'all' | 'current' | 'last5' | 'custom'>('current')
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('kanji_to_meaning')
  const [count, setCount] = useState(20)
  const [customCount, setCustomCount] = useState('')
  const [reviewOrder, setReviewOrder] = useState<ReviewOrder>('random')

  const [dashboard, setDashboard] = useState<DashboardSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      api.get('/practice_setting').then((r) => r.data),
      api.get('/dashboard').then((r) => r.data),
    ])
      .then(([settings, dash]) => {
        setDashboard({
          wanikani_level: dash.wanikani_level,
          learned_kanji: dash.learned_kanji,
          learned_vocabulary: dash.learned_vocabulary,
        })

        // PRIORITY 1: incoming params from "Return to setup" — pre-fill everything from previous session
        if (incomingParams) {
          if (incomingParams.item_types?.length) {
            setItemTypes(incomingParams.item_types as ItemType[])
          }
          if (incomingParams.levels?.length) {
            setSelectedLevels(incomingParams.levels)
            setLevelMode('custom')
          }
          if (incomingParams.count) setCount(incomingParams.count)
          if (incomingParams.practice_mode) {
            const mode = incomingParams.practice_mode
            if (['kanji_to_meaning', 'kanji_to_reading', 'mixed'].includes(mode)) {
              setPracticeMode(mode as PracticeMode)
            }
          }
          if (incomingParams.review_order) {
            setReviewOrder(incomingParams.review_order as ReviewOrder)
          }
        } else {
          // PRIORITY 2: user settings as defaults
          setCount(settings.default_question_count || 20)
          setReviewOrder(settings.review_order || 'random')

          if (settings.default_item_type) {
            setItemTypes([settings.default_item_type as ItemType])
          }

          const savedMode = settings.default_practice_mode
          if (savedMode === 'meaning_to_kanji' || !savedMode) {
            setPracticeMode('kanji_to_meaning')
          } else if (['kanji_to_meaning', 'kanji_to_reading', 'mixed'].includes(savedMode)) {
            setPracticeMode(savedMode as PracticeMode)
          }

          if (dash.wanikani_level) {
            setSelectedLevels([dash.wanikani_level])
          } else if (settings.default_level_min && settings.default_level_max) {
            const range: number[] = []
            for (let i = settings.default_level_min; i <= settings.default_level_max; i++) range.push(i)
            setSelectedLevels(range)
            setLevelMode('custom')
          }
        }

        if (preset === 'weakest_first') {
          setReviewOrder('weakest_first')
        }
      })
      .catch(() => setError('Could not load your settings. Defaults applied.'))
      .finally(() => setLoading(false))
  }, [preset, incomingParams])

  const userLevel = dashboard?.wanikani_level || null
  const maxAvailableLevel = userLevel || 60

  function applyLevelMode(mode: typeof levelMode) {
    setLevelMode(mode)
    if (!userLevel) return

    if (mode === 'all') {
      const all: number[] = []
      for (let i = 1; i <= userLevel; i++) all.push(i)
      setSelectedLevels(all)
    } else if (mode === 'current') {
      setSelectedLevels([userLevel])
    } else if (mode === 'last5') {
      const recent: number[] = []
      for (let i = Math.max(1, userLevel - 4); i <= userLevel; i++) recent.push(i)
      setSelectedLevels(recent)
    }
  }

  function toggleLevel(level: number) {
    if (level > maxAvailableLevel) return
    setLevelMode('custom')
    setSelectedLevels((curr) =>
      curr.includes(level) ? curr.filter((l) => l !== level) : [...curr, level].sort((a, b) => a - b)
    )
  }

  function toggleRealm(realm: (typeof REALMS)[number]) {
    setLevelMode('custom')
    const [start, end] = realm.range
    const realmLevels: number[] = []
    for (let i = start; i <= Math.min(end, maxAvailableLevel); i++) realmLevels.push(i)

    const allSelected = realmLevels.every((l) => selectedLevels.includes(l))

    setSelectedLevels((curr) => {
      if (allSelected) {
        return curr.filter((l) => !realmLevels.includes(l))
      } else {
        const merged = new Set([...curr, ...realmLevels])
        return Array.from(merged).sort((a, b) => a - b)
      }
    })
  }

  function realmState(realm: (typeof REALMS)[number]): 'all' | 'some' | 'none' {
    const [start, end] = realm.range
    const realmLevels: number[] = []
    for (let i = start; i <= Math.min(end, maxAvailableLevel); i++) realmLevels.push(i)
    if (realmLevels.length === 0) return 'none'

    const selectedInRealm = realmLevels.filter((l) => selectedLevels.includes(l))
    if (selectedInRealm.length === 0) return 'none'
    if (selectedInRealm.length === realmLevels.length) return 'all'
    return 'some'
  }

  function realmAvailable(realm: (typeof REALMS)[number]): boolean {
    return realm.range[0] <= maxAvailableLevel
  }

  function toggleItemType(type: ItemType) {
    setItemTypes((curr) =>
      curr.includes(type) ? curr.filter((t) => t !== type) : [...curr, type]
    )
  }

  const finalCount = customCount ? parseInt(customCount, 10) || count : count

  const summary = useMemo(() => {
    const types = itemTypes.length === 0 ? 'no items' : itemTypes.join(' + ')
    const levelText =
      selectedLevels.length === 0
        ? 'no levels'
        : selectedLevels.length === 1
        ? `level ${selectedLevels[0]}`
        : `${selectedLevels.length} levels`
    const modeText = MODES.find((m) => m.id === practiceMode)?.id.replace(/_/g, ' ') || practiceMode
    return `${types} · ${levelText} · ${modeText} · ${reviewOrder.replace(/_/g, ' ')}`
  }, [itemTypes, selectedLevels, practiceMode, reviewOrder])

  const onlyRadicals =
    itemTypes.length === 1 && itemTypes[0] === 'radical' && practiceMode === 'kanji_to_reading'

  const canStart =
    itemTypes.length > 0 &&
    selectedLevels.length > 0 &&
    finalCount > 0 &&
    !onlyRadicals &&
    !submitting

  async function handleStart() {
    setError(null)
    setSubmitting(true)
    try {
      const { data } = await api.post('/practice_sessions', {
        session_type: 'item',
        item_types: itemTypes,
        levels: selectedLevels,
        count: finalCount,
        practice_mode: practiceMode,
        review_order: reviewOrder,
      })
      navigate(`/practice/session/${data.session.id}`, {
        state: { firstQuestion: data.first_question, session: data.session },
      })
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : null
      setError(message || 'Could not create session. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center font-mono text-sm opacity-60">
        Loading…
      </div>
    )
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
          <span className="font-display text-base">KaniCompanion</span>
        </Link>
        <Link
          to="/dashboard"
          className="font-mono text-[0.78rem] uppercase tracking-wider text-ink/60 hover:text-pink-hot transition-colors no-underline"
        >
          ← Back to dashboard
        </Link>
      </header>

      <main className="relative z-10 max-w-[980px] mx-auto px-5 sm:px-8 py-10">
        <div className="mb-8">
          <span className="inline-block font-mono text-[0.7rem] uppercase tracking-[0.15em] text-pink-hot font-bold mb-3 px-2.5 py-1 bg-cream border-2 border-pink-hot rounded-md">
            // new session
          </span>
          <h1 className="font-display text-[clamp(2rem,4vw,2.6rem)] leading-[0.95] tracking-[-0.02em] mt-1">
            Ready to{' '}
            <span className="relative inline-block text-pink-hot">
              drill
              <span
                className="absolute bottom-0.5 left-0 right-0 h-2 bg-yellow-pop -z-10"
                style={{ transform: 'skew(-8deg)' }}
              />
            </span>
            ?
          </h1>
          <p className="text-base opacity-70 mt-2">
            {incomingParams
              ? 'Previous setup loaded — tweak anything before starting'
              : 'Defaults loaded from your settings — adjust anything for this session'}
          </p>
        </div>

        <div className="bg-white border-[3px] border-ink rounded-[20px] p-6 sm:p-8 shadow-hard-lg">
          <Section title="// ITEM TYPES" meta="Pick one or more">
            <div className="flex gap-2.5 flex-wrap">
              <ItemTypePill
                count={null}
                label="Radicals"
                selected={itemTypes.includes('radical')}
                onClick={() => toggleItemType('radical')}
                variant="mint"
              />
              <ItemTypePill
                count={dashboard?.learned_kanji || null}
                label="Kanji"
                selected={itemTypes.includes('kanji')}
                onClick={() => toggleItemType('kanji')}
                variant="pink"
              />
              <ItemTypePill
                count={dashboard?.learned_vocabulary || null}
                label="Vocabulary"
                selected={itemTypes.includes('vocabulary')}
                onClick={() => toggleItemType('vocabulary')}
                variant="purple"
              />
            </div>
          </Section>

          <Divider />

          <Section
            title="// LEVELS"
            meta={userLevel ? `Levels 1-${userLevel} unlocked` : 'No WaniKani level synced'}
          >
            <div className="flex gap-2 mb-4 flex-wrap">
              <LevelQuickBtn label="All unlocked" active={levelMode === 'all'} onClick={() => applyLevelMode('all')} />
              <LevelQuickBtn label="Current level" active={levelMode === 'current'} onClick={() => applyLevelMode('current')} />
              <LevelQuickBtn label="Last 5 levels" active={levelMode === 'last5'} onClick={() => applyLevelMode('last5')} />
              <LevelQuickBtn label="Custom" active={levelMode === 'custom'} onClick={() => setLevelMode('custom')} />
            </div>

            <div className="flex flex-col gap-3">
              {REALMS.map((realm) => {
                const state = realmState(realm)
                const available = realmAvailable(realm)

                return (
                  <div key={realm.name} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-mono text-[0.6rem] uppercase tracking-[0.15em] opacity-60 flex-shrink-0">
                        {realm.kanji} {realm.name}
                      </div>
                      {available && (
                        <button
                          type="button"
                          onClick={() => toggleRealm(realm)}
                          className={`flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-wider px-2 py-1 border-2 border-ink rounded-md transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 shadow-[2px_2px_0_#1a0b2e] ${
                            state === 'all'
                              ? 'bg-pink-hot text-cream'
                              : state === 'some'
                              ? 'bg-pink-soft'
                              : 'bg-white'
                          }`}
                          aria-label={`Toggle ${realm.name} levels`}
                        >
                          <RealmCheckbox state={state} />
                          <span>
                            {state === 'all' ? 'All selected' : state === 'some' ? 'Some' : 'Select all'}
                          </span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-10 gap-1">
                      {Array.from(
                        { length: realm.range[1] - realm.range[0] + 1 },
                        (_, i) => realm.range[0] + i
                      ).map((level) => (
                        <LevelCell
                          key={level}
                          level={level}
                          selected={selectedLevels.includes(level)}
                          unavailable={level > maxAvailableLevel}
                          onClick={() => toggleLevel(level)}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </Section>

          <Divider />

          <Section title="// PRACTICE MODE" meta="Question direction">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {MODES.map((mode) => (
                <ModeCard
                  key={mode.id}
                  selected={practiceMode === mode.id}
                  onClick={() => setPracticeMode(mode.id)}
                  jp={mode.jp}
                  arrow={mode.arrow}
                  en={mode.en}
                  desc={mode.desc}
                />
              ))}
            </div>

            {onlyRadicals && (
              <div className="mt-3 bg-yellow-pop/40 border-2 border-yellow-pop rounded-md p-2.5 font-mono text-[0.7rem]">
                ⚠ Radicals don't have readings. Pick "japanese → meaning" or add kanji/vocab.
              </div>
            )}
          </Section>

          <Divider />

          <Section title="// HOW MANY" meta="Question count">
            <div className="flex gap-2 items-center flex-wrap">
              {COUNT_PRESETS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setCount(n)
                    setCustomCount('')
                  }}
                  className={`px-4 py-2.5 border-[2.5px] border-ink rounded-[10px] font-display text-base shadow-hard-sm transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 ${
                    count === n && !customCount ? 'bg-yellow-pop' : 'bg-white'
                  }`}
                >
                  {n}
                </button>
              ))}
              <span className="opacity-50 font-mono text-[0.7rem] mx-1">or</span>
              <input
                type="number"
                value={customCount}
                onChange={(e) => setCustomCount(e.target.value)}
                placeholder="custom"
                min={1}
                max={500}
                className="w-24 px-3 py-2.5 border-[2.5px] border-ink rounded-[10px] font-display text-base bg-white shadow-hard-sm outline-none focus:border-pink-hot"
              />
            </div>
          </Section>

          <Divider />

          <Section title="// REVIEW ORDER" meta="How items are picked">
            <div className="flex gap-2 flex-wrap">
              {(['random', 'weakest_first', 'newest_first', 'oldest_first'] as ReviewOrder[]).map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setReviewOrder(o)}
                  className={`px-3.5 py-2 border-2 border-ink rounded-lg font-mono text-[0.72rem] font-bold uppercase shadow-hard-sm transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 ${
                    reviewOrder === o ? 'bg-ink text-cream' : 'bg-white'
                  }`}
                >
                  {o.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </Section>
        </div>

        {error && (
          <div className="mt-6 bg-pink-soft border-2 border-pink-hot rounded-[10px] p-4 font-mono text-[0.8rem] shadow-hard-sm">
            ⚠ {error}
          </div>
        )}

        <div
          className="mt-8 px-6 py-5 bg-ink text-cream border-[3px] border-ink rounded-2xl flex justify-between items-center gap-5 flex-wrap"
          style={{ boxShadow: '6px 6px 0 #ff3d8a' }}
        >
          <div className="font-mono text-[0.78rem]">
            <div className="font-display text-3xl text-mint leading-none">{finalCount}</div>
            <div className="mt-1 opacity-85 uppercase tracking-[0.1em]">{summary}</div>
          </div>
          <button
            onClick={handleStart}
            disabled={!canStart}
            className="px-7 py-3.5 bg-mint text-ink border-[2.5px] border-ink rounded-[10px] font-display text-base disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:-translate-x-0.5 enabled:hover:-translate-y-0.5 transition-transform"
            style={{ boxShadow: '4px 4px 0 #fef3e0' }}
          >
            {submitting ? 'Starting…' : 'Start session →'}
          </button>
        </div>
      </main>
    </div>
  )
}

function Section({ title, meta, children }: { title: string; meta: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-3">
        <div className="font-display text-[0.95rem] tracking-[0.02em]">{title}</div>
        <div className="font-mono text-[0.7rem] opacity-55 uppercase">{meta}</div>
      </div>
      {children}
    </div>
  )
}

function Divider() {
  return <div className="my-7 border-t-2 border-dashed border-ink/15" />
}

function ItemTypePill({
  count,
  label,
  selected,
  onClick,
  variant,
}: {
  count: number | null
  label: string
  selected: boolean
  onClick: () => void
  variant: 'mint' | 'pink' | 'purple'
}) {
  const selectedBg = {
    mint: 'bg-mint text-ink',
    pink: 'bg-pink-hot text-cream',
    purple: 'bg-purple-electric text-cream',
  }[variant]

  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2.5 border-[2.5px] border-ink rounded-full font-mono text-[0.78rem] font-bold uppercase tracking-wider shadow-hard-sm flex items-center gap-2 transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 ${
        selected ? selectedBg : 'bg-white'
      }`}
    >
      <span>{label}</span>
      {count !== null && count > 0 && (
        <span className="font-body font-black text-[0.85rem] opacity-70">{count.toLocaleString()}</span>
      )}
    </button>
  )
}

function LevelQuickBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 border-2 border-ink rounded-lg font-mono text-[0.7rem] font-bold uppercase shadow-hard-sm ${
        active ? 'bg-ink text-cream' : 'bg-white'
      }`}
    >
      {label}
    </button>
  )
}

function LevelCell({
  level,
  selected,
  unavailable,
  onClick,
}: {
  level: number
  selected: boolean
  unavailable: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={unavailable}
      onClick={onClick}
      className={`aspect-square border-2 rounded font-mono text-[0.7rem] font-bold flex items-center justify-center transition-colors ${
        selected
          ? 'bg-pink-hot text-cream border-ink'
          : unavailable
          ? 'bg-black/5 text-black/30 border-black/10 cursor-not-allowed'
          : 'bg-white border-ink hover:bg-pink-soft'
      }`}
    >
      {level}
    </button>
  )
}

function RealmCheckbox({ state }: { state: 'all' | 'some' | 'none' }) {
  if (state === 'all') {
    return (
      <span className="inline-flex w-3 h-3 bg-cream border-2 border-cream rounded-sm items-center justify-center">
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M1 4 L3 6 L7 1" stroke="#ff3d8a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    )
  }
  if (state === 'some') {
    return (
      <span className="inline-flex w-3 h-3 border-2 border-ink rounded-sm bg-pink-hot items-center justify-center">
        <span className="block w-1.5 h-0.5 bg-cream rounded" />
      </span>
    )
  }
  return <span className="inline-block w-3 h-3 border-2 border-ink rounded-sm bg-white" />
}

function ModeCard({
  selected,
  onClick,
  jp,
  arrow,
  en,
  desc,
}: {
  selected: boolean
  onClick: () => void
  jp: string
  arrow: string
  en: string
  desc: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-4 border-[2.5px] rounded-xl text-left shadow-hard-sm transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 ${
        selected ? 'bg-pink-soft border-pink-hot' : 'bg-white border-ink'
      }`}
    >
      <div className="font-display text-[0.9rem] mb-1 flex items-center gap-2 flex-wrap">
        <span>{jp}</span>
        {arrow && <span className="text-pink-hot">{arrow}</span>}
        <span>{en}</span>
      </div>
      <div className="font-mono text-[0.7rem] opacity-65">{desc}</div>
    </button>
  )
}
