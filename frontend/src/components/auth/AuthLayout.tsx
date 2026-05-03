import { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface AuthLayoutProps {
  eyebrow: string
  title: ReactNode
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}

export default function AuthLayout({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-cream">
      {/* LEFT: Form */}
      <div className="flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-12 lg:py-0 relative">
        {/* Subtle grid bg */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(#1a0b2e 1px, transparent 1px), linear-gradient(90deg, #1a0b2e 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative z-10 max-w-[420px] mx-auto w-full">
          {/* Logo */}
          <Link
            to="/"
            className="group flex items-center gap-2.5 font-display text-base no-underline text-ink mb-12"
          >
            <div className="grid place-items-center w-9 h-9 bg-pink-hot border-[2.5px] border-ink rounded-lg font-body font-black text-cream text-xl shadow-hard-sm -rotate-[4deg] transition-transform duration-300 group-hover:rotate-[8deg] group-hover:scale-110 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
              蟹
            </div>
            <span>KaniCompanion</span>
          </Link>

          {/* Header */}
          <div className="mb-8">
            <span className="inline-block font-mono text-[0.7rem] uppercase tracking-[0.15em] text-pink-hot font-bold mb-3">
              {eyebrow}
            </span>
            <h1 className="font-display text-[clamp(2rem,4vw,2.6rem)] leading-[0.95] tracking-[-0.03em] text-ink">
              {title}
            </h1>
            <p className="text-base opacity-75 mt-3 max-w-[380px]">{subtitle}</p>
          </div>

          {children}

          {footer && (
            <p className="text-center font-mono text-[0.78rem] mt-6 opacity-70">
              {footer}
            </p>
          )}
        </div>
      </div>

      {/* RIGHT: Kanji card grid (hidden on mobile) */}
      <KanjiGridPanel />
    </div>
  )
}

function KanjiGridPanel() {
  return (
    <div className="hidden lg:flex bg-purple-electric relative overflow-hidden items-center justify-center">
      {/* Color radials */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(255, 61, 138, 0.4) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(125, 249, 192, 0.25) 0%, transparent 40%)
          `,
        }}
      />
      {/* Subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Card cluster */}
      <div className="relative w-[380px] h-[380px]">
        {/* Floating SRS badges */}
        <div
          className="absolute -top-2 right-12 bg-ink text-mint px-3 py-1.5 rounded-full font-mono text-[0.7rem] font-bold border-2 border-ink z-10 animate-bob"
          style={{ boxShadow: '3px 3px 0 #ff3d8a' }}
        >
          ⚡ APPRENTICE I
        </div>
        <div
          className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-ink text-mint px-3 py-1.5 rounded-full font-mono text-[0.7rem] font-bold border-2 border-ink z-10 animate-bob"
          style={{ boxShadow: '3px 3px 0 #ff3d8a', animationDelay: '1s' }}
        >
          ★ ENLIGHTENED
        </div>

        <PanelCard
          variant="pink"
          level="01"
          radical="大"
          kanji="人"
          reading="ひと"
          meaning="person"
          className="top-5 left-7 animate-float-1"
          style={{ transform: 'rotate(-6deg)' }}
        />
        <PanelCard
          variant="yellow"
          level="04"
          radical="火"
          kanji="日"
          reading="にち"
          meaning="day"
          className="top-0 right-0 animate-float-2"
          style={{ transform: 'rotate(7deg)' }}
        />
        <PanelCard
          variant="mint"
          level="02"
          radical="木"
          kanji="山"
          reading="やま"
          meaning="mountain"
          className="bottom-7 left-0 animate-float-3"
          style={{ transform: 'rotate(-4deg)' }}
        />
        <PanelCard
          variant="cream"
          level="03"
          radical="水"
          kanji="川"
          reading="かわ"
          meaning="river"
          className="bottom-0 right-10 animate-float-1"
          style={{ transform: 'rotate(5deg)', animationDirection: 'reverse' }}
        />
      </div>
    </div>
  )
}

interface PanelCardProps {
  variant: 'pink' | 'yellow' | 'mint' | 'cream'
  level: string
  radical: string
  kanji: string
  reading: string
  meaning: string
  className?: string
  style?: React.CSSProperties
}

function PanelCard({
  variant,
  level,
  radical,
  kanji,
  reading,
  meaning,
  className = '',
  style,
}: PanelCardProps) {
  const variants = {
    pink: 'bg-pink-hot text-cream',
    yellow: 'bg-yellow-pop text-ink',
    mint: 'bg-mint text-ink',
    cream: 'bg-cream text-ink',
  }

  return (
    <div
      className={`absolute w-[130px] h-[150px] rounded-[18px] border-[3px] border-ink flex flex-col justify-between p-3 shadow-hard-md transition-transform duration-[400ms] hover:!translate-y-[-6px] hover:scale-[1.05] hover:z-20 ease-[cubic-bezier(0.34,1.56,0.64,1)] cursor-pointer ${variants[variant]} ${className}`}
      style={style}
    >
      <div className="flex justify-between font-mono text-[0.6rem] uppercase font-bold">
        <span>Lv.{level}</span>
        <span>{radical}</span>
      </div>
      <div className="font-body font-black text-[3.6rem] leading-none text-center">
        {kanji}
      </div>
      <div className="flex justify-between items-end font-mono text-[0.6rem] uppercase font-bold">
        <span className="font-body text-[0.75rem]">{reading}</span>
        <span>{meaning}</span>
      </div>
    </div>
  )
}
