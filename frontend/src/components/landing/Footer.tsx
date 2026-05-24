import { Link } from 'react-router-dom'
import Logo from './Logo'

type FooterLink = { label: string; href: string; external?: boolean }

const columns: { title: string; links: FooterLink[] }[] = [
  {
    title: 'PRODUCT',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'How it works', href: '/#how' },
      { label: 'Pricing', href: '#' },
      { label: 'Changelog', href: '/changelog' },
    ],
  },
  {
    title: 'RESOURCES',
    links: [
      { label: 'Docs', href: '#' },
      { label: 'Support', href: '#' },
      { label: 'FAQ', href: '/#faq' },
    ],
  },
  {
    title: 'LEGAL',
    links: [
      { label: 'Privacy', href: '#' },
      { label: 'Terms', href: '#' },
      { label: 'Security', href: '#' },
      { label: 'Contact', href: '#' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="bg-ink text-cream pt-15 pb-8 px-5 sm:px-8 border-t-[3px] border-ink">
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-10 mb-10">
        <div>
          <Logo inverted />
          <p className="text-[0.95rem] leading-relaxed opacity-70 max-w-[360px] mt-4">
            An unofficial companion to WaniKani. Not affiliated with, endorsed by, or
            sponsored by Tofugu LLC.
          </p>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <h5 className="font-display text-[0.85rem] mb-4 text-pink-soft tracking-[0.02em]">
              {col.title}
            </h5>
            <ul className="list-none flex flex-col gap-2.5">
              {col.links.map((link) => (
                <li key={link.label}>
                  {link.href.startsWith('/') && !link.href.startsWith('/#') ? (
                    <Link
                      to={link.href}
                      className="text-cream no-underline text-[0.9rem] opacity-70 transition-all hover:opacity-100 hover:text-pink-hot"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      className="text-cream no-underline text-[0.9rem] opacity-70 transition-all hover:opacity-100 hover:text-pink-hot"
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="max-w-[1400px] mx-auto border-t border-white/10 pt-6 flex justify-between flex-wrap gap-4 font-mono text-[0.78rem] opacity-60">
        <span>© 2026 KaniCompanion // built with 愛</span>
        <span>v0.1.0-beta</span>
      </div>
    </footer>
  )
}
