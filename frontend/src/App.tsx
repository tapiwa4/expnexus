import { Route, Routes } from 'react-router-dom'
import { HomePage } from './HomePage'
import { ScannerPage } from './ScannerPage'

// No router wrapper here — entry-client.tsx wraps this in BrowserRouter for the
// browser, entry-server.tsx wraps it in StaticRouter for build-time prerendering.
function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/security-scan" element={<ScannerPage mode="both" />} />
      <Route path="/security-scan/email" element={<ScannerPage mode="email" />} />
    </Routes>
  )
}

export default App
