import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import { SiteSettingsProvider } from './contexts/SiteSettingsContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <SiteSettingsProvider>
        <App />
      </SiteSettingsProvider>
    </AuthProvider>
  </StrictMode>,
)
