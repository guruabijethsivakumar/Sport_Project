import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import {
  forgotPasswordFormSchema,
  type ForgotPasswordFormValues,
  AUTH_MESSAGES,
} from '@playmatch/shared';
import { useAuth } from '../../auth/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export function ForgotPasswordPage(): React.ReactElement {
  const { client, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  // If already authenticated, redirect away immediately to / per spec
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: {
      email: '',
    },
    mode: 'onBlur',
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsSubmitting(true);
    setSubmittedEmail(data.email.trim());

    try {
      await client.post('/auth/forgot-password', {
        email: data.email.trim(),
      });
    } catch {
      // Intentionally suppress any backend error (404, etc.) to ensure uniform
      // response preventing user/email enumeration attacks.
    } finally {
      setIsSubmitting(false);
      setIsSubmitted(true);
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
            {isSubmitted ? AUTH_MESSAGES.resetLinkSentTitle : AUTH_MESSAGES.forgotPasswordTitle}
          </CardTitle>
          <CardDescription className="text-sm">
            {isSubmitted
              ? AUTH_MESSAGES.resetLinkSentMessage
              : AUTH_MESSAGES.forgotPasswordSubtitle}
          </CardDescription>
        </CardHeader>

          <CardContent className="pt-4">
            {isSubmitted ? (
              <div className="space-y-6 text-center">
                <div
                  className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-foreground"
                  role="status"
                  aria-live="polite"
                >
                  <p className="font-medium text-foreground mb-1">
                    Password recovery dispatched
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Sent instructions for: <strong className="text-foreground">{submittedEmail}</strong>
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setIsSubmitted(false)}
                  >
                    Try another email
                  </Button>

                  <Link
                    to="/login"
                    className="text-sm font-semibold text-primary hover:text-primary-hover hover:underline transition-colors block text-center"
                  >
                    {AUTH_MESSAGES.backToLoginLink}
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <FormField
                  label={AUTH_MESSAGES.emailLabel}
                  id="forgot-email"
                  error={errors.email?.message}
                  required
                >
                  <Input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    placeholder={AUTH_MESSAGES.emailPlaceholder}
                    isError={Boolean(errors.email)}
                    disabled={isSubmitting}
                    {...register('email')}
                  />
                </FormField>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full mt-2"
                  isLoading={isSubmitting}
                >
                  {isSubmitting
                    ? AUTH_MESSAGES.sendingResetLinkButton
                    : AUTH_MESSAGES.sendResetLinkButton}
                </Button>

                <div className="text-center pt-2">
                  <Link
                    to="/login"
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {AUTH_MESSAGES.backToLoginLink}
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
