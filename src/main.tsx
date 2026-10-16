import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import './styles/globals.css'
import './styles/workspace.css'
import './styles/components.css'
import './styles/auth.css'
import './styles/analytics.css'
import './styles/productivity.css'
import './styles/eod.css'

const root = document.getElementById('root')
if (!root) throw new Error('DevTrack requires a root element in index.html.')
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
