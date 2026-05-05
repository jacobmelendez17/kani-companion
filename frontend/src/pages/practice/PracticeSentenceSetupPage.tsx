import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import {
  EligibleSubject,
  MixMode,
  ReviewOrder,
  SentenceScopeType,
  SetupParams,
  StageFilter,
} from '../../lib/practiceTypes'

interface DashboardSnapshot {
  wanikani_level: number | null
  sentence_eligible: number
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

const COUNT_PRESETS = [10, 20, 50, 100]

export default function PracticeSentenceSetupPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const incomingParams = (location.state as LocationState | null)?.setupParams

  // Scope: how the user chooses what items to practice
  const [scopeType, setScopeType] = useState<SentenceScopeType>('level')
  const [selectedLevels, setSelectedLevels] = useState<number[]>([])
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([])

  // Stage filter
  const [stageFilter, setStageFilter] = useState<StageFilter>('all')

  // New vs. review mix
  const [mixMode, setMixMode] = useState<MixMode>('mix')

  // Standard
  const [count, setCount] = useState(20)
  const [customCount, setCustomCount] = useState('')
  const [reviewOrder, setReviewOrder] = useState<ReviewOrder>('random')

  // Vocab picker (for "specific subjects" scope)
  const [pickerLevel, setPickerLevel] = useState<number | null>(null)
  const [pickerSubjects, setPickerSubjects] = useState<EligibleSubject[]>([])
  const [pickerLoading, setPickerLoading] = useState(false)

  // Eligibility map (from /eligibility endpoint) — counts per level
  const [eligibility, setEligibility] = useState<Record<number, { total: number; with_phrases: number }>>({})

  const [dashboard, setDashboard] = useState<DashboardSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initial load
  useEffect(() => {
    Promise.all([
      api.get('/dashboard').then((r) => r.data),
      api.get('/sentence_practice/eligibility').then((r) => r.data),
      api.get('/practice_setting').then((r) => r.data),
    ])
      .then(([dash, eligibilityData, settings]) => {
        setDashboard({
          wanikani_level: dash.wanikani_level,
          sentence_eligible: dash.sentence_eligible,
        })
        setEligibility(eligibilityData.by_level || {})

        if (incomingParams) {
          // Replay flow
          setScopeType((incomingParams.scope_type as SentenceScopeType) || 'level')
          if (incomingParams.levels?.length) setSelectedLevels(incomingParams.levels)
          if (incomingParams.subject_ids?.length) setSelectedSubjectIds(incomingParams.subject_ids)
          if (incomingParams.stage_filter) setStageFilter(incomingParams.stage_filter as StageFilter)
          if (incomingParams.mix_mode) setMixMode(incomingParams.mix_mode as MixMode)
          if (incomingParams.count) setCount(incomingParams.count)
        } else {
          // Apply defaults from settings
          if (settings.sentence_default_scope === 'all_eligible') {
            setScopeType('all_eligible')
          } else if (dash.wanikani_level) {
            setSelectedLevels([dash.wanikani_level])
          }
          if (settings.sentence_default_stage_filter) {
            setStageFilter(settings.sentence_default_stage_filter as StageFilter)
          }
          if (settings.sentence_default_mix) {
            setMixMode(settings.sentence_default_mix as MixMode)
          }
          if (settings.default_question_count) setCount(settings.default_question_count)
          if (settings.review_order) setReviewOrder(settings.review_order as ReviewOrder)
        }
      })
      .catch(() => setError('Could not load setup data.'))
      .finally(() => setLoading(false))
  }, [incomingParams])

  // Load picker subjects when scope is "subject_ids" and user picks a level
  useEffect(() => {
    if (scopeType !== 'subject_ids' || !pickerLevel) return
    setPickerLoading(true)
    api
      .get('/sentence_practice/eligible_subjects', {
        params: { level: pickerLevel, has_phrases: 'true' },
      })
      .then((r) => setPickerSubjects(r.data.subjects))
      .catch(() => setError('Could not load vocabulary list.'))
      .finally(() => setPickerLoading(false))
  }, [scopeType, pickerLevel])

  const userLevel = dashboard?.wanikani_level || null
  const maxAvailableLevel = userLevel || 60

  function toggleLevel(level: number) {
    if (level > maxAvailableLevel) return
    setSelectedLevels((curr) =>
      curr.includes(level) ? curr.filter((l) => l !== level) : [...curr, level].sort((a, b) => a - b)
    )
  }

  function toggleRealm(realm: (typeof REALMS)[number]) {
    const [start, end] = realm.range
    const realmLevels: number[] = []
    for (let i = start; i <= Math.min(end, maxAvailableLevel); i++) realmLevels.push(i)
    const allSelected = realmLevels.every((l) => selectedLevels.includes(l))
    setSelectedLevels((curr) => {
      if (allSelected) return curr.filter((l) => !realmLevels.includes(l))
      return Array.from(new Set([...curr, ...realmLevels])).sort((a, b) => a - b)
    })
  }

  function toggleSubject(subjectId: number) {
    setSelectedSubjectIds((curr) =>
      curr.includes(subjectId) ? curr.filter((id) => id !== subjectId) : [...curr, subjectId]
    )
  }

  const finalCount = customCount ? parseInt(customCount, 10) || count : count

  // Live summary text
  const summary = useMemo(() => {
    const scopeText =
      scopeType === 'all_eligible'
        ? 'all eligible items'
        : scopeType === 'subject_ids'
        ? `${selectedSubjectIds.length} specific item${selectedSubjectIds.length === 1 ? '' : 's'}`
        : selectedLevels.length === 1
        ? `level ${selectedLevels[0]}`
        : `${selectedLevels.length} levels`
    return `${scopeText} · ${stageFilter.replace(/_/g, ' ')} · ${mixMode.replace(/_/g, ' ')}`
  }, [scopeType, selectedLevels, selectedSubjectIds, stageFilter, mixMode])

  const canStart =
    !submitting &&
    finalCount > 0 &&
    ((scopeType === 'all_eligible') ||
      (scopeType === 'level' && selectedLevels.length > 0) ||
      (scopeType === 'subject_ids' && selectedSubjectIds.length > 0))

  async function handleStart() {
    setError(null)
    setSubmitting(true)
    try {
      const { data } = await api.post('/practice_sessions', {
        session_type: 'sentence',
        scope_type:   scopeType,
        levels:       selectedLevels,
        subject_ids:  selectedSubjectIds,
        stage_filter: stageFilter,
        mix_mode:     mixMode,
        count:        finalCount,
        review_order: reviewOrder,
      })
      navigate(`/practice/sentence/session/${data.session.id}`, {
        state: { firstQuestion: data.first_question, session: data.session },
      })
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : null
      setError(message || 'Could not create session.')
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
        {/* Header — purple accents to differentiate from item practice */}
        <div className="mb-8">
          <span className="inline-block font-mono text-[0.7rem] uppercase tracking-[0.15em] text-purple-electric font-bold mb-3 px-2.5 py-1 bg-cream border-2 border-purple-electric rounded-md">
            // sentence practice
          </span>
          <h1 className="font-display text-[clamp(2rem,4vw,2.6rem)] leading-[0.95] tracking-[-0.02em] mt-1">
            Time to{' '}
            <span className="relative inline-block text-purple-electric">
              read
              <span
                className="absolute bottom-0.5 left-0 right-0 h-2 bg-mint -z-10"
                style={{ transform: 'skew(-8deg)' }}
              />
            </span>
            .
          </h1>
          <p className="text-base opacity-70 mt-2">
            Practice translating Japanese sentences. Local SRS tracks your progress.
          </p>
        </div>

        <div className="bg-white border-[3px] border-ink rounded-[20px] p-6 sm:p-8 shadow-hard-lg">
          {/* Scope */}
          <Section title="// SCOPE" meta="What items to practice from">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <ScopeCard
                label="By level"
                desc="Pick one or more WK levels"
                selected={scopeType === 'level'}
                onClick={() => setScopeType('level')}
              />
              <ScopeCard
                label="Specific items"
                desc="Pick exact vocab/kanji"
                selected={scopeType === 'subject_ids'}
                onClick={() => setScopeType('subject_ids')}
              />
              <ScopeCard
                label="All eligible"
                desc={`${dashboard?.sentence_eligible || 0} items unlocked`}
                selected={scopeType === 'all_eligible'}
                onClick={() => setScopeType('all_eligible')}
              />
            </div>
          </Section>

          {/* Conditional level picker */}
          {scopeType === 'level' && (
            <>
              <Divider />
              <Section
                title="// LEVELS"
                meta={userLevel ? `Levels 1-${userLevel} unlocked` : 'No WaniKani level synced'}
              >
                <div className="flex flex-col gap-3">
                  {REALMS.map((realm) => {
                    const [start, end] = realm.range
                    const realmLevels: number[] = []
                    for (let i = start; i <= Math.min(end, maxAvailableLevel); i++) realmLevels.push(i)
                    const inRealm = realmLevels.filter((l) => selectedLevels.includes(l))
                    const realmState = inRealm.length === 0 ? 'none' : inRealm.length === realmLevels.length ? 'all' : 'some'
                    const available = realm.range[0] <= maxAvailableLevel
                    return (
                      <div key={realm.name} className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-mono text-[0.6rem] uppercase tracking-[0.15em] opacity-60">
                            {realm.kanji} {realm.name}
                          </div>
                          {available && (
                            <button
                              type="button"
                              onClick={() => toggleRealm(realm)}
                              className={`flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-wider px-2 py-1 border-2 border-ink rounded-md shadow-[2px_2px_0_#1a0b2e] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform ${
                                realmState === 'all'
                                  ? 'bg-purple-electric text-cream'
                                  : realmState === 'some'
                                  ? 'bg-pink-soft'
                                  : 'bg-white'
                              }`}
                            >
                              {realmState === 'all' ? '✓ All' : realmState === 'some' ? 'Some' : 'Select'}
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-10 gap-1">
                          {Array.from(
                            { length: realm.range[1] - realm.range[0] + 1 },
                            (_, i) => realm.range[0] + i
                          ).map((level) => {
                            const elig = eligibility[level]
                            const tooltip = elig ? `${elig.with_phrases}/${elig.total} have phrases` : ''
                            return (
                              <button
                                key={level}
                                type="button"
                                disabled={level > maxAvailableLevel}
                                onClick={() => toggleLevel(level)}
                                title={tooltip}
                                className={`aspect-square border-2 rounded font-mono text-[0.7rem] font-bold flex items-center justify-center ${
                                  selectedLevels.includes(level)
                                    ? 'bg-purple-electric text-cream border-ink'
                                    : level > maxAvailableLevel
                                    ? 'bg-black/5 text-black/30 border-black/10 cursor-not-allowed'
                                    : 'bg-white border-ink hover:bg-pink-soft'
                                }`}
                              >
                                {level}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Section>
            </>
          )}

          {/* Conditional subject picker */}
          {scopeType === 'subject_ids' && (
            <>
              <Divider />
              <Section
                title="// PICK ITEMS"
                meta={`${selectedSubjectIds.length} selected`}
              >
                <div className="mb-3 flex flex-wrap gap-1.5">
                  <span className="font-mono text-[0.65rem] opacity-55 uppercase mt-1.5 mr-2">From level:</span>
                  {Array.from({ length: maxAvailableLevel }, (_, i) => i + 1).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setPickerLevel(lvl)}
                      className={`px-2 py-1 border-2 border-ink rounded font-mono text-[0.65rem] font-bold ${
                        pickerLevel === lvl ? 'bg-ink text-cream' : 'bg-white'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>

                {pickerLevel === null && (
                  <div className="bg-pink-soft/40 border-2 border-pink-soft rounded-md p-3 font-mono text-[0.75rem]">
                    Pick a level above to see vocab/kanji available for sentence practice.
                  </div>
                )}

                {pickerLoading && (
                  <div className="font-mono text-sm opacity-60 py-4">Loading…</div>
                )}

                {!pickerLoading && pickerLevel !== null && pickerSubjects.length === 0 && (
                  <div className="bg-yellow-pop/30 border-2 border-yellow-pop rounded-md p-3 font-mono text-[0.75rem]">
                    No items at level {pickerLevel} have phrases yet. Try running <code className="bg-ink text-cream px-1 rounded">phrases:import_tatoeba</code>.
                  </div>
                )}

                {!pickerLoading && pickerSubjects.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[360px] overflow-y-auto p-2 bg-cream/50 border-2 border-ink rounded-lg">
                    {pickerSubjects.map((s) => (
                      <button
                        key={s.subject_id}
                        type="button"
                        onClick={() => toggleSubject(s.subject_id)}
                        className={`text-left p-2 border-2 border-ink rounded ${
                          selectedSubjectIds.includes(s.subject_id)
                            ? 'bg-purple-electric text-cream'
                            : 'bg-white'
                        }`}
                      >
                        <div className="font-body font-black text-base">{s.characters}</div>
                        <div className="font-mono text-[0.6rem] truncate opacity-70">
                          {s.meaning}
                        </div>
                        <div className="font-mono text-[0.55rem] opacity-50">
                          {s.phrase_count} phrase{s.phrase_count === 1 ? '' : 's'}
                          {s.stage_label && <> · {s.stage_label}</>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </Section>
            </>
          )}

          <Divider />

          {/* Stage filter */}
          <Section title="// STAGE FILTER" meta="Which SRS stages to practice">
            <div className="flex gap-2 flex-wrap">
              {(['all', 'apprentice_only', 'guru_plus'] as StageFilter[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStageFilter(s)}
                  className={`px-3.5 py-2 border-2 border-ink rounded-lg font-mono text-[0.72rem] font-bold uppercase shadow-hard-sm hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform ${
                    stageFilter === s ? 'bg-ink text-cream' : 'bg-white'
                  }`}
                >
                  {s.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </Section>

          <Divider />

          {/* Mix mode */}
          <Section title="// NEW vs REVIEWS" meta="Item selection mix">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <MixCard
                label="New only"
                desc="Items you haven't practiced yet"
                selected={mixMode === 'new_only'}
                onClick={() => setMixMode('new_only')}
              />
              <MixCard
                label="Reviews only"
                desc="Items already in your local SRS"
                selected={mixMode === 'review_only'}
                onClick={() => setMixMode('review_only')}
              />
              <MixCard
                label="Mix"
                desc="~70% new, ~30% reviews"
                selected={mixMode === 'mix'}
                onClick={() => setMixMode('mix')}
              />
            </div>
          </Section>

          <Divider />

          {/* Count */}
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
                  className={`px-4 py-2.5 border-[2.5px] border-ink rounded-[10px] font-display text-base shadow-hard-sm hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform ${
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
                max={200}
                className="w-24 px-3 py-2.5 border-[2.5px] border-ink rounded-[10px] font-display text-base bg-white shadow-hard-sm outline-none focus:border-pink-hot"
              />
            </div>
          </Section>
        </div>

        {error && (
          <div className="mt-6 bg-pink-soft border-2 border-pink-hot rounded-[10px] p-4 font-mono text-[0.8rem] shadow-hard-sm">
            ⚠ {error}
          </div>
        )}

        {/* Footer: summary + start */}
        <div
          className="mt-8 px-6 py-5 bg-ink text-cream border-[3px] border-ink rounded-2xl flex justify-between items-center gap-5 flex-wrap"
          style={{ boxShadow: '6px 6px 0 #8b3dff' }}
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

function ScopeCard({ label, desc, selected, onClick }: { label: string; desc: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-4 border-[2.5px] rounded-xl text-left shadow-hard-sm transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 ${
        selected ? 'bg-mint border-ink' : 'bg-white border-ink'
      }`}
    >
      <div className="font-display text-[0.9rem] mb-1">{label}</div>
      <div className="font-mono text-[0.7rem] opacity-65">{desc}</div>
    </button>
  )
}

function MixCard({ label, desc, selected, onClick }: { label: string; desc: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-4 border-[2.5px] rounded-xl text-left shadow-hard-sm transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 ${
        selected ? 'bg-purple-electric text-cream border-ink' : 'bg-white border-ink'
      }`}
    >
      <div className="font-display text-[0.9rem] mb-1">{label}</div>
      <div className="font-mono text-[0.7rem] opacity-65">{desc}</div>
    </button>
  )
}
