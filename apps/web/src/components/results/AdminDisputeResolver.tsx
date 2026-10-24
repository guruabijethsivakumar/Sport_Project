import React, { useState } from 'react';
import {
  useAdminResolveDispute,
  useAdminVoidDispute,
  type AdminResolveDisputePayload,
} from '@playmatch/shared';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/Card';
import { Select } from '../ui/Select';
import { FormField } from '../ui/FormField';
import { Textarea } from '../ui/Textarea';
import { FormErrorBanner } from '../patterns/FormPattern';

export interface AdminDisputeResolverProps {
  gameId: string;
  onResolved?: () => void;
  className?: string;
}

/**
 * Reusable dispute resolution component for administrators.
 * Can be mounted directly by Developer 2 in the Admin Dashboard or Dispute details.
 */
export function AdminDisputeResolver({
  gameId,
  onResolved,
  className = '',
}: AdminDisputeResolverProps): React.ReactElement {
  const { client, user } = useAuth();
  const [action, setAction] = useState<'accept_proposal' | 'override_scores' | 'void_match'>('accept_proposal');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resolveMutation = useAdminResolveDispute(client, gameId);
  const voidMutation = useAdminVoidDispute(client, gameId);

  const isAdmin = user?.role === 'admin' || user?.role === 'ADMIN';

  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-xs text-warning-foreground">
        Administrator permissions are required to resolve match disputes.
      </div>
    );
  }

  const handleResolve = async () => {
    setErrorMsg(null);
    try {
      if (action === 'void_match') {
        await voidMutation.mutateAsync({ reason: notes.trim() || undefined });
      } else {
        const payload: AdminResolveDisputePayload = {
          action,
          notes: notes.trim() || undefined,
        };
        await resolveMutation.mutateAsync(payload);
      }
      onResolved?.();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to resolve dispute. Please check permissions.');
    }
  };

  const isPending = resolveMutation.isPending || voidMutation.isPending;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Admin Dispute Resolution</CardTitle>
        <CardDescription>
          Force-resolve the contested score proposal or void the match result.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMsg && (
          <FormErrorBanner error={errorMsg} onDismiss={() => setErrorMsg(null)} />
        )}

        <FormField label="Resolution Action" id="dispute-action">
          <Select
            value={action}
            onValueChange={(val: any) => setAction(val)}
            options={[
              { value: 'accept_proposal', label: 'Accept Proposed Score (Uphold Result)' },
              { value: 'void_match', label: 'Void Match (No Rating Delta)' },
            ]}
          />
        </FormField>

        <FormField label="Administrative Notes" id="dispute-notes">
          <Textarea
            id="dispute-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Document reason for dispute resolution..."
            rows={3}
          />
        </FormField>
      </CardContent>
      <CardFooter className="flex justify-end gap-3">
        <Button
          type="button"
          variant="primary"
          onClick={handleResolve}
          isLoading={isPending}
        >
          {action === 'void_match' ? 'Void Match' : 'Apply Resolution'}
        </Button>
      </CardFooter>
    </Card>
  );
}
