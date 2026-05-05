import { Link } from 'react-router-dom'
import { DashboardData } from '../../lib/dashboardTypes'

interface Props {
  data: DashboardData
}

export default function RecommendedCard({ data }: Props) {
  const rec = data.recommended_session

  // Route to sentence or item setup based on mode
  const href =
    rec.mode === 'sentence'
      ? '/practice/sentence/setup'
      : `/practice/setup?preset=${rec.mode}`

  return (
    <div className="lg:col-span-6 bg-ink text-cream border-[3px] border-ink rounded-[18px] p-6 shadow-hard-md">
      <span className="block font-mono text-[0.65rem] uppercase tracking-[0.12em] font-bold text-mint mb-2">
        ⚡ RECOMMENDED NEXT
      </span>
      <h3 className="font-display text-2xl leading-[1.05] tracking-[-0.02em] mt-2">
        {rec.label}
      </h3>
      <p className="mt-2 opacity-80 text-[0.9rem] leading-relaxed">{rec.reason}</p>
      <Link
        to={href}
        className="inline-block mt-4 px-5 py-2.5 bg-mint text-ink border-[2.5px] border-ink rounded-[10px] font-display text-[0.85rem] no-underline transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5"
        style={{ boxShadow: '4px 4px 0 #ff3d8a' }}
      >
        {rec.cta}
      </Link>
    </div>
  )
}
