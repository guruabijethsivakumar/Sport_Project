import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../../auth/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { FormErrorBanner } from '../../components/patterns/FormPattern';
import { Icon } from '../../components/ui/Icon';

const resetPasswordFormSchema = z
  .object({
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z
      .string({ required_error: 'Please confirm your password' })
      .min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;

export function ResetPasswordPage(): React.ReactElement {
  const { client, isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryToken = searchParams.get('token') || '';
  const emailParam = searchParams.get('email') || '';
  const [manualToken, setManualToken] = useState('');
  const activeToken = queryToken || manualToken;

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // If already authenticated, redirect to /
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
    mode: 'onBlur',
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    const tokenToUse = activeToken.trim();
    if (!tokenToUse) {
      setBannerError('Please enter your password reset token.');
      return;
    }

    setIsSubmitting(true);
    setBannerError(null);

    try {
      await client.post('/auth/reset-password', {
        token: tokenToUse,
        newPassword: data.password,
      });
      setIsSuccess(true);
    } catch (err: any) {
      const serverMessage = err?.message || '';
      if (serverMessage.toLowerCase().includes('token')) {
        setBannerError('Password reset link has expired or is invalid. Please request a new one.');
      } else {
        setBannerError('Unable to reset password. Please check your inputs and try again.');
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
            {isSuccess ? 'Password Reset Complete' : 'Choose New Password'}
          </CardTitle>
          <CardDescription className="text-sm">
            {isSuccess
              ? 'Your password has been securely updated. You can now sign in with your new credentials.'
              : emailParam
              ? `Resetting password for ${emailParam}`
              : 'Enter your reset token and choose a new password below.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          {isSuccess ? (
            <div className="space-y-6 text-center">
              <div
                className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-foreground flex items-center justify-center gap-2"
                role="status"
              >
                <Icon name="check-circle" size={18} className="text-emerald-500" />
                <span className="font-medium">Password successfully updated!</span>
              </div>

              <Link to="/login" className="w-full block">
                <Button variant="primary" className="w-full">
                  Sign in
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <FormErrorBanner error={bannerError} />

              {!queryToken && (
                <FormField
                  id="reset-token"
                  label="Password Reset Token"
                  required
                >
                  <Input
                    id="reset-token"
                    type="text"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="Paste token from reset email"
                    disabled={isSubmitting}
                  />
                </FormField>
              )}

              <FormField
                id="reset-password"
                label="New Password"
                error={errors.password?.message}
                required
              >
                <div className="relative">
                  <Input
                    id="reset-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                    isError={Boolean(errors.password)}
                    className="pr-10"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} />
                  </button>
                </div>
              </FormField>

              <FormField
                id="reset-confirm-password"
                label="Confirm Password"
                error={errors.confirmPassword?.message}
                required
              >
                <div className="relative">
                  <Input
                    id="reset-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    isError={Boolean(errors.confirmPassword)}
                    className="pr-10"
                    {...register('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    <Icon name={showConfirmPassword ? 'eye-off' : 'eye'} size={18} />
                  </button>
                </div>
              </FormField>

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-2"
                isLoading={isSubmitting}
              >
                {isSubmitting ? 'Updating password...' : 'Update password'}
              </Button>

              <div className="pt-2 text-center">
                <Link
                  to="/login"
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
                >
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
