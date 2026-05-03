const items = ['RADICALS', 'KANJI', 'VOCABULARY', 'SENTENCES', 'READINGS', 'MEANINGS']

export default function Marquee() {
  // Duplicate for seamless loop
  const all = [...items, ...items]

  return (
    <div className="bg-ink text-cream border-y-[3px] border-ink py-4 overflow-hidden whitespace-nowrap -rotate-[1.5deg] my-20 -mx-5">
      <div className="inline-block animate-marquee font-display text-[1.4rem] tracking-[0.02em]">
        {all.map((item, i) => (
          <span key={i} className="inline-block">
            <span className="mx-6 text-cream">{item}</span>
            <span className="mx-6 text-pink-hot">✦</span>
          </span>
        ))}
      </div>
    </div>
  )
}
