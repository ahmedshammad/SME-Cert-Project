import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Shield, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2,
  User, Building2, ChevronRight, ChevronLeft, Check, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/state/auth';
import { authApi } from '@/services/api/auth';
import { cn } from '@/lib/utils';

type Step = 1 | 2 | 3;

const roles = [
  { value: 'SME_USER', label: 'SME User', description: 'Receive and manage your digital certificates' },
  { value: 'ISSUER_ADMIN', label: 'Issuer Admin', description: 'Issue and manage certificates for your organization' },
  { value: 'VERIFIER_USER', label: 'Verifier', description: 'Verify certificate authenticity' },
];

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' };
  if (score <= 3) return { score, label: 'Fair', color: 'bg-orange-500' };
  if (score <= 4) return { score, label: 'Good', color: 'bg-yellow-500' };
  return { score, label: 'Strong', color: 'bg-green-500' };
}

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'SME_USER',
    organizationName: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const passwordStrength = useMemo(() => getPasswordStrength(form.password), [form.password]);

  const validateStep = (s: Step): boolean => {
    switch (s) {
      case 1:
        if (!form.firstName.trim()) { setError('Please enter your first name.'); return false; }
        if (!form.lastName.trim()) { setError('Please enter your last name.'); return false; }
        if (!form.email.trim()) { setError('Please enter your email address.'); return false; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError('Please enter a valid email address.'); return false; }
        return true;
      case 2:
        if (!form.role) { setError('Please select your role.'); return false; }
        return true;
      case 3:
        if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return false; }
        if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return false; }
        if (!acceptTerms) { setError('You must accept the terms and conditions.'); return false; }
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setError('');
      setStep((s) => Math.min(s + 1, 3) as Step);
    }
  };

  const prevStep = () => {
    setError('');
    setStep((s) => Math.max(s - 1, 1) as Step);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(3)) return;

    setError('');
    setLoading(true);
    try {
      const { confirmPassword: _, ...payload } = form;
      const data = await authApi.register(payload);
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
      setError('Registration failed. This email may already be registered. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ['Account', 'Role', 'Security'];

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 bg-egypt-navy/10 rounded-xl flex items-center justify-center">
              <Shield className="h-8 w-8 text-egypt-navy" />
            </div>
          </div>
          <CardTitle className="text-2xl">{t('auth.register', 'Create Account')}</CardTitle>
          <CardDescription>Join the SME Certificate Trust Platform</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-0 mb-6">
            {stepLabels.map((label, i) => {
              const stepNum = (i + 1) as Step;
              const isActive = step === stepNum;
              const isComplete = step > stepNum;
              return (
                <div key={label} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      aria-current={isActive ? 'step' : undefined}
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
                        isComplete ? 'bg-egypt-green text-white' :
                        isActive ? 'bg-egypt-navy text-white' :
                        'bg-muted text-muted-foreground'
                      )}
                    >
                      {isComplete ? <Check className="h-4 w-4" /> : stepNum}
                    </div>
                    <span className={cn(
                      'text-xs mt-1 font-medium',
                      isActive ? 'text-egypt-navy' : 'text-muted-foreground'
                    )}>
                      {label}
                    </span>
                  </div>
                  {i < 2 && (
                    <div className={cn(
                      'w-16 h-0.5 mx-1 mb-4',
                      step > stepNum ? 'bg-egypt-green' : 'bg-muted'
                    )} />
                  )}
                </div>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Step 1: Personal Info */}
            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="firstName" className="text-sm font-medium">{t('auth.first_name', 'First Name')}</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        id="firstName"
                        required
                        value={form.firstName}
                        onChange={(e) => updateField('firstName', e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                        placeholder="First name"
                        autoComplete="given-name"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="lastName" className="text-sm font-medium">{t('auth.last_name', 'Last Name')}</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        id="lastName"
                        required
                        value={form.lastName}
                        onChange={(e) => updateField('lastName', e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                        placeholder="Last name"
                        autoComplete="family-name"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="regEmail" className="text-sm font-medium">{t('auth.email', 'Email')}</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="regEmail"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                      placeholder="name@organization.com"
                      autoComplete="email"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Role & Organization */}
            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Select Your Role</label>
                  <div className="space-y-2">
                    {roles.map((role) => (
                      <label
                        key={role.value}
                        className={cn(
                          'flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors',
                          form.role === role.value
                            ? 'border-egypt-navy bg-egypt-navy/5'
                            : 'border-muted hover:border-muted-foreground/30'
                        )}
                      >
                        <input
                          type="radio"
                          name="role"
                          value={role.value}
                          checked={form.role === role.value}
                          onChange={(e) => updateField('role', e.target.value)}
                          className="mt-1 accent-egypt-navy"
                        />
                        <div>
                          <p className="text-sm font-medium">{role.label}</p>
                          <p className="text-xs text-muted-foreground">{role.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="org" className="text-sm font-medium">{t('auth.organization', 'Organization')}</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="org"
                      value={form.organizationName}
                      onChange={(e) => updateField('organizationName', e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                      placeholder="Your organization name (optional)"
                      autoComplete="organization"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Password & Terms */}
            {step === 3 && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-1.5">
                  <label htmlFor="regPassword" className="text-sm font-medium">{t('auth.password', 'Password')}</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="regPassword"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={form.password}
                      onChange={(e) => updateField('password', e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                      placeholder="Minimum 8 characters"
                      autoComplete="new-password"
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
                  {/* Password Strength */}
                  {form.password && (
                    <div className="space-y-1.5 mt-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5, 6].map((level) => (
                          <div
                            key={level}
                            className={cn(
                              'h-1.5 flex-1 rounded-full transition-colors',
                              level <= passwordStrength.score ? passwordStrength.color : 'bg-muted'
                            )}
                          />
                        ))}
                      </div>
                      <p className={cn('text-xs font-medium', {
                        'text-red-600': passwordStrength.label === 'Weak',
                        'text-orange-600': passwordStrength.label === 'Fair',
                        'text-yellow-600': passwordStrength.label === 'Good',
                        'text-green-600': passwordStrength.label === 'Strong',
                      })}>
                        Password strength: {passwordStrength.label}
                      </p>
                      <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                        <span className={form.password.length >= 8 ? 'text-green-600' : ''}>
                          {form.password.length >= 8 ? <CheckCircle2 className="inline h-3 w-3 mr-0.5" /> : ''}
                          8+ characters
                        </span>
                        <span className={/[A-Z]/.test(form.password) ? 'text-green-600' : ''}>
                          {/[A-Z]/.test(form.password) ? <CheckCircle2 className="inline h-3 w-3 mr-0.5" /> : ''}
                          Uppercase
                        </span>
                        <span className={/[a-z]/.test(form.password) ? 'text-green-600' : ''}>
                          {/[a-z]/.test(form.password) ? <CheckCircle2 className="inline h-3 w-3 mr-0.5" /> : ''}
                          Lowercase
                        </span>
                        <span className={/[0-9]/.test(form.password) ? 'text-green-600' : ''}>
                          {/[0-9]/.test(form.password) ? <CheckCircle2 className="inline h-3 w-3 mr-0.5" /> : ''}
                          Number
                        </span>
                        <span className={/[^A-Za-z0-9]/.test(form.password) ? 'text-green-600' : ''}>
                          {/[^A-Za-z0-9]/.test(form.password) ? <CheckCircle2 className="inline h-3 w-3 mr-0.5" /> : ''}
                          Special character
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="confirmPassword" className="text-sm font-medium">{t('auth.confirm_password', 'Confirm Password')}</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      required
                      value={form.confirmPassword}
                      onChange={(e) => updateField('confirmPassword', e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  </div>
                  {form.confirmPassword && form.password !== form.confirmPassword && (
                    <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
                  )}
                </div>

                {/* Terms */}
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => { setAcceptTerms(e.target.checked); setError(''); }}
                    className="accent-primary rounded mt-0.5"
                  />
                  <span className="text-sm text-muted-foreground">
                    I agree to the{' '}
                    <button type="button" className="text-primary hover:underline">Terms of Service</button>
                    {' '}and{' '}
                    <button type="button" className="text-primary hover:underline">Privacy Policy</button>
                  </span>
                </label>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-3 pt-2">
              {step > 1 && (
                <Button type="button" variant="outline" onClick={prevStep} className="flex-1 h-11">
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
              )}
              {step < 3 ? (
                <Button type="button" onClick={nextStep} className="flex-1 h-11 font-semibold">
                  Continue
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" className="flex-1 h-11 font-semibold" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    t('auth.register', 'Create Account')
                  )}
                </Button>
              )}
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-muted-foreground">or</span></div>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              {t('auth.has_account', 'Already have an account?')}{' '}
              <Link to="/login" className="text-primary font-medium hover:underline">
                {t('auth.login', 'Sign In')}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
