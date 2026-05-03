import { Link } from 'react-router-dom'

interface LogoProps {
  inverted?: boolean
}

export default function Logo({ inverted = false }: LogoProps) {
  return (
    <Link
      to="/"
      className={`group flex items-center gap-2.5 font-display text-xl tracking-tight no-underline ${
        inverted ? 'text-cream' : 'text-ink'
      }`}
    >
      <div className="grid place-items-center w-[38px] h-[38px] bg-pink-hot border-[2.5px] border-ink rounded-lg font-body font-black text-cream text-2xl shadow-hard-sm -rotate-[4deg] transition-transform duration-300 group-hover:rotate-[8deg] group-hover:scale-110 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
        蟹
      </div>
      <span>KaniCompanion</span>
    </Link>
  )
}
