import { ErrorBoundary } from './components/ErrorBoundary';
import { AppProviders } from './app/AppProviders'
import { AuthGate } from './app/AuthGate'

function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <AuthGate />
      </AppProviders>
    </ErrorBoundary>
  );
}

export default App;
