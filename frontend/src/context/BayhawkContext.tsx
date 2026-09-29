import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, type AnalyzeInput, type Incident, type PipelineResult, type PipelineStatus } from '../lib/api'

interface BayhawkValue {
  status: PipelineStatus | null
  incidents: Incident[]
  lastResult: PipelineResult | null
  lastInput: AnalyzeInput | null
  lastLatencyMs: number | null
  running: boolean
  error: string | null
  backendUp: boolean
  analyze: (input: AnalyzeInput) => Promise<void>
  review: (id: string, decision: 'approve' | 'reject') => Promise<void>
  select: (incident: Incident) => void
  refresh: () => Promise<void>
}

const Ctx = createContext<BayhawkValue | undefined>(undefined)

export function BayhawkProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<PipelineStatus | null>(null)
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [lastResult, setLastResult] = useState<PipelineResult | null>(null)
  const [lastInput, setLastInput] = useState<AnalyzeInput | null>(null)
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [backendUp, setBackendUp] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const [s, i] = await Promise.all([api.status(), api.incidents()])
      setStatus(s)
      setIncidents(i)
      setBackendUp(true)
    } catch {
      setBackendUp(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 10000)
    return () => clearInterval(t)
  }, [refresh])

  const analyze = useCallback(
    async (input: AnalyzeInput) => {
      setRunning(true)
      setError(null)
      setLastInput(input)
      const t0 = performance.now()
      try {
        const r = await api.analyze(input)
        setLastResult(r)
        setLastLatencyMs(performance.now() - t0)
        await refresh()
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setRunning(false)
      }
    },
    [refresh],
  )

  const review = useCallback(
    async (id: string, decision: 'approve' | 'reject') => {
      try {
        await api.review(id, decision)
        await refresh()
      } catch (e) {
        setError((e as Error).message)
      }
    },
    [refresh],
  )

  const select = useCallback((incident: Incident) => {
    setLastResult(incident.result)
    setLastInput({ lat: incident.lat, lon: incident.lon, image_url: incident.result.camera?.image_url ?? undefined })
  }, [])

  return (
    <Ctx.Provider
      value={{ status, incidents, lastResult, lastInput, lastLatencyMs, running, error, backendUp, analyze, review, select, refresh }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useBayhawk() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useBayhawk must be used within BayhawkProvider')
  return v
}
