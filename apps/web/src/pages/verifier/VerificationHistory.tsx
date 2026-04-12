import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { History, CheckCircle2, XCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { metricsApi } from '@/services/api/metrics';

const statusIcons: Record<string, React.ReactNode> = {
  VALID: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  REVOKED: <XCircle className="h-4 w-4 text-red-600" />,
  INVALID: <XCircle className="h-4 w-4 text-red-600" />,
  EXPIRED: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
};

export function VerificationHistory() {
  const { t } = useTranslation();

  const { data: history, isLoading } = useQuery({
    queryKey: ['verification-history'],
    queryFn: () => metricsApi.getVerificationMetrics(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('verifier.history')}</h1>
        <p className="text-muted-foreground mt-1">View your past verification activities</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent Verifications
          </CardTitle>
          <CardDescription>Your verification activity log</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded-full bg-muted animate-pulse" />
                    <div className="space-y-1.5">
                      <div className="h-3.5 w-36 bg-muted animate-pulse rounded" />
                      <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                    </div>
                  </div>
                  <div className="space-y-1.5 text-right">
                    <div className="h-3.5 w-14 bg-muted animate-pulse rounded ml-auto" />
                    <div className="h-3 w-28 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {(history?.recentVerifications || []).map((entry: {
                id: string;
                certificateId: string;
                status: string;
                verifiedAt: string;
                holderName?: string;
              }) => (
                <div key={entry.id} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    {statusIcons[entry.status] || <AlertTriangle className="h-4 w-4 text-gray-400" />}
                    <div>
                      <p className="text-sm font-medium">Certificate: {entry.certificateId.slice(0, 12)}...</p>
                      <p className="text-xs text-muted-foreground">{entry.holderName || 'Unknown holder'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-medium">{entry.status}</span>
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.verifiedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {(!history?.recentVerifications || history.recentVerifications.length === 0) && (
                <div className="flex flex-col items-center text-center py-12 px-4">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                    <History className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <h3 className="text-base font-semibold mb-1">No verification history yet</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mb-5">
                    Each time you verify a certificate it will appear here. Use the dashboard to start verifying.
                  </p>
                  <Link to="/verifier">
                    <Button size="sm">
                      Go to Verifier Dashboard
                      <ArrowRight className="h-3.5 w-3.5 ml-1.5" aria-hidden="true" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
