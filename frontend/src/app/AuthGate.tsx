import { useAuth } from '../contexts/AuthContext'
import { AppLoadingScreen } from './AppLoadingScreen'
import { AppContent } from './AppContent'

export function AuthGate() {
  const { initialized } = useAuth()

  if (!initialized) {
    return <AppLoadingScreen />
  }

  return <AppContent />
}
