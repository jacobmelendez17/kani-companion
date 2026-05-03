import Logo from './Logo'

export default function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-8 py-4 flex justify-between items-center bg-cream border-b-[3px] border-ink">
      <Logo />
      <ul className="flex gap-7 items-center list-none">
        <li className="hidden md:block">
          <a href="#features" className="text-ink font-medium text-[0.95rem] relative transition-colors hover:text-pink-hot after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-pink-hot after:transition-all hover:after:w-full">
            Features
          </a>
        </li>
        <li className="hidden md:block">
          <a href="#how" className="text-ink font-medium text-[0.95rem] relative transition-colors hover:text-pink-hot after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-pink-hot after:transition-all hover:after:w-full">
            How it works
          </a>
        </li>
        <li className="hidden md:block">
          <a href="/login" className="text-ink font-medium text-[0.95rem] relative transition-colors hover:text-pink-hot after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-pink-hot after:transition-all hover:after:w-full">
            Log in
          </a>
        </li>
        <li>
          <a href="/signup" className="btn">Get Started</a>
        </li>
      </ul>
    </nav>
  )
}
