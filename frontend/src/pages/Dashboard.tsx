import { useTheme } from '../context/ThemeContext'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import LiveIngestion from '../components/LiveIngestion'
import VisualReasoning from '../components/VisualReasoning'
import SpatialMonitoring from '../components/SpatialMonitoring'
import StatsPanel from '../components/StatsPanel'
import StatusBar from '../components/StatusBar'
import { BayhawkProvider } from '../context/BayhawkContext'

export default function Dashboard() {
  const { theme } = useTheme()
  const dark = theme === 'dark'

  return (
    <BayhawkProvider>
    <div className={`flex flex-col h-screen overflow-hidden ${dark ? 'bg-[#080808]' : 'bg-gray-100'}`}>
      <Header />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {/* Top row: ingestion + map */}
          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-3 flex flex-col gap-3">
              <div className="h-[340px]">
                <LiveIngestion />
              </div>
              <VisualReasoning />
            </div>
            <div className="col-span-2 min-h-[520px]">
              <SpatialMonitoring />
            </div>
          </div>

          {/* Stats row */}
          <StatsPanel />
        </main>
      </div>

      <StatusBar />
    </div>
    </BayhawkProvider>
  )
}
