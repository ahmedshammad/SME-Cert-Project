import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { FileText, ExternalLink, ShieldCheck, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { certificateApi } from '@/services/api/certificates';

// WCAG AA-compliant status badge colors (≥ 4.5:1 contrast)
const statusColors: Record<string, string> = {
  ISSUED:  'text-green-800 bg-green-100',
  REVOKED: 'text-red-800   bg-red-100',
  EXPIRED: 'text-amber-900 bg-amber-100',
  DRAFT:   'text-gray-700  bg-gray-100',
};

// Skeleton card shown while loading
function CertSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="h-8 w-8 rounded bg-muted animate-pulse" />
          <div className="h-5 w-16 rounded bg-muted animate-pulse" />
        </div>
        <div className="h-5 w-3/4 rounded bg-muted animate-pulse mt-2" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
        <div className="h-4 w-1/3 rounded bg-muted animate-pulse" />
        <div className="h-8 w-full rounded bg-muted animate-pulse" />
      </CardContent>
    </Card>
  );
}

export function HolderDashboard() {
  const { t } = useTranslation();

  const { data: certificates, isLoading } = useQuery({
    queryKey: ['holder-certificates'],
    queryFn: () => certificateApi.getHolderCertificates(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('holder.dashboard.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('holder.dashboard.subtitle')}</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => <CertSkeleton key={n} />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(certificates || []).map((cert: {
            id: string;
            templateName?: string;
            issuerName?: string;
            status: string;
            issuedAt?: string;
          }) => (
            <Card key={cert.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <FileText className="h-8 w-8 text-primary" aria-hidden="true" />
                  <span
                    className={`text-xs px-2 py-1 rounded font-semibold ${statusColors[cert.status] || 'text-gray-700 bg-gray-100'}`}
                    aria-label={`Status: ${cert.status}`}
                  >
                    {cert.status}
                  </span>
                </div>
                <CardTitle className="text-lg mt-2">{cert.templateName || 'Certificate'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <p className="text-muted-foreground">Issued by</p>
                  <p className="font-medium">{cert.issuerName || 'Unknown'}</p>
                </div>
                {cert.issuedAt && (
                  <div className="text-sm">
                    <p className="text-muted-foreground">Issue Date</p>
                    <p className="font-medium">{new Date(cert.issuedAt).toLocaleDateString()}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Link to={`/holder/certificate/${cert.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <ExternalLink className="h-3 w-3 mr-1" aria-hidden="true" />
                      View
                    </Button>
                  </Link>
                  {/* Pass certId so ShareCenter can pre-select it */}
                  <Link to={`/holder/share?certId=${cert.id}`}>
                    <Button variant="ghost" size="sm">Share</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Enhanced empty state */}
          {(!certificates || certificates.length === 0) && (
            <div className="col-span-full">
              <div className="flex flex-col items-center text-center py-16 px-4 rounded-xl border-2 border-dashed border-muted">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <ShieldCheck className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No certificates yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-6">
                  Your digital certificates will appear here once your organization issues them to you.
                  Certificates are verified on the blockchain and cannot be tampered with.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link to="/verify">
                    <Button variant="outline" size="sm">
                      Verify a Certificate
                      <ArrowRight className="h-3.5 w-3.5 ml-1.5" aria-hidden="true" />
                    </Button>
                  </Link>
                  <Link to="/how-it-works">
                    <Button variant="ghost" size="sm">Learn How It Works</Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
