interface StatCardProps {
  label: string
  value: number | string
  subline?: string
  variant?: 'default' | 'pink' | 'mint'
  bars?: number[] // Heights as percentages 0-100
  barColors?: string[]
}

export default function StatCard({
  label,
  value,
  subline,
  variant = 'default',
  bars,
  barColors,
}: StatCardProps) {
  const numColors: Record<string, string> = {
    default: 'text-purple-electric',
    pink: 'text-pink-hot',
    mint: 'text-mint',
  }

  const numColorClass = numColors[variant]

  // For mint, add ink stroke for legibility on white
  const numStyle = variant === 'mint' ? { WebkitTextStroke: '1px #1a0b2e' } : undefined

  const defaultBarColors = [
    'bg-pink-soft',
    'bg-pink-hot',
    'bg-purple-electric',
    'bg-purple-deep',
    'bg-ink',
  ]

  const colors = barColors || defaultBarColors

  return (
    <div className="lg:col-span-3 bg-white border-[3px] border-ink rounded-[18px] p-5 shadow-hard-md">
      <span className="block font-mono text-[0.65rem] uppercase tracking-[0.12em] font-bold opacity-60">
        {label}
      </span>

      <div
        className={`font-display text-[3rem] leading-[0.95] mt-2 ${numColorClass}`}
        style={numStyle}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>

      {subline && (
        <div className="font-mono text-[0.7rem] opacity-60 mt-1.5">{subline}</div>
      )}

      {bars && bars.length > 0 && (
        <div className="mt-3 flex gap-[3px] items-end h-[30px]">
          {bars.map((height, i) => (
            <div
              key={i}
              className={`flex-1 rounded-sm border-[1.5px] border-ink ${colors[i] || colors[colors.length - 1]}`}
              style={{ height: `${Math.max(8, height)}%` }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
