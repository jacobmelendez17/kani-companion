import { DashboardData } from '../../lib/dashboardTypes'

interface Props {
  data: DashboardData
}

export default function LevelHeroCard({ data }: Props) {
  const level = data.wanikani_level
  const realm = data.realm
  const progress = data.level_progress_percent
  const remaining = data.items_remaining_to_next

  if (!level) {
    return (
      <div className="lg:col-span-5 lg:row-span-2 bg-pink-soft border-[3px] border-ink rounded-[18px] p-6 shadow-hard-md relative overflow-hidden">
        <span className="block font-mono text-[0.65rem] uppercase tracking-[0.12em] font-bold opacity-60 mb-2">
          // WANIKANI LEVEL
        </span>
        <div className="font-display text-4xl mt-4 leading-[0.95]">
          Not connected
        </div>
        <p className="mt-4 text-sm opacity-75 max-w-[280px]">
          Connect your WaniKani API token to see your level, progress, and items.
        </p>
        <a
          href="/connect-wanikani"
          className="inline-block mt-5 px-4 py-2 bg-ink text-cream border-[2.5px] border-ink rounded-lg font-display text-xs no-underline shadow-hard-sm hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform"
        >
          Connect now →
        </a>
      </div>
    )
  }

  return (
    <div className="lg:col-span-5 lg:row-span-2 bg-pink-hot text-cream border-[3px] border-ink rounded-[18px] p-6 shadow-hard-md relative overflow-hidden">
      {/* Decorative kanji watermark */}
      <span
        className="absolute -bottom-5 -right-2 font-body font-black text-[12rem] leading-none pointer-events-none select-none"
        style={{ color: 'rgba(255,255,255,0.1)' }}
      >
        学
      </span>

      <span className="block font-mono text-[0.65rem] uppercase tracking-[0.12em] font-bold opacity-85 mb-2 relative">
        // WANIKANI LEVEL
      </span>

      <div className="font-display text-[7rem] sm:text-[8rem] leading-[0.85] tracking-[-0.04em] mt-3 relative">
        {level}
      </div>

      <div className="mt-4 flex gap-6 font-mono text-xs relative">
        {realm && (
          <div>
            <div className="opacity-75 text-[0.7rem] mb-0.5">Realm</div>
            <div className="font-display text-base">
              {realm.kanji} {realm.name}
            </div>
          </div>
        )}
        <div>
          <div className="opacity-75 text-[0.7rem] mb-0.5">Items unlocked</div>
          <div className="font-display text-base">{data.items_unlocked.toLocaleString()}</div>
        </div>
      </div>

      <div className="mt-6 relative">
        <div
          className="h-4 bg-black/20 border-2 border-ink rounded-full overflow-hidden relative"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-yellow-pop border-r-2 border-ink transition-all duration-500"
            style={{ width: `${Math.max(2, progress)}%` }}
          />
        </div>
        <div className="mt-1.5 font-mono text-[0.7rem] opacity-90">
          {progress}% to Level {level + 1}
          {remaining > 0 && ` · ${remaining} kanji remaining`}
        </div>
      </div>
    </div>
  )
}
