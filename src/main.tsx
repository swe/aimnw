import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { preloadSite } from '@/api/preload'
import App from './App.tsx'
import './styles/global.css'

preloadSite()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
