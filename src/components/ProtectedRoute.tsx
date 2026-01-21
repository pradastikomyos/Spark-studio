import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

const ProtectedRoute = ({ children, adminOnly = false }: ProtectedRouteProps) => {
  const { user, isAdmin } = useAuth();

  // NOTE: We don't need to check "initialized" here because App.tsx AuthGate
  // already ensures we only render routes AFTER auth is fully initialized.
  // This simplifies the component and eliminates redundant loading states.

  if (!user) {
    // User not logged in - redirect to login
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    // User is not admin - redirect to home
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
