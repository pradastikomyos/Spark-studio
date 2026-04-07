import { BrowserRouter as Router } from 'react-router-dom'
import { AppRoutes } from './AppRoutes'
import { useIdleTabSessionRefresh } from '../hooks/useIdleTabSessionRefresh'
import { useSessionRefresh } from '../hooks/useSessionRefresh'

export function AppContent() {
  useSessionRefresh()
  useIdleTabSessionRefresh()

  return (
    <Router>
      <div className="bg-background-light text-text-light font-sans antialiased transition-colors duration-500 selection:bg-primary selection:text-white">
        <AppRoutes />
      </div>
    </Router>
  )
}
