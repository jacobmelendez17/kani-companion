export default function CTA() {
  return (
    <section id="signup" className="py-24 px-5 sm:px-8 max-w-[1400px] mx-auto text-center">
      <div
        className="bg-pink-hot border-[3px] border-ink rounded-[32px] py-20 px-6 sm:px-10 shadow-hard-xl relative overflow-hidden"
      >
        <div
          className="absolute -top-1/2 -left-1/2 -right-1/2 -bottom-1/2 pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, transparent 0, transparent 20px, rgba(255,255,255,0.05) 20px, rgba(255,255,255,0.05) 22px)',
          }}
        />

        <span className="absolute top-5 left-10 font-body font-black text-[8rem] text-white/10 pointer-events-none select-none animate-bob">
          蟹
        </span>
        <span
          className="absolute bottom-5 right-10 font-body font-black text-[8rem] text-white/10 pointer-events-none select-none animate-bob"
          style={{ animationDirection: 'reverse' }}
        >
          学
        </span>

        <div className="relative">
          <h2 className="font-display text-[clamp(2rem,4.5vw,3.4rem)] leading-none tracking-[-0.02em] text-cream mb-4">
            Ready to drill?
          </h2>
          <p className="text-cream/95 text-lg mb-8">
            Free while in beta. Bring your own WaniKani token.
          </p>
          <a
            href="/signup"
            className="btn btn-large bg-cream text-ink"
            style={{ boxShadow: '6px 6px 0 #1a0b2e' }}
          >
            Create account →
          </a>
        </div>
      </div>
    </section>
  )
}
