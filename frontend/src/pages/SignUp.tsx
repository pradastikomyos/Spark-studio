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
