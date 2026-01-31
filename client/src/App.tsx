import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import NewCase from './pages/NewCase'
import CaseDetail from './pages/CaseDetail'
import DocumentUpload from './pages/DocumentUpload'
import OcrProcessing from './pages/OcrProcessing'
import DataReview from './pages/DataReview'
import DocumentGeneration from './pages/DocumentGeneration'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="new" element={<NewCase />} />
          <Route path="case/:id" element={<CaseDetail />} />
          <Route path="case/:id/upload" element={<DocumentUpload />} />
          <Route path="case/:id/ocr" element={<OcrProcessing />} />
          <Route path="case/:id/review" element={<DataReview />} />
          <Route path="case/:id/generate" element={<DocumentGeneration />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
