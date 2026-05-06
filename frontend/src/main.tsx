import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import ConnectWanikaniPage from './pages/ConnectWanikaniPage'
import OnboardingPage from './pages/OnboardingPage'
import DashboardPage from './pages/DashboardPage'
import PracticeSetupPage from './pages/practice/PracticeSetupPage'
import PracticeSessionPage from './pages/practice/PracticeSessionPage'
import PracticeSummaryPage from './pages/practice/PracticeSummaryPage'
import PracticeSentenceSetupPage from './pages/practice/PracticeSentenceSetupPage'
import PracticeSentenceSessionPage from './pages/practice/PracticeSentenceSessionPage'
import PracticeSentenceSummaryPage from './pages/practice/PracticeSentenceSummaryPage'
import AdminPhrasesPage from './pages/admin/AdminPhrasesPage'
import ProtectedRoute from './components/ProtectedRoute'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route path="/connect-wanikani" element={<ProtectedRoute><ConnectWanikaniPage /></ProtectedRoute>} />
        <Route path="/welcome" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

        <Route path="/practice/setup" element={<ProtectedRoute><PracticeSetupPage /></ProtectedRoute>} />
        <Route path="/practice/session/:id" element={<ProtectedRoute><PracticeSessionPage /></ProtectedRoute>} />
        <Route path="/practice/session/:id/summary" element={<ProtectedRoute><PracticeSummaryPage /></ProtectedRoute>} />

        <Route path="/practice/sentence/setup" element={<ProtectedRoute><PracticeSentenceSetupPage /></ProtectedRoute>} />
        <Route path="/practice/sentence/session/:id" element={<ProtectedRoute><PracticeSentenceSessionPage /></ProtectedRoute>} />
        <Route path="/practice/sentence/session/:id/summary" element={<ProtectedRoute><PracticeSentenceSummaryPage /></ProtectedRoute>} />

        {/* Admin (gated client-side; backend also enforces) */}
        <Route path="/admin/phrases" element={<ProtectedRoute><AdminPhrasesPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
