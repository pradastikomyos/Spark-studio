import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { isAdmin } from '../utils/auth';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get session from URL hash
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('OAuth callback error:', error);
          navigate('/login?error=oauth_failed');
          return;
        }

        if (session?.user) {
          // Check if user is admin
          const adminStatus = await isAdmin(session.user.id);
          
          // Redirect based on role
          if (adminStatus) {
            navigate('/admin/dashboard');
          } else {
            navigate('/');
          }
        } else {
          navigate('/login');
        }
      } catch (err) {
        console.error('Unexpected error in OAuth callback:', err);
        navigate('/login?error=unexpected');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff4b86] mx-auto mb-4"></div>
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
