import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  loginFormSchema,
  type LoginFormValues,
  AUTH_MESSAGES,
} from '@playmatch/shared';
import { useAuth } from '../../auth/AuthContext';
import { getSafeRedirectPath } from '../../utils/redirect';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { FormErrorBanner } from '../../components/patterns/FormPattern';
import { GoogleSignInButton } from '../../components/auth/GoogleSignInButton';
import { ForgotPasswordModal } from '../../components/auth/ForgotPasswordModal';

export function LoginPage(): React.ReactElement {
  const { client, login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const urlToken = searchParams.get('token') || searchParams.get('resetToken') || '';
  const urlEmail = searchParams.get('email') || '';

  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(Boolean(urlToken));
  const [resetToken, setResetToken] = useState<string>(urlToken);
  const errorBannerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authError && errorBannerRef.current) {
      errorBannerRef.current.focus();
    }
  }, [authError]);

  // Safe redirect path calculation (support next, redirect, or from)
  const safeRedirect = getSafeRedirectPath(
    searchParams.get('next') || searchParams.get('redirect') || searchParams.get('from'),
    '/'
  );

  // If already authenticated, redirect immediately (defaults to / per spec, or safe redirect param)
  useEffect(() => {
    if (isAuthenticated) {
      navigate(safeRedirect, { replace: true });
    }
  }, [isAuthenticated, navigate, safeRedirect]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: urlEmail || '',
      password: '',
    },
    mode: 'onBlur',
  });

  // Listen to searchParams changes to open reset modal if user navigated with token
  useEffect(() => {
    if (urlToken) {
      setResetToken(urlToken);
      setIsResetModalOpen(true);
      if (urlEmail) {
        setValue('email', urlEmail);
      }
    }
  }, [urlToken, urlEmail, setValue]);

  const handleGoogleSuccess = async (credential: string) => {
    setAuthError(null);
    setIsSubmitting(true);

    try {
      const response = await client.post<{
        user: { id: string; email: string; name?: string; role?: string };
        accessToken: string;
      }>('/auth/google', { credential });

      login({
        user: response.user,
        accessToken: response.accessToken,
      });

      // Check onboarding status
      try {
        const onboarding = await client.get<{ isComplete: boolean }>('/profile/me/onboarding');
        if (!onboarding?.isComplete) {
          navigate('/onboarding', { replace: true });
          return;
        }
      } catch {
        // Proceed to safeRedirect
      }

      navigate(safeRedirect, { replace: true });
    } catch {
      setAuthError(AUTH_MESSAGES.googleSignInFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = async (data: LoginFormValues) => {
    setAuthError(null);
    setSuccessBanner(null);
    setIsSubmitting(true);

    try {
      const response = await client.post<{
        user: { id: string; email: string; name?: string; role?: string };
        accessToken: string;
      }>('/auth/login', {
        email: data.email,
        password: data.password,
      });

      // Synchronize session and clear prior queries
      login({
        user: response.user,
        accessToken: response.accessToken,
      });

      navigate(safeRedirect, { replace: true });
    } catch (err: any) {
      // Map exclusively to static generic messages without leaking server details
      const statusCode = err?.statusCode || err?.status;
      const errorCode = err?.code;

      if (
        statusCode === 403 ||
        errorCode === 'AUTH_ACCOUNT_SUSPENDED' ||
        err?.message?.toLowerCase().includes('suspended')
      ) {
        setAuthError(AUTH_MESSAGES.accountSuspended || 'This account has been suspended. Please contact support.');
      } else if (statusCode === 429 || errorCode === 'RATE_LIMIT_EXCEEDED') {
        setAuthError(AUTH_MESSAGES.rateLimited);
      } else if (statusCode === 423 || errorCode === 'AUTH_ACCOUNT_LOCKED') {
        setAuthError(AUTH_MESSAGES.accountLocked);
      } else if (statusCode === 401 || errorCode === 'AUTH_INVALID_CREDENTIALS') {
        setAuthError(AUTH_MESSAGES.invalidCredentials);
      } else if (!statusCode && (err?.message?.includes('fetch') || err?.message?.includes('network'))) {
        setAuthError(AUTH_MESSAGES.networkError);
      } else {
        setAuthError(AUTH_MESSAGES.invalidCredentials);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setIsResetModalOpen(false);
    setResetToken('');
    if (urlToken) {
      const cleanParams = new URLSearchParams(searchParams);
      cleanParams.delete('token');
      cleanParams.delete('resetToken');
      const searchStr = cleanParams.toString();
      navigate(searchStr ? `/login?${searchStr}` : '/login', { replace: true });
    }
  };

  const handlePasswordResetSuccess = (email: string) => {
    if (email) setValue('email', email);
    setSuccessBanner('Password reset successfully! You can now sign in with your new password.');
    setResetToken('');
    setIsResetModalOpen(false);
    const cleanParams = new URLSearchParams(searchParams);
    cleanParams.delete('token');
    cleanParams.delete('resetToken');
    const searchStr = cleanParams.toString();
    navigate(searchStr ? `/login?${searchStr}` : '/login', { replace: true });
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 sm:p-6 lg:p-8">
      <Card className="w-full max-w-md shadow-lg border-border">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black text-2xl mb-2">
            P
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            {AUTH_MESSAGES.loginTitle}
          </CardTitle>
          <CardDescription className="text-sm">
            {AUTH_MESSAGES.loginSubtitle}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <FormErrorBanner
            ref={errorBannerRef}
            error={authError}
            onDismiss={() => setAuthError(null)}
          />

          {successBanner && (
            <div
              role="status"
              className="mb-4 flex items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400 font-medium"
            >
              <div className="flex items-center gap-2">
                <Icon name="check-circle" size={16} className="text-emerald-500 flex-shrink-0" />
                <span>{successBanner}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccessBanner(null)}
                className="text-emerald-400/70 hover:text-emerald-300 p-0.5 rounded"
                aria-label="Dismiss banner"
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          )}

          <div className="mb-4">
            <GoogleSignInButton
              onSuccess={handleGoogleSuccess}
              onError={() => setAuthError(AUTH_MESSAGES.googleSignInFailed)}
              disabled={isSubmitting}
            />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Email Field */}
            <FormField
              id="email"
              label={AUTH_MESSAGES.emailLabel}
              error={errors.email?.message}
              required
            >
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder={AUTH_MESSAGES.emailPlaceholder}
                isError={Boolean(errors.email)}
                disabled={isSubmitting}
                {...register('email')}
              />
            </FormField>

            {/* Password Field */}
            <FormField
              id="password"
              label={AUTH_MESSAGES.passwordLabel}
              error={errors.password?.message}
              required
            >
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder={AUTH_MESSAGES.passwordPlaceholder}
                  isError={Boolean(errors.password)}
                  disabled={isSubmitting}
                  className="pr-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring rounded-md transition-colors"
                  aria-label={showPassword ? AUTH_MESSAGES.hidePassword : AUTH_MESSAGES.showPassword}
                  tabIndex={0}
                >
                  <Icon name={showPassword ? 'eye-off' : 'eye'} size={16} />
                </button>
              </div>
            </FormField>

            {/* Forgot password option */}
            <div className="flex justify-end items-center pt-1 text-xs">
              <Link
                to="/forgot-password"
                onClick={(e) => {
                  if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
                    e.preventDefault();
                    setIsResetModalOpen(true);
                  }
                }}
                className="font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring rounded"
              >
                {AUTH_MESSAGES.forgotPasswordLink}
              </Link>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              isLoading={isSubmitting}
            >
              {isSubmitting ? AUTH_MESSAGES.signingInButton : AUTH_MESSAGES.signInButton}
            </Button>
          </form>

          {/* Registration link prompt */}
          <div className="mt-6 text-center text-xs text-muted-foreground">
            {AUTH_MESSAGES.noAccountPrompt}{' '}
            <Link
              to="/register"
              className="font-semibold text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring rounded"
            >
              {AUTH_MESSAGES.signUpLink}
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Forgot and Reset Password Dialog Modal */}
      <ForgotPasswordModal
        isOpen={isResetModalOpen}
        onClose={handleModalClose}
        initialEmail={urlEmail || watch('email')}
        initialToken={resetToken}
        onPasswordResetSuccess={handlePasswordResetSuccess}
      />
    </div>
  );
}
