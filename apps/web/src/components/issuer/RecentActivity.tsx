import { CheckCircle2, XCircle, Clock } from 'lucide-react';

interface Certificate {
  id: string;
  holderName?: string;
  templateName?: string;
  status: string;
  issuedAt?: string;
  createdAt?: string;
}

interface RecentActivityProps {
  certificates: Certificate[];
}

const statusIcons: Record<string, React.ReactNode> = {
  ISSUED: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  REVOKED: <XCircle className="h-4 w-4 text-red-600" />,
  PENDING_SIGNATURE: <Clock className="h-4 w-4 text-yellow-600" />,
  DRAFT: <Clock className="h-4 w-4 text-gray-400" />,
};

export function RecentActivity({ certificates }: RecentActivityProps) {
  if (!certificates || certificates.length === 0) {
    return <p className="text-center text-muted-foreground py-4">No recent activity</p>;
  }

  return (
    <div className="space-y-4">
      {certificates.map((cert) => (
        <div key={cert.id} className="flex items-center justify-between py-2 border-b last:border-0">
          <div className="flex items-center gap-3">
            {statusIcons[cert.status] || <Clock className="h-4 w-4 text-gray-400" />}
            <div>
              <p className="text-sm font-medium">{cert.holderName || 'Unknown Holder'}</p>
              <p className="text-xs text-muted-foreground">{cert.templateName || 'Certificate'}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-medium capitalize">{cert.status.toLowerCase().replace('_', ' ')}</span>
            {(cert.issuedAt || cert.createdAt) && (
              <p className="text-xs text-muted-foreground">
                {new Date(cert.issuedAt || cert.createdAt!).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
