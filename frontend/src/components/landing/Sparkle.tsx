interface SparkleProps {
  color: string
  size: number
  className?: string
  delay?: number
}

export default function Sparkle({ color, size, className = '', delay = 0 }: SparkleProps) {
  return (
    <svg
      className={`absolute pointer-events-none animate-sparkle ${className}`}
      style={{ animationDelay: `${delay}s` }}
      width={size}
      height={size}
      viewBox="0 0 36 36"
    >
      <path
        d="M18 2 L20 16 L34 18 L20 20 L18 34 L16 20 L2 18 L16 16 Z"
        fill={color}
        stroke="#1a0b2e"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}
