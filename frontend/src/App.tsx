import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from './landing/Landing'
import Settings from './pages/Settings'

// keeps Leaflet and the dashboard out of the landing page's bundle
const Dashboard = lazy(() => import('./pages/Dashboard'))

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      <Route path="/settings" element={<Settings />} />
      <Route
        path="/dashboard"
        element={
          <Suspense fallback={<div className="h-screen w-full bg-[#080808]" />}>
            <Dashboard />
          </Suspense>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
