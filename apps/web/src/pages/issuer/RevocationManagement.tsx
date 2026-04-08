import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Ban, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { certificateApi } from '@/services/api/certificates';

const REVOCATION_REASONS = [
  { value: 'FRAUDULENT',          label: 'Fraudulent Activity',           description: 'Certificate was obtained or used fraudulently' },
  { value: 'SUPERSEDED',          label: 'Superseded by New Certificate', description: 'A corrected or updated certificate has been issued' },
  { value: 'HOLDER_REQUEST',      label: 'Holder Requested Revocation',   description: 'The certificate holder has asked for this certificate to be revoked' },
  { value: 'ISSUER_ERROR',        label: 'Issued in Error',               description: 'Certificate contains incorrect or invalid information' },
  { value: 'ORGANIZATION_CHANGE', label: 'Organization Change',           description: 'Holder has left the organization or their role has changed' },
  { value: 'OTHER',               label: 'Other',                         description: 'Reason not listed above — note details in your audit log' },
];

export function RevocationManagement() {
  const { t } = useTranslation();
  const [certId, setCertId] = useState('');
  const [reason, setReason] = useState('');
  const [success, setSuccess] = useState(false);
  const [confirmPending, setConfirmPending] = useState<{ certId: string; reason: string } | null>(null);

  const revokeMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      certificateApi.revokeCertificate(id, reason),
    onSuccess: () => {
      setSuccess(true);
      setCertId('');
      setReason('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    setConfirmPending({ certId: certId.trim(), reason });
  };

  const handleConfirm = () => {
    if (!confirmPending) return;
    revokeMutation.mutate({ id: confirmPending.certId, reason: confirmPending.reason });
    setConfirmPending(null);
  };

  const selectedReasonLabel = REVOCATION_REASONS.find(r => r.value === reason)?.label || reason;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('issuer.revocation')}</h1>
        <p className="text-muted-foreground mt-1">Revoke certificates that are no longer valid</p>
      </div>

      {/* Confirmation Dialog */}
      {confirmPending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-revoke-title"
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Ban className="h-5 w-5 text-red-600" aria-hidden="true" />
              </div>
              <div>
                <h2 id="confirm-revoke-title" className="text-lg font-bold">Confirm Revocation</h2>
                <p className="text-sm text-muted-foreground">This action is permanent and cannot be undone.</p>
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground shrink-0">Certificate ID</span>
                <span className="font-mono font-medium break-all text-right">{confirmPending.certId}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground shrink-0">Reason</span>
                <span className="font-medium text-right">{selectedReasonLabel}</span>
              </div>
            </div>

            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
              Once revoked, this certificate will be permanently marked as invalid on the blockchain.
              Holders and verifiers will immediately see its revoked status.
            </p>

            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setConfirmPending(null)}
                disabled={revokeMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleConfirm}
                disabled={revokeMutation.isPending}
              >
                {revokeMutation.isPending ? 'Revoking...' : 'Yes, Revoke'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Warning banner — improved contrast (amber-900 on amber-50) */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="flex items-start gap-3 py-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-amber-900">
            Certificate revocation is <strong>permanent</strong> and will be recorded on the blockchain.
            This action cannot be undone.
          </p>
        </CardContent>
      </Card>

      {success && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex items-center gap-3 py-4">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" aria-hidden="true" />
            <p className="text-sm text-green-800">
              Certificate revoked successfully. The blockchain record has been updated.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5" aria-hidden="true" />
            Revoke Certificate
          </CardTitle>
          <CardDescription>Enter the certificate ID and reason for revocation</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="revokeCertId" className="text-sm font-medium">
                Certificate ID <span className="text-destructive" aria-label="required">*</span>
              </label>
              <input
                id="revokeCertId"
                required
                value={certId}
                onChange={(e) => setCertId(e.target.value)}
                placeholder="Enter certificate ID"
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="revokeReason" className="text-sm font-medium">
                Revocation Reason <span className="text-destructive" aria-label="required">*</span>
              </label>
              <select
                id="revokeReason"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select a reason...</option>
                {REVOCATION_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              {reason && (
                <p className="text-xs text-muted-foreground">
                  {REVOCATION_REASONS.find(r => r.value === reason)?.description}
                </p>
              )}
            </div>

            <Button type="submit" variant="destructive" disabled={revokeMutation.isPending}>
              <Ban className="h-4 w-4 mr-2" aria-hidden="true" />
              Revoke Certificate
            </Button>

            {revokeMutation.isError && (
              <p className="text-sm text-destructive" role="alert">
                Failed to revoke certificate. The certificate may not exist or may already be revoked.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
