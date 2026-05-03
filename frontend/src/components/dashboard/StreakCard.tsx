import { DashboardData } from '../../lib/dashboardTypes'

interface Props {
  data: DashboardData
}

export default function StreakCard({ data }: Props) {
  const streak = data.daily_streak
  const best = data.best_streak

  return (
    <div className="lg:col-span-4 bg-yellow-pop border-[3px] border-ink rounded-[18px] p-5 shadow-hard-md">
      <div className="flex justify-between items-start">
        <span className="block font-mono text-[0.65rem] uppercase tracking-[0.12em] font-bold opacity-60">
          // DAILY STREAK
        </span>
        {best > 0 && (
          <span className="font-mono text-[0.6rem] opacity-50 uppercase">
            Best: {best}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2 mt-2">
        <span className="font-display text-[3.6rem] leading-[0.9]">{streak}</span>
        <span className="font-body font-black text-2xl">日</span>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {data.streak_calendar.map((day) => (
          <div
            key={day.date}
            className={`aspect-square border-2 border-ink rounded-md flex items-center justify-center font-mono text-[0.6rem] font-bold ${
              day.is_today
                ? 'bg-pink-hot text-cream scale-105 shadow-hard-sm'
                : day.completed
                ? 'bg-ink text-mint'
                : 'bg-white/40 text-ink/40'
            }`}
            title={day.date}
          >
            {day.is_today ? '今' : day.day_label}
          </div>
        ))}
      </div>
    </div>
  )
}
