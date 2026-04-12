import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Share2, Copy, Mail, Link as LinkIcon, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ShareCenter() {
  const { t } = useTranslation();
  const [certId, setCertId] = useState('');
  const [scope, setScope] = useState('METADATA_ONLY');
  const [copied, setCopied] = useState(false);

  const shareLink = certId
    ? `${window.location.origin}/verify/${certId}`
    : '';

  const handleCopy = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('holder.share')}</h1>
        <p className="text-muted-foreground mt-1">Share your certificates with verifiers securely</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Create Share Link
          </CardTitle>
          <CardDescription>Generate a secure sharing link for your certificate</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Certificate ID</label>
            <input
              value={certId}
              onChange={(e) => setCertId(e.target.value)}
              placeholder="Enter the certificate ID to share"
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Access Scope</label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            >
              <option value="METADATA_ONLY">Metadata Only (name, date, status)</option>
              <option value="FULL_CONTENT">Full Content (all certificate data)</option>
              <option value="ATTACHMENTS">Full Content + Attachments</option>
            </select>
          </div>

          {shareLink && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Share Link</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={shareLink}
                  className="flex-1 px-3 py-2 border rounded-md text-sm bg-gray-50 font-mono"
                />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" disabled={!shareLink}>
              <Mail className="h-4 w-4 mr-2" />
              Email Link
            </Button>
            <Button variant="outline" disabled={!shareLink}>
              <LinkIcon className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
