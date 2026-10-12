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

export function LoginPage(): React.ReactElement {
  const { client, login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Safe redirect path calculation
  const safeRedirect = getSafeRedirectPath(
    searchParams.get('redirect') || searchParams.get('from'),
    '/'
  );

  // If already authenticated, redirect immediately
  useEffect(() => {
    if (isAuthenticated) {
      navigate(safeRedirect, { replace: true });
    }
  }, [isAuthenticated, navigate, safeRedirect]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onBlur',
  });

  const onSubmit = async (data: LoginFormValues) => {
    setAuthError(null);
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

      if (statusCode === 429 || errorCode === 'RATE_LIMIT_EXCEEDED') {
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
          <FormErrorBanner error={authError} onDismiss={() => setAuthError(null)} />

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

            {/* Forgot password link */}
            <div className="flex justify-end pt-1">
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring rounded"
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
    </div>
  );
}
