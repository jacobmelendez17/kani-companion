import { DashboardData } from '../../lib/dashboardTypes'

interface Props {
  data: DashboardData
}

export default function RecentMistakesCard({ data }: Props) {
  const mistakes = data.recent_mistakes
  const count = data.recent_mistakes_count

  return (
    <div className="lg:col-span-12 bg-purple-electric text-cream border-[3px] border-ink rounded-[18px] p-6 shadow-hard-md">
      <div className="flex justify-between items-end flex-wrap gap-2">
        <div>
          <span className="block font-mono text-[0.65rem] uppercase tracking-[0.12em] font-bold text-yellow-pop">
            // RECENT MISTAKES (24H)
          </span>
          <h3 className="font-display text-xl leading-[1.05] mt-2">
            {count === 0
              ? 'No recent mistakes — nice'
              : `${count} item${count === 1 ? '' : 's'} missed`}
          </h3>
        </div>
        {count > 0 && (
          <span className="font-mono text-[0.7rem] opacity-70">
            // Click to drill (coming soon)
          </span>
        )}
      </div>

      {mistakes.length > 0 && (
        <div className="flex gap-2.5 overflow-x-auto mt-4 pb-1">
          {mistakes.map((m, i) => (
            <div
              key={`${m.subject_id}-${i}`}
              className="flex-shrink-0 bg-cream text-ink border-[2.5px] border-ink rounded-xl px-3.5 py-2.5 shadow-hard-sm text-center min-w-[90px]"
            >
              <div className="font-body font-black text-[2rem] leading-none">
                {m.characters}
              </div>
              <div className="font-mono text-[0.6rem] opacity-60 mt-1 uppercase truncate max-w-[80px]">
                {m.meaning}
              </div>
              <div className="font-mono text-[0.55rem] mt-0.5 text-pink-hot font-bold">
                {m.hours_ago === 0 ? 'NOW' : `${m.hours_ago}H AGO`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
