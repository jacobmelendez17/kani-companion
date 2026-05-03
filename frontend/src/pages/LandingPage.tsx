import Nav from '../components/landing/Nav'
import Hero from '../components/landing/Hero'
import Marquee from '../components/landing/Marquee'
import Features from '../components/landing/Features'
import HowItWorks from '../components/landing/HowItWorks'
import CTA from '../components/landing/CTA'
import Footer from '../components/landing/Footer'

export default function LandingPage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <Features />
        <HowItWorks />
        <CTA />
      </main>
      <Footer />
    </>
  )
}
