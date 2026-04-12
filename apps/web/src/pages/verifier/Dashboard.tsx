import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, CheckCircle2, XCircle, AlertTriangle, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { certificateApi } from '@/services/api/certificates';

type VerifyResult = {
  status: string;
  certificate?: Record<string, unknown>;
  blockchainTxId?: string;
};

export function VerifierDashboard() {
  const { t } = useTranslation();
  const [certId, setCertId] = useState('');
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certId.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await certificateApi.verifyCertificate(certId.trim());
      setResult(data);
    } catch {
      setError('Verification failed. Certificate not found.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('verifier.dashboard.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('verifier.dashboard.subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Verify Certificate
          </CardTitle>
          <CardDescription>Enter a certificate ID or scan a QR code</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="flex gap-2">
            <input
              value={certId}
              onChange={(e) => setCertId(e.target.value)}
              placeholder="Enter certificate ID..."
              className="flex-1 px-3 py-2 border rounded-md text-sm"
            />
            <Button type="submit" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify'}
            </Button>
            <Button type="button" variant="outline" size="icon">
              <QrCode className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200">
          <CardContent className="flex items-center gap-3 py-4">
            <XCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardContent className="py-6">
            <div className={`flex items-center gap-3 p-4 rounded-lg ${
              result.status === 'VALID' ? 'bg-green-50' :
              result.status === 'REVOKED' ? 'bg-red-50' : 'bg-yellow-50'
            }`}>
              {result.status === 'VALID' ? (
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              ) : result.status === 'REVOKED' ? (
                <XCircle className="h-8 w-8 text-red-600" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
              )}
              <div>
                <p className="text-lg font-semibold">
                  {result.status === 'VALID' ? 'Certificate is Valid' :
                   result.status === 'REVOKED' ? 'Certificate is Revoked' : 'Certificate Invalid'}
                </p>
                <p className="text-sm text-muted-foreground">Blockchain verification complete</p>
              </div>
            </div>
            {result.blockchainTxId && (
              <div className="mt-4 text-sm">
                <p className="text-muted-foreground">Transaction ID</p>
                <p className="font-mono text-xs break-all mt-1">{result.blockchainTxId}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
