import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/state/auth';
import { authApi } from '@/services/api/auth';

type View = 'login' | 'forgot' | 'forgot-sent';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [view, setView] = useState<View>('login');

  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    if (!password) { setError('Please enter your password.'); return; }
    setError('');
    setLoading(true);

    try {
      const data = await authApi.login(email, password);
      setAuth(data.user, data.accessToken, data.refreshToken);
      switch (data.user.role) {
        case 'ISSUER_ADMIN':
        case 'ISSUER_OPERATOR':
          navigate('/issuer');
          break;
        case 'SME_USER':
          navigate('/holder');
          break;
        case 'VERIFIER_USER':
          navigate('/verifier');
          break;
        default:
          navigate('/');
      }
    } catch {
      setError('Invalid email or password. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) { setForgotError('Please enter your email address.'); return; }
    setForgotError('');
    setForgotLoading(true);
    try {
      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      if (res.ok) {
        setView('forgot-sent');
      } else {
        setForgotError('An error occurred. Please try again.');
      }
    } catch {
      setForgotError('An unexpected error occurred. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const cardTitle = view === 'login' ? t('auth.login', 'Sign In') : 'Reset Password';
  const cardDesc = view === 'login'
    ? 'Access the SME Certificate Trust Platform'
    : view === 'forgot'
    ? 'Enter your email to receive a reset link'
    : 'Check your inbox';

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 bg-egypt-navy/10 rounded-xl flex items-center justify-center">
              <Shield className="h-8 w-8 text-egypt-navy" />
            </div>
          </div>
          <CardTitle className="text-2xl">{cardTitle}</CardTitle>
          <CardDescription>{cardDesc}</CardDescription>
        </CardHeader>

        <CardContent>
          {view === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium">{t('auth.email', 'Email')}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                    placeholder="name@organization.com"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium">{t('auth.password', 'Password')}</label>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => { setForgotEmail(email); setView('forgot'); setError(''); }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="accent-primary rounded"
                />
                <span className="text-sm text-muted-foreground">Remember me</span>
              </label>

              <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</>
                ) : t('auth.login', 'Sign In')}
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-muted-foreground">or</span></div>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                {t('auth.no_account', "Don't have an account?")}{' '}
                <Link to="/register" className="text-primary font-medium hover:underline">
                  {t('auth.register', 'Register')}
                </Link>
              </p>
            </form>
          )}

          {view === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              {forgotError && (
                <div className="flex items-start gap-2 bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{forgotError}</span>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Enter the email address associated with your account and we will send you a reset link.
              </p>
              <div className="space-y-1.5">
                <label htmlFor="forgotEmail" className="text-sm font-medium">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="forgotEmail"
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => { setForgotEmail(e.target.value); setForgotError(''); }}
                    className="w-full pl-10 pr-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                    placeholder="name@organization.com"
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-11 font-semibold" disabled={forgotLoading}>
                {forgotLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending Reset Link...</>
                ) : 'Send Reset Link'}
              </Button>
              <button
                type="button"
                onClick={() => { setView('login'); setForgotError(''); }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mx-auto transition-colors pt-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Sign In
              </button>
            </form>
          )}

          {view === 'forgot-sent' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-9 w-9 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold">Check Your Email</h3>
              <p className="text-sm text-muted-foreground">
                If <strong>{forgotEmail}</strong> is registered, a password reset link has been sent.
                The link is valid for 1 hour.
              </p>
              <p className="text-xs text-muted-foreground">
                Check your spam or junk folder if the email does not arrive within a few minutes.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { setView('login'); setForgotError(''); }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign In
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
