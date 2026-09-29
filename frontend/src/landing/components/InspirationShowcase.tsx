import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ChevronRight, CheckCircle2 } from 'lucide-react'

export function InspirationShowcase() {
  const navigate = useNavigate()
  const [sectorTab, setSectorTab] = useState(0)
  const [solutionTier, setSolutionTier] = useState<'urban' | 'wildland'>('urban')

  const SECTORS = [
    {
      title: 'Wildland-Urban Interface (WUI)',
      desc: 'Protect dense neighborhoods bordering high-risk brush ridges with millimeter-accurate building elevation clamping.',
      image: 'https://images.unsplash.com/photo-1542385151-efd9000785a0?auto=format&fit=crop&w=1200&q=80',
      badge: 'High Density Protection',
    },
    {
      title: 'Municipal Fire Departments',
      desc: 'Equip tactical dispatchers with oblique isometric views so first-in engines know which rooftop or hill is combusting.',
      image: 'https://images.unsplash.com/photo-1516214104703-d870798883c5?auto=format&fit=crop&w=1200&q=80',
      badge: 'Rapid Apparatus Dispatch',
    },
    {
      title: 'Disaster Relief & Emergency Management',
      desc: 'Coordinate regional evacuation corridors and mutual aid staging areas using real-time NASA FIRMS satellite thermal passes.',
      image: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=1200&q=80',
      badge: 'Regional Coordination',
    },
    {
      title: 'Power Utilities & Infrastructure',
      desc: 'Monitor high-voltage transmission easements and substations against lightning and brush ignitions before line trips occur.',
      image: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=1200&q=80',
      badge: 'Grid Hardening',
    },
    {
      title: 'Forestry & Conservation Reserves',
      desc: 'Detect remote lightning tree strikes in unpopulated canyons hours before smoke breaks through the canopy.',
      image: 'https://images.unsplash.com/photo-1508873696983-2df5293cb325?auto=format&fit=crop&w=1200&q=80',
      badge: 'Canopy Penetration',
    },
  ]

  const TESTIMONIALS = [
    {
      name: 'Sarah Lin',
      role: 'Chief GIS Officer, Western Region',
      photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      quote: 'The volumetric FRP beams allow our command team to instantly gauge which side of a steep ridge the fire is crowning on.',
    },
    {
      name: 'Marcus Vance',
      role: 'Incident Operations Commander',
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
      quote: 'Rendering Google 3D Tiles obliquely with twilight illumination completely eliminated elevation guesswork for our air attack teams.',
    },
    {
      name: 'Dr. Elena Rostova',
      role: 'Lead Wildland Fire Researcher',
      photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
      quote: 'The 30-second automated sync cycle with NASA FIRMS gives forward strike teams unparalleled spatial precision in the browser.',
    },
    {
      name: 'David Kim',
      role: 'Deputy Chief of Emergency Services',
      photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
      quote: 'Zero client installs. Every battalion chief with a browser gets the full 3D digital twin without specialized CAD hardware.',
    },
  ]

  const INSIGHTS = [
    {
      title: 'Optimizing NASA FIRMS VIIRS 375m Radiometric Thermal Ingestion',
      category: 'Telemetry Whitepaper',
      date: 'Sep 2026',
      image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
    },
    {
      title: 'Streaming Google Photorealistic 3D Tiles in WebGL Under Low Latency',
      category: 'Geospatial Engineering',
      date: 'Aug 2026',
      image: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=600&q=80',
    },
    {
      title: 'Volumetric Beam Rendering with Fire Radiative Power (FRP) Scaling',
      category: 'Visualization Architecture',
      date: 'Jul 2026',
      image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=600&q=80',
    },
    {
      title: 'Cinematic Twilight Lighting Maps for First-Responder Eye Fatigue Reduction',
      category: 'UI/UX Engineering',
      date: 'Jun 2026',
      image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    },
  ]

  return (
    <div className="bg-[#080808] text-white">

      {/* 1. Value Proposition Statement & Arched Photo Trio */}
      <section className="relative px-5 py-24 md:px-8 border-t border-white/10">
        <div className="mx-auto max-w-[1240px] text-center">
          <span className="mono rounded-full border border-[#0066f5]/40 bg-[#0066f5]/10 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
            Platform Capabilities
          </span>
          <h2 className="mt-6 text-center text-[clamp(28px,3.8vw,48px)] font-bold tracking-tight text-white max-w-[940px] mx-auto leading-[1.2]">
            Providing Smart, End-to-End Wildfire Telemetry Backed by Spaceborne Sensors, Google 3D Tiles, and Zero-Latency Decisioning.
          </h2>
          <div className="mt-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 rounded-full bg-[#0066f5] px-6 py-3 text-[14px] font-semibold text-white shadow-[0_4px_20px_rgba(0,102,245,0.4)] transition-all hover:bg-[#0052cc] hover:scale-105"
            >
              Explore Telemetry Matrix <ArrowRight size={16} />
            </button>
          </div>

          {/* Arched Photo Showcase matching inspiration image */}
          <div className="mt-16 flex flex-wrap justify-center items-end gap-5">
            {/* Left Arch */}
            <div className="w-[240px] h-[340px] rounded-t-[120px] rounded-b-[20px] overflow-hidden relative border border-white/15 shadow-2xl group">
              <img
                src="https://images.unsplash.com/photo-1542385151-efd9000785a0?auto=format&fit=crop&w=600&q=80"
                alt="Spaceborne Sensors"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-5">
                <span className="mono text-[11px] font-semibold uppercase tracking-wider text-white bg-black/60 px-3 py-1 rounded-full backdrop-blur">
                  NASA Satellites
                </span>
              </div>
            </div>

            {/* Center Tall Arch with Floating Metric Tag */}
            <div className="w-[310px] h-[400px] rounded-t-[160px] rounded-b-[24px] overflow-hidden relative border border-[#ff5a00]/40 shadow-[0_0_40px_rgba(255,90,0,0.2)] group -translate-y-3">
              <img
                src="https://images.unsplash.com/photo-1516214104703-d870798883c5?auto=format&fit=crop&w=800&q=80"
                alt="Incident Operations Command"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute top-8 left-6 rounded-xl border border-white/20 bg-black/80 px-3.5 py-2 text-left backdrop-blur-md shadow-xl">
                <div className="text-[12px] font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-[#10b981]" /> 99.8% Spatial Match
                </div>
                <div className="text-[10px] text-zinc-400">Google 3D Elevation Clamped</div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-6">
                <span className="mono text-[12px] font-bold uppercase tracking-wider text-[#ff9d42] bg-black/70 px-3.5 py-1.5 rounded-full border border-[#ff5a00]/30 backdrop-blur">
                  Incident Command
                </span>
              </div>
            </div>

            {/* Right Arch */}
            <div className="w-[240px] h-[340px] rounded-t-[120px] rounded-b-[20px] overflow-hidden relative border border-white/15 shadow-2xl group">
              <img
                src="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=600&q=80"
                alt="Thermal Analytics"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-5">
                <span className="mono text-[11px] font-semibold uppercase tracking-wider text-white bg-black/60 px-3 py-1 rounded-full backdrop-blur">
                  FRP Analytics
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Comprehensive Solutions for Every Need */}
      <section className="px-5 py-24 md:px-8 border-t border-white/10 bg-[#0c0c0e]">
        <div className="mx-auto max-w-[1240px]">
          <div className="flex flex-wrap items-end justify-between gap-6 mb-12">
            <div>
              <span className="mono text-[11px] font-semibold uppercase tracking-wider text-[#ff6a00]">
                Tactical Modules
              </span>
              <h2 className="mt-2 text-[clamp(26px,3.2vw,40px)] font-bold text-white tracking-tight">
                Comprehensive Geospatial Solutions for Every Need
              </h2>
            </div>
            <div className="flex rounded-full border border-white/15 bg-white/5 p-1 backdrop-blur">
              <button
                className={`rounded-full px-4 py-1.5 text-[12px] font-semibold transition-all ${
                  solutionTier === 'urban' ? 'bg-[#0066f5] text-white shadow-md' : 'text-zinc-400 hover:text-white'
                }`}
                onClick={() => setSolutionTier('urban')}
              >
                Urban WUI
              </button>
              <button
                className={`rounded-full px-4 py-1.5 text-[12px] font-semibold transition-all ${
                  solutionTier === 'wildland' ? 'bg-[#0066f5] text-white shadow-md' : 'text-zinc-400 hover:text-white'
                }`}
                onClick={() => setSolutionTier('wildland')}
              >
                Wildland Forest
              </button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Card 1 */}
            <div
              className="group relative h-[420px] rounded-2xl overflow-hidden border border-white/10 p-7 flex flex-col justify-end bg-cover bg-center transition-all hover:-translate-y-1 hover:border-[#0066f5]/50 shadow-xl"
              style={{
                backgroundImage:
                  'linear-gradient(180deg, rgba(8,8,8,0.2) 0%, rgba(8,8,8,0.95) 85%), url("https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=800&q=80")',
              }}
            >
              <div className="absolute top-6 left-6">
                <span className="mono text-[10px] font-bold uppercase tracking-wider bg-[#0066f5] text-white px-2.5 py-1 rounded-full">
                  TIER 1 MESH
                </span>
              </div>
              <h3 className="text-[22px] font-bold text-white mb-2">Google Photorealistic 3D Tiles</h3>
              <p className="text-[13.5px] text-zinc-300 mb-4 leading-relaxed">
                Stream dense 3D photogrammetric building meshes directly into WebGL with hardware-accelerated LOD streaming and true textures.
              </p>
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#60a5fa] group-hover:text-white transition-colors"
              >
                Inspect 3D Geometry <ChevronRight size={15} />
              </button>
            </div>

            {/* Card 2 */}
            <div
              className="group relative h-[420px] rounded-2xl overflow-hidden border border-white/10 p-7 flex flex-col justify-end bg-cover bg-center transition-all hover:-translate-y-1 hover:border-[#ff5a00]/50 shadow-xl"
              style={{
                backgroundImage:
                  'linear-gradient(180deg, rgba(8,8,8,0.2) 0%, rgba(8,8,8,0.95) 85%), url("https://images.unsplash.com/photo-1508873696983-2df5293cb325?auto=format&fit=crop&w=800&q=80")',
              }}
            >
              <div className="absolute top-6 left-6">
                <span className="mono text-[10px] font-bold uppercase tracking-wider bg-[#ff5a00] text-white px-2.5 py-1 rounded-full">
                  VOLUMETRIC
                </span>
              </div>
              <h3 className="text-[22px] font-bold text-white mb-2">Volumetric FRP Beams</h3>
              <p className="text-[13.5px] text-zinc-300 mb-4 leading-relaxed">
                Convert Fire Radiative Power (MW) from NASA VIIRS into emissive glowing cylinders clamped tightly to terrain and rooftops.
              </p>
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#ff9d42] group-hover:text-white transition-colors"
              >
                Live Telemetry Beams <ChevronRight size={15} />
              </button>
            </div>

            {/* Card 3 */}
            <div
              className="group relative h-[420px] rounded-2xl overflow-hidden border border-white/10 p-7 flex flex-col justify-end bg-cover bg-center transition-all hover:-translate-y-1 hover:border-[#10b981]/50 shadow-xl"
              style={{
                backgroundImage:
                  'linear-gradient(180deg, rgba(8,8,8,0.2) 0%, rgba(8,8,8,0.95) 85%), url("https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80")',
              }}
            >
              <div className="absolute top-6 left-6">
                <span className="mono text-[10px] font-bold uppercase tracking-wider bg-[#10b981] text-white px-2.5 py-1 rounded-full">
                  AUTONOMOUS
                </span>
              </div>
              <h3 className="text-[22px] font-bold text-white mb-2">30-Second Polling Middleware</h3>
              <p className="text-[13.5px] text-zinc-300 mb-4 leading-relaxed">
                Automated continuous sync pipeline that queries NASA FIRMS coordinate vectors and bounds spatial telemetry for instant response.
              </p>
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#34d399] group-hover:text-white transition-colors"
              >
                System Topology <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. 4-Step Process Section with Pastel Color Cards */}
      <section className="px-5 py-24 md:px-8 border-t border-white/10 bg-[#080808]">
        <div className="mx-auto max-w-[1240px] text-center">
          <span className="mono text-[11px] font-semibold uppercase tracking-wider text-[#a78bfa]">
            System Pipeline
          </span>
          <h2 className="mt-2 text-[clamp(26px,3.2vw,40px)] font-bold text-white tracking-tight">
            Simplified Geospatial Ingestion in 4 Easy Steps
          </h2>
          <p className="mt-3 text-zinc-400 max-w-[600px] mx-auto text-[14.5px]">
            From spaceborne sensor orbit down to hardware-accelerated WebGL pixels on your screen.
          </p>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 text-left">
            {/* Step 1: Pastel Mint Green */}
            <div className="rounded-2xl border border-[#a7f3d0]/30 bg-[#ecfdf5]/[0.07] p-7 flex flex-col justify-between min-h-[280px] backdrop-blur hover:bg-[#ecfdf5]/[0.12] transition-colors">
              <div>
                <span className="mono text-[28px] font-black text-[#6ee7b7] opacity-60">01</span>
                <h4 className="mt-3 text-[18px] font-bold text-white">Satellite Ingestion</h4>
                <p className="mt-2 text-[13px] text-zinc-300 leading-relaxed">
                  NASA FIRMS VIIRS & MODIS sensors capture mid-infrared 3.9µm anomalies with orbit time stamps.
                </p>
              </div>
              <span className="mono inline-block text-[10px] font-semibold text-[#6ee7b7] bg-[#065f46]/40 border border-[#6ee7b7]/30 px-2.5 py-1 rounded-full w-fit mt-4">
                NASA NRT Pass
              </span>
            </div>

            {/* Step 2: Pastel Lavender */}
            <div className="rounded-2xl border border-[#ddd6fe]/30 bg-[#f5f3ff]/[0.07] p-7 flex flex-col justify-between min-h-[280px] backdrop-blur hover:bg-[#f5f3ff]/[0.12] transition-colors">
              <div>
                <span className="mono text-[28px] font-black text-[#c4b5fd] opacity-60">02</span>
                <h4 className="mt-3 text-[18px] font-bold text-white">Spatial Bounding</h4>
                <p className="mt-2 text-[13px] text-zinc-300 leading-relaxed">
                  Backend aggregator clips coordinates to municipal bounding boxes and extracts Fire Radiative Power (MW).
                </p>
              </div>
              <span className="mono inline-block text-[10px] font-semibold text-[#c4b5fd] bg-[#4c1d95]/40 border border-[#c4b5fd]/30 px-2.5 py-1 rounded-full w-fit mt-4">
                JSON Proxy Stream
              </span>
            </div>

            {/* Step 3: Pastel Soft Cyan */}
            <div className="rounded-2xl border border-[#a5f3fc]/30 bg-[#ecfeff]/[0.07] p-7 flex flex-col justify-between min-h-[280px] backdrop-blur hover:bg-[#ecfeff]/[0.12] transition-colors">
              <div>
                <span className="mono text-[28px] font-black text-[#67e8f9] opacity-60">03</span>
                <h4 className="mt-3 text-[18px] font-bold text-white">Photorealistic Align</h4>
                <p className="mt-2 text-[13px] text-zinc-300 leading-relaxed">
                  Google 3D Tiles build city geometry and terrain elevations with photogrammetric precision in CesiumJS.
                </p>
              </div>
              <span className="mono inline-block text-[10px] font-semibold text-[#67e8f9] bg-[#164e63]/40 border border-[#67e8f9]/30 px-2.5 py-1 rounded-full w-fit mt-4">
                Cesium WebGL
              </span>
            </div>

            {/* Step 4: Pastel Warm Yellow */}
            <div className="rounded-2xl border border-[#fef08a]/30 bg-[#fefce8]/[0.07] p-7 flex flex-col justify-between min-h-[280px] backdrop-blur hover:bg-[#fefce8]/[0.12] transition-colors">
              <div>
                <span className="mono text-[28px] font-black text-[#fde047] opacity-60">04</span>
                <h4 className="mt-3 text-[18px] font-bold text-white">Volumetric Beams</h4>
                <p className="mt-2 text-[13px] text-zinc-300 leading-relaxed">
                  Hardware-accelerated rendering projects illuminated cylinders clamped directly to building rooftops.
                </p>
              </div>
              <span className="mono inline-block text-[10px] font-semibold text-[#fde047] bg-[#713f12]/40 border border-[#fde047]/30 px-2.5 py-1 rounded-full w-fit mt-4">
                Cinematic Light Pass
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Why Agencies Choose FireWatch (Metrics & Split Showcase) */}
      <section className="px-5 py-24 md:px-8 border-t border-white/10 bg-[#0c0c0e]">
        <div className="mx-auto max-w-[1240px] grid gap-14 lg:grid-cols-2 items-center">
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1541888946425-d0fbb186c5f6?auto=format&fit=crop&w=1000&q=80"
              alt="Operations Center Team"
              className="rounded-2xl border border-white/15 shadow-2xl object-cover w-full h-[460px]"
            />
            {/* Floating Telemetry Badge matching inspiration layout */}
            <div className="absolute -bottom-6 -right-4 rounded-xl border border-[#ff5a00]/40 bg-black/90 p-5 shadow-2xl backdrop-blur-md">
              <span className="block text-[34px] font-black text-[#ff5a00] leading-none">&lt; 30s</span>
              <span className="text-[12px] font-semibold text-zinc-400 mt-1 block">
                NASA FIRMS Live Synchronization
              </span>
            </div>
          </div>

          <div>
            <span className="mono text-[11px] font-semibold uppercase tracking-wider text-[#0066f5]">
              Proven Performance
            </span>
            <h2 className="mt-2 text-[clamp(26px,3.2vw,40px)] font-bold text-white tracking-tight leading-tight">
              Why Fire Agencies Choose the 3D Geospatial Engine
            </h2>
            <p className="mt-4 text-zinc-300 text-[15px] leading-relaxed">
              When fires cross the wildland-urban interface, flat 2D maps lose critical slope and line-of-sight context. FireWatch renders physical heights, building shadows, and wind vectors in real time.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-8 border-t border-white/10 pt-8">
              <div>
                <span className="mono block text-[36px] font-extrabold text-[#60a5fa] leading-none">99.8%</span>
                <span className="text-[13px] text-zinc-400 mt-1.5 block">Elevation clamping against 3D buildings</span>
              </div>
              <div>
                <span className="mono block text-[36px] font-extrabold text-[#ff9d42] leading-none">2.5x</span>
                <span className="text-[13px] text-zinc-400 mt-1.5 block">Faster evacuation corridor clearance</span>
              </div>
              <div>
                <span className="mono block text-[36px] font-extrabold text-white leading-none">2048px</span>
                <span className="text-[13px] text-zinc-400 mt-1.5 block">Soft shadow maps & twilight directional lighting</span>
              </div>
              <div>
                <span className="mono block text-[36px] font-extrabold text-[#10b981] leading-none">100%</span>
                <span className="text-[13px] text-zinc-400 mt-1.5 block">Zero install, pure in-browser WebGL</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Hear What Our Users Say (Testimonial Grid) */}
      <section className="px-5 py-24 md:px-8 border-t border-white/10 bg-[#080808]">
        <div className="mx-auto max-w-[1240px] text-center">
          <span className="mono text-[11px] font-semibold uppercase tracking-wider text-[#ff6a00]">
            Field Testimonials
          </span>
          <h2 className="mt-2 text-[clamp(26px,3.2vw,40px)] font-bold text-white tracking-tight">
            Hear What Incident Commanders Say
          </h2>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 text-left">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur flex flex-col justify-between">
                <div>
                  <img src={t.photo} alt={t.name} className="w-14 h-14 rounded-full object-cover border border-white/20 mb-4" />
                  <h4 className="text-[16px] font-bold text-white">{t.name}</h4>
                  <span className="text-[12px] text-zinc-400 block mb-4">{t.role}</span>
                  <p className="text-[13.5px] text-zinc-300 italic leading-relaxed">"{t.quote}"</p>
                </div>
                <div className="mt-6 text-[#ff9d42] text-[13px]">★★★★★</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Industry Applications (Vertical Tabs + Image Preview) */}
      <section className="px-5 py-24 md:px-8 border-t border-white/10 bg-[#0c0c0e]">
        <div className="mx-auto max-w-[1240px]">
          <span className="mono text-[11px] font-semibold uppercase tracking-wider text-[#0066f5]">
            Cross-Sector Operations
          </span>
          <h2 className="mt-2 text-[clamp(26px,3.2vw,40px)] font-bold text-white tracking-tight mb-12">
            Delivering Geospatial Solutions Across Critical Sectors
          </h2>

          <div className="grid gap-10 lg:grid-cols-2 items-center">
            <div className="space-y-3">
              {SECTORS.map((s, idx) => (
                <div
                  key={s.title}
                  onClick={() => setSectorTab(idx)}
                  className={`cursor-pointer rounded-xl p-5 border transition-all ${
                    sectorTab === idx
                      ? 'border-[#0066f5] bg-[#0066f5]/10 shadow-[0_0_20px_rgba(0,102,245,0.2)]'
                      : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className={`text-[16px] font-bold ${sectorTab === idx ? 'text-[#60a5fa]' : 'text-white'}`}>
                      {s.title}
                    </h4>
                    <span className="mono text-[10px] text-zinc-400 uppercase">{s.badge}</span>
                  </div>
                  {sectorTab === idx && <p className="mt-2 text-[13.5px] text-zinc-300 leading-relaxed">{s.desc}</p>}
                </div>
              ))}
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-white/15 h-[420px] shadow-2xl">
              <img
                src={SECTORS[sectorTab].image}
                alt={SECTORS[sectorTab].title}
                className="w-full h-full object-cover transition-all duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-6">
                <div>
                  <span className="mono text-[11px] uppercase tracking-wider bg-[#0066f5] text-white px-3 py-1 rounded-full">
                    {SECTORS[sectorTab].badge}
                  </span>
                  <h3 className="text-[20px] font-bold text-white mt-2">{SECTORS[sectorTab].title}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Latest Insights & Technical Updates */}
      <section className="px-5 py-24 md:px-8 border-t border-white/10 bg-[#080808]">
        <div className="mx-auto max-w-[1240px]">
          <div className="flex items-center justify-between mb-12">
            <div>
              <span className="mono text-[11px] font-semibold uppercase tracking-wider text-[#ff6a00]">
                Research & News
              </span>
              <h2 className="mt-2 text-[clamp(26px,3.2vw,40px)] font-bold text-white tracking-tight">
                Our Latest Insights & Industry Updates
              </h2>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="hidden sm:inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#60a5fa] hover:text-white"
            >
              View Research Archive <ChevronRight size={15} />
            </button>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {INSIGHTS.map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.02] hover:border-white/20 transition-all flex flex-col justify-between">
                <img src={item.image} alt={item.title} className="w-full h-44 object-cover" />
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-2 mono">
                      <span>{item.category}</span>
                      <span>{item.date}</span>
                    </div>
                    <h4 className="text-[14.5px] font-bold text-white leading-snug">{item.title}</h4>
                  </div>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="mt-4 text-[12px] font-semibold text-[#ff9d42] inline-flex items-center gap-1"
                  >
                    Read Technical Brief <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Vibrant Blue Curved CTA Banner (Matching Inspiration Image) */}
      <section className="px-5 py-20 md:px-8 border-t border-white/10">
        <div className="mx-auto max-w-[1240px]">
          <div className="relative rounded-[28px] overflow-hidden bg-gradient-to-r from-[#0066f5] via-[#0052cc] to-[#003d99] p-10 md:p-16 shadow-[0_20px_50px_rgba(0,102,245,0.3)] flex flex-wrap items-center justify-between gap-8">
            <div className="max-w-[620px]">
              <h2 className="text-[clamp(28px,3.8vw,46px)] font-extrabold text-white tracking-tight leading-tight">
                Ready to Transform Your Wildfire Operations?
              </h2>
              <p className="mt-4 text-[16px] text-blue-100 leading-relaxed">
                Deploy the 3D Digital Twin Engine with live NASA satellite anomalies, Google Photorealistic 3D Tiles, and sub-minute telemetry today.
              </p>
              <div className="mt-8">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="rounded-full bg-white text-[#0066f5] px-8 py-3.5 text-[15px] font-bold shadow-xl transition-all hover:bg-slate-100 hover:scale-105 inline-flex items-center gap-2"
                >
                  Launch Full 3D Map Dashboard <ArrowRight size={18} />
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/30 bg-white/15 px-8 py-6 backdrop-blur-md text-white text-center">
              <span className="text-[36px] block">🔥</span>
              <span className="mono text-[14px] font-extrabold uppercase tracking-wider block mt-1">3D DIGITAL TWIN</span>
              <span className="text-[11px] text-blue-100 block">CesiumJS + Google 3D Tiles</span>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Comprehensive Multi-Column Footer */}
      <footer className="border-t border-white/10 px-5 py-16 md:px-8 bg-[#050507] text-zinc-400">
        <div className="mx-auto max-w-[1240px] grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 text-white font-bold text-[18px]">
              <span>🔥</span> FireWatch
            </div>
            <p className="mt-3 text-[13.5px] text-zinc-400 max-w-[340px] leading-relaxed">
              Autonomous 3D digital twin system for near-real-time wildfire detection, thermal anomaly modeling, and rapid urban incident command.
            </p>
            <div className="mt-5 flex items-center gap-2 text-[12px] text-[#10b981] mono">
              <span className="h-2 w-2 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981]" /> All Telemetry Nodes Online
            </div>
          </div>

          <div>
            <h5 className="text-[13px] font-bold text-white uppercase tracking-wider mb-4">3D Engine</h5>
            <ul className="space-y-2.5 text-[13px]">
              <li><button onClick={() => navigate('/dashboard')} className="hover:text-white transition-colors">Launch 3D Map</button></li>
              <li><a href="#pipeline" className="hover:text-white transition-colors">CesiumJS WebGL Core</a></li>
              <li><a href="#solutions" className="hover:text-white transition-colors">Google 3D Tiles</a></li>
              <li><a href="#solutions" className="hover:text-white transition-colors">Volumetric Beams</a></li>
            </ul>
          </div>

          <div>
            <h5 className="text-[13px] font-bold text-white uppercase tracking-wider mb-4">Satellite Feeds</h5>
            <ul className="space-y-2.5 text-[13px]">
              <li><span className="hover:text-white transition-colors">NASA FIRMS (NRT)</span></li>
              <li><span className="hover:text-white transition-colors">VIIRS 375m Radiometry</span></li>
              <li><span className="hover:text-white transition-colors">MODIS 1km Hotspots</span></li>
              <li><span className="hover:text-white transition-colors">ALERTWest Optical Cameras</span></li>
            </ul>
          </div>

          <div>
            <h5 className="text-[13px] font-bold text-white uppercase tracking-wider mb-4">Tactical Operations</h5>
            <ul className="space-y-2.5 text-[13px]">
              <li><span className="hover:text-white transition-colors">Wildland-Urban WUI</span></li>
              <li><span className="hover:text-white transition-colors">Incident Commander HUD</span></li>
              <li><span className="hover:text-white transition-colors">Evacuation Modeling</span></li>
              <li><span className="hover:text-white transition-colors">Federated Learning</span></li>
            </ul>
          </div>
        </div>

        <div className="mx-auto max-w-[1240px] border-t border-white/10 mt-12 pt-8 flex flex-wrap items-center justify-between gap-4 text-[12px] mono text-zinc-500">
          <div>© 2026 FireWatch Geospatial Engine. Built with CesiumJS & Google Photorealistic 3D Tiles.</div>
          <div>Benchmark Anchor: San Francisco 37.7749° N · 122.4194° W</div>
        </div>
      </footer>

    </div>
  )
}
