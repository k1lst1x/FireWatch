import { useCallback, useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import Hero, { HeroBackdrop, Nav } from './components/Hero'
import Signals, { Marquee } from './components/Signals'
import Pipeline from './components/Pipeline'
import Federation from './components/Federation'
import { Dispatch, Finale } from './components/Dispatch'
import { Mark } from './components/bits'
import { InspirationShowcase } from './components/InspirationShowcase'
import './landing.css'

gsap.registerPlugin(ScrollTrigger)

export default function Landing() {
  const rootRef = useRef<HTMLDivElement>(null)
  const loaderRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const lenisRef = useRef<Lenis | null>(null)

  // ---- preloader: hold until the first video frames land, then reveal
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.documentElement.style.overflow = 'hidden'
    let done = false
    const reveal = () => {
      if (done) return
      done = true
      document.documentElement.style.overflow = ''
      gsap.timeline()
        .to(barRef.current, { scaleX: 1, duration: 0.4, ease: 'power2.inOut' })
        .to(loaderRef.current, { opacity: 0, duration: 0.6, ease: 'power2.inOut' })
        .set(loaderRef.current, { display: 'none' })
        .from('[data-hero-plate]', { scale: 1.08, duration: 1.8, ease: 'expo.out' }, '<0.05')
        .from('[data-hero-line]', { yPercent: 100, opacity: 0, duration: 1.1, stagger: 0.09, ease: 'expo.out' }, '<0.2')
        .from('[data-hero]', { y: 18, opacity: 0, duration: 0.9, stagger: 0.07, ease: 'expo.out' }, '<0.25')
        .from('[data-nav]', { opacity: 0, duration: 0.9, ease: 'power2.out' }, '<')
      ScrollTrigger.refresh()
    }
    gsap.to(barRef.current, { scaleX: 0.72, duration: 2, ease: 'power2.out' })
    const v = videoRef.current
    v?.addEventListener('loadeddata', reveal, { once: true })
    // never block the page on the network
    const fallback = window.setTimeout(reveal, reduced ? 500 : 3200)
    return () => {
      window.clearTimeout(fallback)
      v?.removeEventListener('loadeddata', reveal)
      document.documentElement.style.overflow = ''
    }
  }, [])

  // ---- smooth scroll + reveals
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const lenis = new Lenis({ lerp: reduced ? 1 : 0.09, wheelMultiplier: 0.9 })
    lenisRef.current = lenis
    const nav = document.querySelector<HTMLElement>('[data-nav]')
    let lastY = 0

    lenis.on('scroll', (l: Lenis) => {
      ScrollTrigger.update()
      const p = l.limit > 0 ? l.scroll / l.limit : 0
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${p})`
      if (nav) {
        nav.classList.toggle('is-solid', l.scroll > 40)
        nav.classList.toggle('is-hidden', l.scroll > lastY && l.scroll > window.innerHeight * 0.8)
      }
      lastY = l.scroll
    })
    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-split]').forEach(el => {
        gsap.from(el.querySelectorAll('.fw-word > span'), {
          yPercent: 110, duration: 0.9, ease: 'expo.out', stagger: 0.05,
          scrollTrigger: { trigger: el, start: 'top 88%' },
        })
      })
      gsap.utils.toArray<HTMLElement>('[data-fade]').forEach(el => {
        gsap.from(el, {
          y: 22, opacity: 0, duration: 0.9, ease: 'expo.out', delay: Number(el.dataset.delay ?? 0),
          scrollTrigger: { trigger: el, start: 'top 92%' },
        })
      })
      gsap.utils.toArray<HTMLElement>('[data-count]').forEach(el => {
        const to = Number(el.dataset.count)
        const obj = { v: 0 }
        gsap.to(obj, {
          v: to, duration: 1.4, ease: 'power3.out',
          onUpdate: () => { el.textContent = String(Math.round(obj.v)) },
          scrollTrigger: { trigger: el, start: 'top 92%' },
        })
      })
      // the plate settles back and dims as the page scrolls over it
      gsap.to('[data-hero-plate]', {
        scale: 1.1, yPercent: 4, filter: 'brightness(0.35)', ease: 'none',
        scrollTrigger: { trigger: '#top', start: 'top top', end: 'bottom top', scrub: true },
      })
      gsap.to('#top > *', {
        yPercent: -24, opacity: 0, ease: 'none',
        scrollTrigger: { trigger: '#top', start: 'top top', end: 'bottom 45%', scrub: true },
      })
      // stop decoding video once it is fully covered
      ScrollTrigger.create({
        trigger: '#top',
        start: 'bottom top',
        onEnter: () => videoRef.current?.pause(),
        onLeaveBack: () => { videoRef.current?.play().catch(() => {}) },
      })
    }, rootRef)

    ScrollTrigger.refresh()
    const onResize = () => ScrollTrigger.refresh()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      gsap.ticker.remove(tick)
      ctx.revert()
      lenis.destroy()
      lenisRef.current = null
    }
  }, [])

  const jump = useCallback((hash: string) => {
    const el = hash === '#top' ? 0 : document.querySelector<HTMLElement>(hash)
    if (el === null) return
    if (lenisRef.current) lenisRef.current.scrollTo(el, { duration: 1.6, easing: t => 1 - Math.pow(1 - t, 4) })
    else if (el === 0) window.scrollTo({ top: 0 })
    else el.scrollIntoView()
  }, [])

  return (
    <div className="fw" ref={rootRef}>
      <div className="fw-backdrop">
        <HeroBackdrop videoRef={videoRef} />
      </div>
      <div ref={progressRef} className="fw-progress" />

      <Nav onJump={jump} />
      <main className="relative z-10">
        <Hero />
        <div className="fw-fold">
          <Marquee />
          <InspirationShowcase />
          <Signals />
          <Pipeline />
          <Federation />
          <Dispatch />
          <Finale />
        </div>
      </main>

      <div ref={loaderRef} className="fw-loader">
        <div className="fw-loader__inner">
          <div className="flex items-center gap-2.5">
            <Mark size={26} />
            <span className="text-[15px] font-semibold tracking-[-0.01em]">FireWatch</span>
          </div>
          <div className="fw-loader__bar"><i ref={barRef} style={{ transform: 'scaleX(0)' }} /></div>
          <div className="mt-3 flex justify-between">
            <span className="lbl">Establishing feed</span>
            <span className="lbl">37.8199° N · 122.4783° W</span>
          </div>
        </div>
      </div>
    </div>
  )
}
