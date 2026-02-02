import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Logo from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';
import { isAdmin } from '../utils/auth';
import { supabase } from '../lib/supabase';

const SignUp = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { t } = useTranslation();
  
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError(t('auth.signup.errors.passwordsDoNotMatch'));
      return;
    }

    if (password.length < 6) {
      setError(t('auth.signup.errors.passwordMinLength', { min: 6 }));
      return;
    }

    setLoading(true);

    const { error } = await signUp(email, password, name);
    
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      
      // Auto-login: Supabase already created session, check admin status and redirect
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      const adminStatus = userId ? await isAdmin(userId) : false;
      
      setLoading(false);
      
      // Redirect to appropriate page after brief success message
      setTimeout(() => {
        if (adminStatus) {
          navigate('/admin/dashboard');
        } else {
          navigate('/');
        }
      }, 1500);
    }
  };

  const handleGoogleSignUp = async () => {
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Side - Sign Up Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Logo />
          </div>

          {/* Welcome Text */}
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl md:text-4xl text-text-light mb-2">
              {t('auth.signup.title')}
            </h1>
            <p className="text-subtext-light">
              {t('auth.signup.subtitle')}
            </p>
          </div>

          {/* Sign Up Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-sm text-sm">
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-sm text-sm">
                {t('auth.signup.successLoggingIn')}
              </div>
            )}

            {/* Name Input */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-text-light mb-2"
              >
                {t('auth.fields.name.label')}
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-text-light"
                placeholder={t('auth.fields.name.placeholder')}
                required
              />
            </div>

            {/* Email Input */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-text-light mb-2"
              >
                {t('auth.fields.email.label')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-text-light"
                placeholder={t('auth.fields.email.placeholder')}
                required
              />
            </div>

            {/* Password Input */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-text-light mb-2"
              >
                {t('auth.fields.password.label')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-text-light"
                placeholder={t('auth.signup.passwordPlaceholder')}
                required
              />
            </div>

            {/* Confirm Password Input */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-text-light mb-2"
              >
                {t('auth.fields.confirmPassword.label')}
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-text-light"
                placeholder={t('auth.fields.confirmPassword.placeholder')}
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || success}
              className="w-full bg-[#ff4b86] hover:bg-[#e63d75] text-white py-3 rounded-sm font-medium transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('auth.signup.loading') : t('auth.signup.submit')}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-subtext-light">
                {t('auth.login.orContinueWith')}
              </span>
            </div>
          </div>

          {/* Social Sign Up */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={loading || success}
            className="w-full flex items-center justify-center px-4 py-3 border border-gray-200 rounded-sm hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="text-sm font-medium text-text-light">{t('auth.login.providers.google')}</span>
          </button>

          {/* Sign In Link */}
          <p className="text-center mt-8 text-sm text-subtext-light">
            {t('auth.signup.haveAccount')}{' '}
            <Link to="/login" className="text-primary hover:text-primary-dark font-medium transition-colors">
              {t('auth.signup.signInLink')}
            </Link>
          </p>
        </div>
      </div>

      {/* Right Side - Image/Branding */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5">
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-center space-y-6">
            <h2 className="font-display text-5xl text-text-light">
              {t('auth.signup.branding.welcomeTo')}{' '}<span className="text-primary">Spark</span>
            </h2>
            <p className="text-xl text-subtext-light max-w-md mx-auto">
              {t('auth.signup.branding.description')}
            </p>
          </div>
        </div>
        {/* Decorative Elements */}
        <div className="absolute top-10 right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 left-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
};

export default SignUp;
