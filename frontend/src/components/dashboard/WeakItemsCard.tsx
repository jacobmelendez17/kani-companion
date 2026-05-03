import { DashboardData } from '../../lib/dashboardTypes'

interface Props {
  data: DashboardData
}

export default function WeakItemsCard({ data }: Props) {
  const items = data.weak_items

  return (
    <div className="lg:col-span-6 bg-white border-[3px] border-ink rounded-[18px] p-6 shadow-hard-md">
      <span className="block font-mono text-[0.65rem] uppercase tracking-[0.12em] font-bold opacity-60">
        ⚠ WEAKEST ITEMS
      </span>
      <h3 className="font-display text-xl leading-[1.05] mt-2 mb-4">
        Give these some love
      </h3>

      {items.length === 0 ? (
        <div className="bg-mint/30 border-2 border-mint rounded-md p-3 font-mono text-[0.78rem]">
          ✓ No weak items yet — practice more to build up data here.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div
              key={item.subject_id}
              className="flex items-center gap-3 px-3 py-2.5 bg-pink-soft/60 border-2 border-ink rounded-[10px]"
            >
              <span className="font-body font-black text-[1.6rem] leading-none w-10 text-center">
                {item.characters}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-body font-bold text-[0.9rem] truncate">
                  {item.meaning}
                </div>
                <div className="font-mono text-[0.6rem] opacity-65 uppercase">
                  {item.stage_label} · {item.correct}/{item.total} correct
                </div>
              </div>
              <span className="font-display text-base text-pink-hot">
                {item.accuracy}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
