import { useCallback, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import Hero, { HeroBackdrop, Nav } from './components/Hero'
import Signals, { Marquee } from './components/Signals'
import Pipeline from './components/Pipeline'
import Federation from './components/Federation'
import { Dispatch, Finale } from './components/Dispatch'
import { FlameMark } from './components/bits'
import './landing.css'

gsap.registerPlugin(ScrollTrigger)

export default function Landing() {
  const rootRef = useRef<HTMLDivElement>(null)
  const loaderRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const lenisRef = useRef<Lenis | null>(null)
  const [focused, setFocused] = useState<string | null>(null)

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
        .to(barRef.current, { scaleX: 1, duration: 0.5, ease: 'power2.inOut' })
        .to(loaderRef.current, { opacity: 0, duration: 0.8, ease: 'power2.inOut' })
        .set(loaderRef.current, { display: 'none' })
        .from('[data-hero-plate]', { scale: 1.12, filter: 'blur(14px)', duration: 2.2, ease: 'expo.out' }, '<0.1')
        .from('[data-hero-line]', { yPercent: 70, opacity: 0, filter: 'blur(14px)', duration: 1.5, stagger: 0.14, ease: 'expo.out' }, '<0.25')
        .from('[data-hero]', { y: 26, opacity: 0, duration: 1.1, stagger: 0.09, ease: 'expo.out' }, '<0.35')
        .from('[data-nav]', { opacity: 0, duration: 1.2, ease: 'power2.out' }, '<')
      ScrollTrigger.refresh()
    }
    gsap.to(barRef.current, { scaleX: 0.75, duration: 2.4, ease: 'power2.out' })
    const v = videoRef.current
    v?.addEventListener('loadeddata', reveal, { once: true })
    // never block the page on the network
    const fallback = window.setTimeout(reveal, reduced ? 600 : 3800)
    return () => {
      window.clearTimeout(fallback)
      v?.removeEventListener('loadeddata', reveal)
      document.documentElement.style.overflow = ''
    }
  }, [])

  // ---- smooth scroll + reveals
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const lenis = new Lenis({ lerp: reduced ? 1 : 0.085, wheelMultiplier: 0.9 })
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
          yPercent: 115, rotate: 4, duration: 1.1, ease: 'expo.out', stagger: 0.06,
          scrollTrigger: { trigger: el, start: 'top 88%' },
        })
      })
      gsap.utils.toArray<HTMLElement>('[data-fade]').forEach(el => {
        gsap.from(el, {
          y: 50, opacity: 0, duration: 1.2, ease: 'expo.out', delay: Number(el.dataset.delay ?? 0),
          scrollTrigger: { trigger: el, start: 'top 90%' },
        })
      })
      gsap.utils.toArray<HTMLElement>('[data-count]').forEach(el => {
        const to = Number(el.dataset.count)
        const obj = { v: 0 }
        gsap.to(obj, {
          v: to, duration: 1.6, ease: 'power3.out',
          onUpdate: () => { el.textContent = String(Math.round(obj.v)) },
          scrollTrigger: { trigger: el, start: 'top 90%' },
        })
      })
      // the plate pushes back and dims as the page scrolls over it
      gsap.to('[data-hero-plate]', {
        scale: 1.16, yPercent: 6, filter: 'brightness(0.32) saturate(0.7)', ease: 'none',
        scrollTrigger: { trigger: '#top', start: 'top top', end: 'bottom top', scrub: true },
      })
      gsap.to('#top > *', {
        yPercent: -34, opacity: 0, ease: 'none',
        scrollTrigger: { trigger: '#top', start: 'top top', end: 'bottom 40%', scrub: true },
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

  // ---- pointer: cursor glow, spotlight cards, magnetic buttons, tilt
  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches
    let magnet: HTMLElement | null = null
    let tilt: HTMLElement | null = null
    const onMove = (e: PointerEvent) => {
      if (cursorRef.current) cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`
      const target = e.target as HTMLElement
      const spot = target.closest<HTMLElement>('.fw-spot')
      if (spot) {
        const r = spot.getBoundingClientRect()
        spot.style.setProperty('--mx', `${e.clientX - r.left}px`)
        spot.style.setProperty('--my', `${e.clientY - r.top}px`)
      }
      if (!fine) return
      const m = target.closest<HTMLElement>('[data-magnetic]')
      if (magnet && magnet !== m) gsap.to(magnet, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' })
      magnet = m
      if (m) {
        const r = m.getBoundingClientRect()
        gsap.to(m, { x: (e.clientX - r.left - r.width / 2) * 0.25, y: (e.clientY - r.top - r.height / 2) * 0.35, duration: 0.4, ease: 'power3.out' })
      }
      const t = target.closest<HTMLElement>('[data-tilt]')
      if (tilt && tilt !== t) gsap.to(tilt, { rotateX: 0, rotateY: 0, duration: 0.8, ease: 'power3.out' })
      tilt = t
      if (t) {
        const r = t.getBoundingClientRect()
        const px = (e.clientX - r.left) / r.width - 0.5
        const py = (e.clientY - r.top) / r.height - 0.5
        gsap.to(t, { rotateY: px * 5, rotateX: -py * 5, transformPerspective: 1100, duration: 0.5, ease: 'power3.out' })
      }
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  const jump = useCallback((hash: string) => {
    const el = hash === '#top' ? 0 : document.querySelector<HTMLElement>(hash)
    if (el === null) return
    if (lenisRef.current) lenisRef.current.scrollTo(el, { duration: 2.2, easing: t => 1 - Math.pow(1 - t, 4) })
    else if (el === 0) window.scrollTo({ top: 0 })
    else el.scrollIntoView()
  }, [])

  return (
    <div className="fw" ref={rootRef}>
      <div className="fw-backdrop">
        <HeroBackdrop videoRef={videoRef} active={focused} />
      </div>
      <div ref={cursorRef} className="fw-cursor hidden md:block" />
      <div ref={progressRef} className="fw-progress" />

      <Nav onJump={jump} />
      <main className="relative z-10">
        <Hero focused={focused} onFocus={setFocused} />
        <div className="fw-fold">
          <Marquee />
          <Signals />
          <Pipeline />
          <Federation />
          <Dispatch />
          <Finale />
        </div>
      </main>

      <div ref={loaderRef} className="fw-loader">
        <div className="fw-loader__inner">
          <div className="flex items-center gap-3">
            <span className="fw-loader__flame"><FlameMark size={30} /></span>
            <span className="text-[20px] font-semibold tracking-[-0.03em]">FireWatch</span>
          </div>
          <div className="fw-loader__bar"><i ref={barRef} style={{ transform: 'scaleX(0)' }} /></div>
          <div className="mono mt-4 flex justify-between text-[10px] uppercase tracking-[0.2em] text-[var(--ash-3)]">
            <span>Establishing camera feed</span>
            <span>37.7749° N, 122.4194° W</span>
          </div>
        </div>
      </div>
    </div>
  )
}
