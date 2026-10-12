import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import {
  registerFormSchema,
  type RegisterFormValues,
  AUTH_MESSAGES,
} from '@playmatch/shared';
import { useAuth } from '../../auth/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { FormErrorBanner } from '../../components/patterns/FormPattern';

export function RegisterPage(): React.ReactElement {
  const { client, login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const errorBannerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authError && errorBannerRef.current) {
      errorBannerRef.current.focus();
    }
  }, [authError]);

  // If already authenticated, redirect away immediately
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/onboarding', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onBlur',
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setAuthError(null);
    setIsSubmitting(true);

    try {
      const response = await client.post<{
        user: { id: string; email: string; name?: string; role?: string };
        accessToken: string;
      }>('/auth/register', {
        name: data.name.trim(),
        email: data.email.trim(),
        password: data.password,
      });

      // Synchronize in-memory auth state
      login({
        user: response.user,
        accessToken: response.accessToken,
      });

      navigate('/onboarding', { replace: true });
    } catch (err: any) {
      const status = err?.statusCode || err?.status || err?.response?.status;
      const code = err?.code || err?.data?.code;

      if (status === 409 || code === 'USER_ALREADY_EXISTS') {
        setAuthError(AUTH_MESSAGES.userAlreadyExists);
      } else if (status === 429 || code === 'RATE_LIMIT_EXCEEDED') {
        setAuthError(AUTH_MESSAGES.rateLimited);
      } else if (status === 400 && err?.message) {
        setAuthError(err.message);
      } else if (err?.message?.includes('Network') || !status) {
        setAuthError(AUTH_MESSAGES.networkError);
      } else {
        setAuthError(AUTH_MESSAGES.unknownError);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-border-subtle">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-2">
            <Icon name="user-plus" size={24} />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            {AUTH_MESSAGES.registerTitle}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {AUTH_MESSAGES.registerSubtitle}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {authError && (
              <FormErrorBanner
                error={authError}
                onDismiss={() => setAuthError(null)}
                ref={errorBannerRef}
              />
            )}

            <FormField
              label={AUTH_MESSAGES.nameLabel}
              id="register-name"
              error={errors.name?.message}
              required
            >
              <Input
                id="register-name"
                type="text"
                autoComplete="name"
                placeholder={AUTH_MESSAGES.namePlaceholder}
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.name)}
                {...register('name')}
              />
            </FormField>

            <FormField
              label={AUTH_MESSAGES.emailLabel}
              id="register-email"
              error={errors.email?.message}
              required
            >
              <Input
                id="register-email"
                type="email"
                autoComplete="email"
                placeholder={AUTH_MESSAGES.emailPlaceholder}
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.email)}
                {...register('email')}
              />
            </FormField>

            <FormField
              label={AUTH_MESSAGES.passwordLabel}
              id="register-password"
              error={errors.password?.message}
              helperText="Must be at least 8 characters with uppercase, number & symbol"
              required
            >
              <div className="relative">
                <Input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder={AUTH_MESSAGES.passwordPlaceholder}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(errors.password)}
                  className="pr-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring rounded p-1 transition-colors"
                  aria-label={showPassword ? AUTH_MESSAGES.hidePassword : AUTH_MESSAGES.showPassword}
                >
                  <Icon name={showPassword ? 'eye-off' : 'eye'} size={16} />
                </button>
              </div>
            </FormField>

            <FormField
              label={AUTH_MESSAGES.confirmPasswordLabel}
              id="register-confirm-password"
              error={errors.confirmPassword?.message}
              required
            >
              <div className="relative">
                <Input
                  id="register-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder={AUTH_MESSAGES.confirmPasswordPlaceholder}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(errors.confirmPassword)}
                  className="pr-10"
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring rounded p-1 transition-colors"
                  aria-label={
                    showConfirmPassword ? AUTH_MESSAGES.hidePassword : AUTH_MESSAGES.showPassword
                  }
                >
                  <Icon name={showConfirmPassword ? 'eye-off' : 'eye'} size={16} />
                </button>
              </div>
            </FormField>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              {isSubmitting ? AUTH_MESSAGES.signingUpButton : AUTH_MESSAGES.signUpButton}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <span>{AUTH_MESSAGES.alreadyHaveAccountPrompt} </span>
            <Link
              to="/login"
              className="font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring rounded"
            >
              {AUTH_MESSAGES.signInLink}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
