import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle2, XCircle, Download, Share2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { certificateApi } from '@/services/api/certificates';

export function CertificateDetails() {
  const { certId } = useParams();
  const { t } = useTranslation();

  const { data: cert, isLoading } = useQuery({
    queryKey: ['certificate', certId],
    queryFn: () => certificateApi.getCertificate(certId!),
    enabled: !!certId,
  });

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>;
  }

  if (!cert) {
    return <div className="text-center py-8 text-muted-foreground">Certificate not found</div>;
  }

  const isValid = cert.status === 'ISSUED';

  return (
    <div className="space-y-6 max-w-3xl">
      <Link to="/holder" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to certificates
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{cert.templateName || 'Certificate'}</h1>
          <p className="text-muted-foreground mt-1">Certificate ID: {cert.id}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled title="Coming soon">
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          <Link to={`/holder/share?certId=${cert.id}`}>
            <Button size="sm">
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Certificate Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`flex items-center gap-3 p-3 rounded-lg ${isValid ? 'bg-green-50' : 'bg-red-50'}`}>
                {isValid ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className={`font-medium ${isValid ? 'text-green-800' : 'text-red-800'}`}>
                  {cert.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Holder</p>
                  <p className="font-medium">{cert.holderName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Issuer</p>
                  <p className="font-medium">{cert.issuerName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Issued Date</p>
                  <p className="font-medium">{cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Expiry Date</p>
                  <p className="font-medium">{cert.expiresAt ? new Date(cert.expiresAt).toLocaleDateString() : 'No expiry'}</p>
                </div>
              </div>
              {cert.blockchainTxId && (
                <div className="text-sm">
                  <p className="text-muted-foreground">Blockchain Transaction</p>
                  <p className="font-mono text-xs break-all mt-1">{cert.blockchainTxId}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">QR Code</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <QRCodeSVG
                value={
                  cert.verificationUrl?.startsWith('http')
                    ? cert.verificationUrl
                    : `${window.location.origin}${cert.verificationUrl || `/verify/${cert.id}`}`
                }
                size={undefined}
                className="w-full max-w-[180px] h-auto"
                level="H"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
