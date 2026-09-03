import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { HomePage } from './HomePage'
import { ScannerPage } from './ScannerPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/security-scan" element={<ScannerPage mode="both" />} />
        <Route path="/security-scan/email" element={<ScannerPage mode="email" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
