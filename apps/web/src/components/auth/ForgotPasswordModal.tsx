import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import {
  forgotPasswordFormSchema,
  type ForgotPasswordFormValues,
  resetPasswordFormSchema,
  type ResetPasswordFormValues,
  useForgotPassword,
  useResetPassword,
} from '@playmatch/shared';
import { useAuth } from '../../auth/AuthContext';
import { Dialog } from '../ui/Dialog';
import { FormField } from '../ui/FormField';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { useToast } from '../ui/Toast';
import { FormErrorBanner } from '../patterns/FormPattern';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
  initialToken?: string;
  onPasswordResetSuccess?: (email: string) => void;
}

export function ForgotPasswordModal({
  isOpen,
  onClose,
  initialEmail = '',
  initialToken = '',
  onPasswordResetSuccess,
}: ForgotPasswordModalProps): React.ReactElement {
  const { client } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'request' | 'reset'>(
    initialToken ? 'reset' : 'request'
  );
  const [requestSent, setRequestSent] = useState(false);
  const [sentEmail, setSentEmail] = useState(initialEmail);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  // Sync initial email when modal opens
  React.useEffect(() => {
    if (initialEmail && !sentEmail) {
      setSentEmail(initialEmail);
    }
  }, [initialEmail, sentEmail]);

  // Request Reset Link Form (Tab 1)
  const {
    register: registerRequest,
    handleSubmit: handleSubmitRequest,
    formState: { errors: requestErrors },
    setValue: setRequestValue,
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: {
      email: initialEmail,
    },
    mode: 'onBlur',
  });

  React.useEffect(() => {
    if (initialEmail) {
      setRequestValue('email', initialEmail);
    }
  }, [initialEmail, setRequestValue]);

  const forgotMutation = useForgotPassword(client);
  const resetMutation = useResetPassword(client);

  const onRequestSubmit = async (data: ForgotPasswordFormValues) => {
    setRequestError(null);
    setResetError(null);
    try {
      await forgotMutation.mutateAsync({
        email: data.email.trim(),
      });
      setSentEmail(data.email.trim());
      setRequestSent(true);
      toast({
        title: 'Reset Link Dispatched',
        description: `Password recovery link sent to ${data.email.trim()} via SMTP.`,
        type: 'success',
      });
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to dispatch reset email. Please try again.';
      setRequestError(errMsg);
      toast({
        title: 'Request Failed',
        description: errMsg,
        type: 'danger',
      });
    }
  };

  // Reset Password with Token Form (Tab 2)
  const {
    register: registerReset,
    handleSubmit: handleSubmitReset,
    formState: { errors: resetErrors },
    reset: resetResetForm,
    setValue: setResetValue,
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: {
      token: initialToken || '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onBlur',
  });

  // Sync initialToken and switch to reset tab if token arrives
  React.useEffect(() => {
    if (initialToken) {
      setActiveTab('reset');
      setResetValue('token', initialToken);
    }
  }, [initialToken, setResetValue]);

  const onResetSubmit = async (data: ResetPasswordFormValues) => {
    setResetError(null);
    try {
      await resetMutation.mutateAsync({
        token: data.token.trim(),
        newPassword: data.password,
      });

      toast({
        title: 'Password Updated',
        description: 'Your password has been reset successfully. You can now sign in.',
        type: 'success',
      });

      resetResetForm();
      const targetEmail = sentEmail || initialEmail;
      onPasswordResetSuccess?.(targetEmail);
      onClose();
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('token')) {
        setResetError('Password reset link or token is invalid or has expired. Please request a new link.');
      } else {
        setResetError(msg || 'Failed to reset password. Please check your inputs and try again.');
      }
    }
  };

  const handleModalClose = () => {
    setRequestSent(false);
    setResetError(null);
    onClose();
  };

  const isTokenFromLink = Boolean(initialToken);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleModalClose();
      }}
      title={isTokenFromLink ? 'Choose New Password' : 'Reset Password'}
      description={
        isTokenFromLink
          ? initialEmail
            ? `Choose a new secure password for ${initialEmail}`
            : 'Enter and confirm your new account password.'
          : 'Send a password recovery link via SMTP or enter a received token to set a new password.'
      }
    >
      <div className="space-y-4 pt-1">
        {/* Tab Switcher */}
        <div className="flex border-b border-border text-sm">
          <button
            type="button"
            onClick={() => {
              setActiveTab('request');
              setResetError(null);
            }}
            className={`flex-1 pb-2.5 text-center font-medium border-b-2 transition-colors ${
              activeTab === 'request'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            1. Send Link via SMTP
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('reset');
              setResetError(null);
            }}
            className={`flex-1 pb-2.5 text-center font-medium border-b-2 transition-colors ${
              activeTab === 'reset'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            2. Enter Token & Reset
          </button>
        </div>

        {/* Tab 1: Request Reset Link */}
        {activeTab === 'request' && (
          <div>
            {requestSent ? (
              <div className="space-y-4 py-2">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-center space-y-2">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
                    <Icon name="check-circle" size={24} />
                  </div>
                  <h4 className="font-semibold text-foreground text-sm">
                    Reset Link Dispatched via SMTP
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    If an account is registered for <strong className="text-foreground">{sentEmail}</strong>, an email containing your secure password reset link has been dispatched via SMTP.
                  </p>
                  <p className="text-[11px] text-muted-foreground pt-1">
                    Check your inbox and click the button in the email to set your new password directly on this sign-in page. The link is valid for 1 hour.
                  </p>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    type="button"
                    variant="primary"
                    className="w-full"
                    onClick={() => setActiveTab('reset')}
                  >
                    I Have a Reset Token
                  </Button>

                  <div className="flex justify-between items-center pt-1 text-xs">
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => setRequestSent(false)}
                    >
                      Send to a different email
                    </button>
                    <button
                      type="button"
                      className="text-primary hover:underline font-medium"
                      onClick={() => {
                        handleModalClose();
                        navigate(`/reset-password?email=${encodeURIComponent(sentEmail)}`);
                      }}
                    >
                      Open Full Reset Page
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitRequest(onRequestSubmit)} className="space-y-4" noValidate>
                <FormErrorBanner error={requestError} onDismiss={() => setRequestError(null)} />
                <p className="text-xs text-muted-foreground">
                  Enter your PlayMatch account email address. We will send a secure password reset link directly to your inbox via SMTP.
                </p>

                <FormField
                  id="modal-forgot-email"
                  label="Account Email Address"
                  error={requestErrors.email?.message}
                  required
                >
                  <Input
                    id="modal-forgot-email"
                    type="email"
                    autoComplete="email"
                    placeholder="player@example.com"
                    isError={Boolean(requestErrors.email)}
                    disabled={forgotMutation.isPending}
                    {...registerRequest('email')}
                  />
                </FormField>

                <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground flex items-center gap-2">
                  <Icon name="mail" size={16} className="text-primary flex-shrink-0" />
                  <span>
                    Emails are delivered via our SMTP gateway to verify authorized ownership.
                  </span>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleModalClose}
                    disabled={forgotMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={forgotMutation.isPending}
                  >
                    Send Reset Link via SMTP
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Tab 2: Reset Password with Token */}
        {activeTab === 'reset' && (
          <form onSubmit={handleSubmitReset(onResetSubmit)} className="space-y-3.5" noValidate>
            <FormErrorBanner error={resetError} onDismiss={() => setResetError(null)} />

            {resetError?.includes('invalid') || resetError?.includes('expired') ? (
              <div className="p-2.5 rounded-lg border border-amber-500/20 bg-amber-500/10 text-xs text-amber-500 flex items-center justify-between">
                <span>Link expired or invalid? Request a new one:</span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('request');
                    setResetError(null);
                  }}
                  className="font-semibold underline hover:text-amber-400"
                >
                  Request Link
                </button>
              </div>
            ) : null}

            {isTokenFromLink ? (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-xs text-emerald-400 flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-medium">
                  <Icon name="check-circle" size={15} className="text-emerald-500" />
                  <span>Reset token verified from email link</span>
                </div>
                <input type="hidden" {...registerReset('token')} />
              </div>
            ) : (
              <FormField
                id="modal-reset-token"
                label="Reset Token"
                error={resetErrors.token?.message}
                required
              >
                <Input
                  id="modal-reset-token"
                  type="text"
                  placeholder="Paste token from reset email"
                  autoComplete="off"
                  isError={Boolean(resetErrors.token)}
                  disabled={resetMutation.isPending}
                  {...registerReset('token')}
                />
              </FormField>
            )}

            <FormField
              id="modal-new-password"
              label="New Password"
              error={resetErrors.password?.message}
              required
            >
              <div className="relative">
                <Input
                  id="modal-new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters with uppercase, number & symbol"
                  autoComplete="new-password"
                  isError={Boolean(resetErrors.password)}
                  disabled={resetMutation.isPending}
                  className="pr-10"
                  {...registerReset('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Icon name={showPassword ? 'eye-off' : 'eye'} size={16} />
                </button>
              </div>
            </FormField>

            <FormField
              id="modal-confirm-password"
              label="Confirm New Password"
              error={resetErrors.confirmPassword?.message}
              required
            >
              <div className="relative">
                <Input
                  id="modal-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                  isError={Boolean(resetErrors.confirmPassword)}
                  disabled={resetMutation.isPending}
                  className="pr-10"
                  {...registerReset('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((p) => !p)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  <Icon name={showConfirmPassword ? 'eye-off' : 'eye'} size={16} />
                </button>
              </div>
            </FormField>

            <div className="flex justify-end gap-2 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleModalClose}
                disabled={resetMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={resetMutation.isPending}
              >
                Reset Password
              </Button>
            </div>
          </form>
        )}
      </div>
    </Dialog>
  );
}
