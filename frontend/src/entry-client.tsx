import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

const container = document.getElementById('root')!
const app = (
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)

// The dev server's index.html has no prerendered content (SSR only runs as part of
// `npm run build`), so hydrating against an empty div would just produce false
// "hydration mismatch" errors on every load. The production build DOES have real
// prerendered markup baked in (see scripts/prerender.mjs), where hydrateRoot is
// required to attach to it instead of discarding and re-rendering from scratch.
if (import.meta.env.DEV) {
  createRoot(container).render(app)
} else {
  hydrateRoot(container, app)
}
