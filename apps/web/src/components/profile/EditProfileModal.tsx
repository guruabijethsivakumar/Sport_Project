import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/AuthContext';
import { Dialog } from '../ui/Dialog';
import { FormField } from '../ui/FormField';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Badge } from '../ui/Badge';
import { useToast } from '../ui/Toast';

export interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProfile?: {
    displayName?: string;
    email?: string;
    bio?: string;
    locationLabel?: string;
    travelRadiusKm?: number;
    homeLocation?: { coordinates?: number[] };
  };
  onProfileUpdated?: () => void;
}

export function EditProfileModal({
  isOpen,
  onClose,
  initialProfile,
  onProfileUpdated,
}: EditProfileModalProps): React.ReactElement {
  const { client, user, setUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const userEmail =
    initialProfile?.email ||
    user?.email ||
    (user as any)?.user?.email ||
    '';

  const [displayName, setDisplayName] = useState(
    initialProfile?.displayName || user?.name || ''
  );
  const [bio, setBio] = useState(initialProfile?.bio || '');
  const [locationLabel, setLocationLabel] = useState(
    initialProfile?.locationLabel || ''
  );
  const [travelRadiusKm, setTravelRadiusKm] = useState(
    initialProfile?.travelRadiusKm ? String(initialProfile.travelRadiusKm) : '20'
  );

  // Password Change state
  const isOAuthUser = Boolean(
    (user as any)?.googleId || (user as any)?.authProvider === 'google'
  );
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setFormError('Display name is required.');
      return;
    }

    // Password validation if password section used
    if (showPasswordSection && (currentPassword || newPassword || confirmPassword)) {
      if (!currentPassword) {
        setFormError('Please enter your current password.');
        return;
      }
      if (newPassword.length < 8) {
        setFormError('New password must be at least 8 characters long.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setFormError('New password and confirmation password do not match.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // 1. Update basic info (display name & bio)
      await client.put('/profile/me/basic', {
        displayName: trimmedName,
        bio: bio.trim(),
      });

      // 2. Update location & radius if changed
      const initialCoords =
        initialProfile?.homeLocation?.coordinates &&
        initialProfile.homeLocation.coordinates.length === 2
          ? initialProfile.homeLocation.coordinates
          : [80.27, 13.08];

      await client.put('/profile/me/location', {
        coordinates: initialCoords,
        locationLabel: locationLabel.trim() || undefined,
        travelRadiusKm: Number(travelRadiusKm) || 20,
      });

      // 3. Update password if requested
      if (showPasswordSection && currentPassword && newPassword) {
        await client.post('/auth/change-password', {
          currentPassword,
          newPassword,
        });
      }

      // 4. Immediately update local auth user state so header & UI reflect changes instantly
      setUser((prev: any) => ({
        ...prev,
        name: trimmedName,
        displayName: trimmedName,
      }));

      // 5. Invalidate relevant queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
        queryClient.invalidateQueries({ queryKey: ['auth', 'me'] }),
        queryClient.invalidateQueries({ queryKey: ['ratings'] }),
      ]);

      toast({
        type: 'success',
        title: 'Profile Updated',
        description: 'Your profile changes have been saved successfully.',
      });

      onProfileUpdated?.();
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to update profile. Please try again.';
      setFormError(msg);
      toast({
        type: 'danger',
        title: 'Update Failed',
        description: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Edit Player Profile"
      description="Update your player identity, biography, and competitive preferences."
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {formError && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs font-medium text-danger flex items-center gap-2">
            <Icon name="alert-circle" size={16} className="shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Permanent Email (Read-only) */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Icon name="mail" size={14} className="text-muted-foreground" />
              Email Address
            </span>
            <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
              <Icon name="lock" size={11} />
              Permanent identifier
            </span>
          </label>
          <div className="relative">
            <Input
              value={userEmail}
              disabled
              readOnly
              className="bg-muted/50 text-muted-foreground cursor-not-allowed font-mono text-xs pr-10"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              <Icon name="lock" size={14} />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground/80 italic">
            Email cannot be altered once verified to preserve match integrity and rating records.
          </p>
        </div>

        {/* Display / Full Name */}
        <FormField label="Full Name / Display Name" required>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Alex Johnson"
            required
            className="text-sm font-medium"
          />
        </FormField>

        {/* Bio */}
        <FormField label="Bio / Player Note">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Introduce your playing style, regular match availability, or competitive goals..."
            rows={3}
            maxLength={500}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none"
          />
          <div className="flex justify-end text-[10px] text-muted-foreground mt-0.5">
            {bio.length} / 500 characters
          </div>
        </FormField>

        {/* Location & Radius */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Location Label">
            <Input
              value={locationLabel}
              onChange={(e) => setLocationLabel(e.target.value)}
              placeholder="e.g. Chennai, Tamil Nadu"
              className="text-xs"
            />
          </FormField>

          <FormField label="Travel Radius (km)">
            <Input
              type="number"
              min="1"
              max="100"
              value={travelRadiusKm}
              onChange={(e) => setTravelRadiusKm(e.target.value)}
              className="text-xs"
            />
          </FormField>
        </div>

        {/* Password Management */}
        <div className="pt-2 border-t border-border/60">
          {isOAuthUser ? (
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground flex items-center gap-2">
              <Icon name="shield-check" size={16} className="text-primary shrink-0" />
              <span>
                Account authenticated via Google OAuth. Passwords are secure and managed by your Google Identity provider.
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Icon name="key" size={14} className="text-primary" />
                  Password Management
                </span>
                <button
                  type="button"
                  onClick={() => setShowPasswordSection(!showPasswordSection)}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  {showPasswordSection ? 'Cancel Password Change' : 'Change Password'}
                </button>
              </div>

              {showPasswordSection && (
                <div className="space-y-3 rounded-xl border border-border/80 bg-muted/15 p-3.5">
                  <FormField label="Current Password" required>
                    <Input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="text-xs"
                    />
                  </FormField>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField label="New Password (min 8 chars)" required>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New secure password"
                        className="text-xs"
                      />
                    </FormField>

                    <FormField label="Confirm New Password" required>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="text-xs"
                      />
                    </FormField>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
            Save Changes
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
