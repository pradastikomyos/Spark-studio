import { Navigate, useLocation } from 'react-router-dom';
import BrandedLoader from './BrandedLoader';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

const ProtectedRoute = ({ children, adminOnly = false }: ProtectedRouteProps) => {
  const { user, isAdmin, adminStatus } = useAuth();
  const location = useLocation();

  // NOTE: We don't need to check "initialized" here because App.tsx AuthGate
  // already ensures we only render routes AFTER auth is fully initialized.
  // This simplifies the component and eliminates redundant loading states.

  if (!user) {
    // User not logged in - redirect to login
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/login" replace state={{ returnTo, returnState: location.state }} />;
  }

  if (adminOnly && adminStatus === 'checking' && !isAdmin) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-6 py-12">
        <BrandedLoader text="Restoring admin access..." size="sm" />
      </div>
    );
  }

  if (adminOnly && !isAdmin) {
    // User is not admin - redirect to home
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
