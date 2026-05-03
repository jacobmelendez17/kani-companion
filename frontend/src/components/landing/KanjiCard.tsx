import type { CSSProperties } from 'react'

interface KanjiCardProps {
  variant: 'pink' | 'purple' | 'yellow' | 'mint'
  level: string
  radical: string
  kanji: string
  reading: string
  meaning: string
  className?: string
  style?: CSSProperties
}

const variantStyles = {
  pink: 'bg-pink-hot text-cream',
  purple: 'bg-purple-electric text-cream',
  yellow: 'bg-yellow-pop text-ink',
  mint: 'bg-mint text-ink',
}

export default function KanjiCard({
  variant,
  level,
  radical,
  kanji,
  reading,
  meaning,
  className = '',
  style,
}: KanjiCardProps) {
  return (
    <div
      className={`absolute w-[200px] h-[240px] rounded-[18px] border-[3px] border-ink flex flex-col justify-between p-5 shadow-hard-lg cursor-pointer transition-transform duration-[400ms] hover:!translate-y-[-8px] hover:!rotate-0 hover:scale-[1.05] hover:z-10 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${variantStyles[variant]} ${className}`}
      style={style}
    >
      <div className="flex justify-between items-end font-mono text-[0.7rem] uppercase font-bold">
        <span>Lv.{level}</span>
        <span>{radical}</span>
      </div>
      <div className="font-body font-black text-[6rem] leading-none text-center mt-5">
        {kanji}
      </div>
      <div className="flex justify-between items-end font-mono text-[0.7rem] uppercase font-bold">
        <span className="font-body text-[0.95rem] font-bold">{reading}</span>
        <span>{meaning}</span>
      </div>
    </div>
  )
}
