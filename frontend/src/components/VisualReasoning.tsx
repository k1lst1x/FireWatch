import { useEffect, useRef, useState } from 'react'
import { Sparkles, Play, Upload, Loader2 } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useBayhawk } from '../context/BayhawkContext'
import { api, CRIT_COLOR } from '../lib/api'

const PRESETS = [
  { label: 'Lake Tahoe, CA', lat: 38.9, lon: -120.0 },
  { label: 'Angeles NF, CA', lat: 34.32, lon: -117.73 },
  { label: 'Big Sur, CA', lat: 36.27, lon: -121.81 },
]

function Badge({ text, dark }: { text?: string; dark: boolean }) {
  if (!text) return null
  const llm = text === 'llm'
  return (
    <span
      className={`ml-2 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
        llm ? 'bg-emerald-500/15 text-emerald-400' : dark ? 'bg-[#1f1f1f] text-gray-500' : 'bg-gray-100 text-gray-500'
      }`}
    >
      {llm ? 'LLM' : 'rules'}
    </span>
  )
}

export default function VisualReasoning() {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const { analyze, running, lastResult, error } = useBayhawk()
  const [images, setImages] = useState<string[]>([])
  const [lat, setLat] = useState('38.9')
  const [lon, setLon] = useState('-120.0')
  const [image, setImage] = useState('')
  const [customUrl, setCustomUrl] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api
      .demoImages()
      .then(list => {
        setImages(list)
        if (list.length) setImage(list[0])
      })
      .catch(() => setImages([]))
  }, [])

  const onFile = (f?: File) => {
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      setCustomUrl(String(reader.result))
      setImage('__custom')
    }
    reader.readAsDataURL(f)
  }

  const run = () => {
    const img = image === '__custom' ? customUrl.trim() : image
    analyze({ lat: parseFloat(lat), lon: parseFloat(lon), image_url: img || undefined })
  }

  const field = `text-[11px] rounded-md px-2 py-1.5 outline-none ${
    dark ? 'bg-[#1a1a1a] text-gray-200 border border-[#2a2a2a]' : 'bg-gray-50 text-gray-800 border border-gray-200'
  }`
  const muted = dark ? 'text-gray-500' : 'text-gray-400'
  const body = dark ? 'text-gray-300' : 'text-gray-700'
  const r = lastResult

  return (
    <div className={`rounded-xl border overflow-hidden flex flex-col ${dark ? 'bg-[#111] border-[#1e1e1e]' : 'bg-white border-gray-200'}`}>
      <div className={`flex items-center justify-between px-4 py-2.5 border-b ${dark ? 'border-[#1e1e1e]' : 'border-gray-100'}`}>
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-brand" />
          <span className={`text-xs font-semibold uppercase tracking-wider ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
            Agent Pipeline
          </span>
        </div>
        <button
          onClick={run}
          disabled={running}
          className="flex items-center gap-1.5 rounded-md bg-brand/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-brand hover:bg-brand/25 transition-colors cursor-pointer disabled:opacity-50"
        >
          {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
          {running ? 'Running agents…' : 'Run Analysis'}
        </button>
      </div>

      <div className="p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            className={field}
            onChange={e => {
              const p = PRESETS[Number(e.target.value)]
              if (p) {
                setLat(String(p.lat))
                setLon(String(p.lon))
              }
            }}
            defaultValue=""
          >
            <option value="" disabled>
              Location preset
            </option>
            {PRESETS.map((p, i) => (
              <option key={p.label} value={i}>
                {p.label}
              </option>
            ))}
          </select>
          <input className={`${field} w-20`} value={lat} onChange={e => setLat(e.target.value)} placeholder="lat" />
          <input className={`${field} w-20`} value={lon} onChange={e => setLon(e.target.value)} placeholder="lon" />
          <select className={field} value={image} onChange={e => setImage(e.target.value)}>
            <option value="">Nearest live camera (AlertWest)</option>
            {images.map(i => (
              <option key={i} value={i}>
                {i.replace('demo_images/', '')}
              </option>
            ))}
            <option value="__custom">Custom URL / upload</option>
          </select>
          {image === '__custom' && (
            <>
              <input
                className={`${field} flex-1 min-w-[160px]`}
                value={customUrl.startsWith('data:') ? 'uploaded image' : customUrl}
                onChange={e => setCustomUrl(e.target.value)}
                placeholder="https://…jpg"
              />
              <button onClick={() => fileRef.current?.click()} className={`${field} flex items-center gap-1 cursor-pointer`}>
                <Upload className="h-3 w-3" /> Upload
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => onFile(e.target.files?.[0])} />
            </>
          )}
        </div>

        {error && <p className="text-[11px] font-mono text-red-400">{error}</p>}

        {!r && !error && <p className={`text-xs font-mono ${muted}`}>Pick a location and image, then run the agents.</p>}

        {r && (
          <div className={`text-xs font-mono leading-relaxed flex flex-col gap-2 ${body}`}>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span>camera {(r.camera?.confidence ?? 0).toFixed(2)}{r.camera?.telemetry?.detector ? ` (${String(r.camera.telemetry.detector)})` : ''}</span>
              <span>thermal {(r.satellite?.thermal_confidence ?? 0).toFixed(2)}</span>
              <span>spread {(r.weather?.spread_risk ?? 0).toFixed(2)}</span>
              <span>
                fusion{' '}
                <b className={r.fusion?.status === 'CONFIRMED' ? 'text-orange-400' : 'text-emerald-400'}>{r.fusion?.status}</b>{' '}
                {(r.fusion?.combined_score ?? 0).toFixed(2)}
              </span>
              {r.classification && (
                <span>
                  <b style={{ color: CRIT_COLOR[r.classification.criticality] }}>{r.classification.criticality}</b>
                  <Badge text={r.classification.source} dark={dark} />
                </span>
              )}
            </div>
            {r.fusion?.status === 'DISMISSED' && <p className={muted}>{r.fusion.reason}</p>}
            {r.reasoning && (
              <p>
                {r.reasoning.scene_description}
                <Badge text={r.reasoning.source} dark={dark} />
              </p>
            )}
            {r.suggestion && (
              <div>
                <p className="font-semibold">{r.suggestion.alert_message}</p>
                <ul className="list-disc ml-4 mt-1">
                  {r.suggestion.action_plan.map(a => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
            {r.output?.review_status === 'pending_review' && (
              <p className="text-amber-400">Held for dispatcher approval — approve or reject in Recent Alerts.</p>
            )}
            {r.error && <p className="text-red-400">{r.error}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
