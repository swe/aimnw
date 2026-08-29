import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { preloadSite } from '@/api/preload'
import { initAnalytics } from '@/lib/rybbit'
import App from './App.tsx'
import './styles/global.css'

initAnalytics()
preloadSite()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
