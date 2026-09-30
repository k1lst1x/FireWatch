import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App'

// A static host such as GitHub Pages cannot rewrite /dashboard to index.html.
// Keep browser URLs locally, but use hash routes in the Pages build.
const Router = import.meta.env.VITE_ROUTER_MODE === 'hash' ? HashRouter : BrowserRouter

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </Router>
  </StrictMode>,
)
