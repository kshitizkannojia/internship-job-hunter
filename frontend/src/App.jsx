import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import AppShell from './components/layout/AppShell'
import Dashboard from './pages/Dashboard'
import Emails from './pages/Emails'
import Settings from './pages/Settings'

export default function App() {
  const location = useLocation()

  return (
    <AppShell>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/emails" element={<Emails />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </AnimatePresence>
    </AppShell>
  )
}
