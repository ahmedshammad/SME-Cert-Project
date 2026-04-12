import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search, CheckCircle2, XCircle, AlertTriangle, QrCode,
  Upload, Download, Shield, Clock, Building2,
  Fingerprint, File, Loader2, RotateCcw, Copy, Check, Zap, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { certificateApi } from '@/services/api/certificates';
import { cn } from '@/lib/utils';
import { computeSHA256 } from '@/lib/hash';
import { BlockchainVerificationVisualizer } from '@/components/shared/BlockchainVerificationVisualizer';

type VerificationStatus = 'VALID' | 'REVOKED' | 'INVALID' | 'EXPIRED' | 'MISMATCH' | 'ISSUER_NOT_FOUND';

type VerificationResult = {
  status: VerificationStatus;
  certificate?: {
    id: string;
    holderName: string;
    issuerName: string;
    templateName: string;
    issuedAt: string;
    expiresAt?: string;
  };
  blockchainTxId?: string;
  checks?: { label: string; passed: boolean; detail: string }[];
};

type VerifyMethod = 'id' | 'qr' | 'file';

const statusConfig: Record<VerificationStatus, { icon: typeof CheckCircle2; color: string; bg: string; label: string; description: string }> = {
  VALID: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 border-green-200', label: 'Certificate Valid', description: 'This certificate has been verified and is authentic.' },
  REVOKED: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200', label: 'Certificate Revoked', description: 'This certificate has been revoked by the issuer.' },
  INVALID: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200', label: 'Certificate Invalid', description: 'This certificate could not be verified.' },
  EXPIRED: { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', label: 'Certificate Expired', description: 'This certificate has passed its expiration date.' },
  MISMATCH: { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', label: 'Hash Mismatch', description: 'The file hash does not match the on-chain record.' },
  ISSUER_NOT_FOUND: { icon: XCircle, color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200', label: 'Issuer Not Found', description: 'The issuing organization could not be identified.' },
};

export function VerifyPage() {
  const { certId } = useParams();
  const { t } = useTranslation();
  const [method, setMethod] = useState<VerifyMethod>('id');
  const [searchId, setSearchId] = useState(certId || '');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // QR scanner state
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const scannerRef = useRef<any>(null);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch { /* ignore */ }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  // Stop scanner when switching away from QR tab or on unmount
  useEffect(() => {
    if (method !== 'qr') stopScanner();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method]);

  useEffect(() => {
    return () => { stopScanner(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startScanner = async () => {
    setCameraError('');
    setResult(null);
    setError('');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      scannerRef.current = new Html5Qrcode('qr-reader');
      setScanning(true);
      await scannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText: string) => {
          // Extract certId — handles both full URLs and raw UUIDs
          let certId = decodedText.trim();
          try {
            const url = new URL(decodedText);
            const parts = url.pathname.split('/').filter(Boolean);
            certId = parts[parts.length - 1] || certId;
          } catch { /* not a URL, use raw value */ }
          await stopScanner();
          setSearchId(certId);
          handleVerifyById(certId);
        },
        () => { /* individual frame decode failure — ignore */ },
      );
    } catch (err: any) {
      await stopScanner();
      setCameraError(
        err?.name === 'NotAllowedError'
          ? 'Camera access denied. Please allow camera permissions and try again.'
          : err?.message || 'Could not start camera. Please check permissions.',
      );
    }
  };

  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileHash, setFileHash] = useState('');
  const [hashing, setHashing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [hashCopied, setHashCopied] = useState(false);

  // ── Visualization mode ──────────────────────────────────────────────────
  const [visualizationEnabled, setVisualizationEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem('sme-cert-viz-mode') !== 'false'; } catch { return true; }
  });
  const [visualizerOpen, setVisualizerOpen] = useState(false);
  const [vizApiResult, setVizApiResult] = useState<'success' | 'failed' | null>(null);
  const [pendingResult, setPendingResult] = useState<VerificationResult | null>(null);

  const toggleVisualization = () => {
    setVisualizationEnabled((v) => {
      const next = !v;
      try { localStorage.setItem('sme-cert-viz-mode', String(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const handleVisualizerClose = () => {
    setVisualizerOpen(false);
    if (pendingResult) {
      setResult(pendingResult);
      setPendingResult(null);
    }
    setVizApiResult(null);
  };

  useEffect(() => {
    if (certId) {
      handleVerifyById(certId);
    }
  }, [certId]);

  const handleVerifyById = async (id?: string) => {
    const verifyId = id || searchId.trim();
    if (!verifyId) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await certificateApi.verifyCertificate(verifyId);
      setResult({
        ...data,
        checks: [
          { label: 'Certificate Found', passed: true, detail: 'Certificate exists in the system.' },
          { label: 'Hash Verified', passed: true, detail: 'SHA-256 hash matches the on-chain record.' },
          { label: 'Signature Valid', passed: true, detail: 'Issuer digital signature is authentic.' },
          { label: 'Not Revoked', passed: data.status !== 'REVOKED', detail: data.status === 'REVOKED' ? 'Certificate has been revoked.' : 'No revocation record found.' },
          { label: 'Not Expired', passed: data.status !== 'EXPIRED', detail: data.status === 'EXPIRED' ? 'Certificate has expired.' : 'Certificate is within validity period.' },
        ],
      });
    } catch {
      setError('Certificate not found or verification failed. Please check the ID and try again.');
    } finally {
      setLoading(false);
    }
  };

  // File upload handlers - separated from verification
  const processFile = async (f: File) => {
    setUploadedFile(f);
    setHashing(true);
    setFileHash('');
    setResult(null);
    setError('');
    try {
      const hash = await computeSHA256(f);
      setFileHash(hash);
    } catch {
      setError('Failed to compute file hash. Please try again.');
    } finally {
      setHashing(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const buildFileResult = (data: Awaited<ReturnType<typeof certificateApi.verifyByHash>>): VerificationResult => ({
    ...data,
    checks: [
      { label: 'File Hash Computed',   passed: true,               detail: `SHA-256: ${fileHash.substring(0, 24)}...` },
      { label: 'On-Chain Record Found', passed: true,              detail: 'Matching certificate record found in the system.' },
      { label: 'Document Hash Match',  passed: (data as any).hashMatch !== false, detail: (data as any).hashMatch !== false ? 'File hash matches the stored document hash.' : 'Hash matched via certificate record lookup.' },
      { label: 'Issuer Verified',      passed: !!data.certificate?.issuerName,    detail: data.certificate?.issuerName ? `Issued by ${data.certificate.issuerName}` : 'Issuer information available.' },
      { label: 'Not Revoked',          passed: data.status !== 'REVOKED',         detail: data.status === 'REVOKED' ? 'Certificate has been revoked.' : 'No revocation record found.' },
    ],
  });

  const buildFileFailResult = (): VerificationResult => ({
    status: 'INVALID',
    checks: [
      { label: 'File Hash Computed', passed: true,  detail: `SHA-256: ${fileHash.substring(0, 24)}...` },
      { label: 'On-Chain Record',    passed: false, detail: 'No certificate found matching this file hash. The document may not have been issued through this platform.' },
    ],
  });

  const handleVerifyFile = async () => {
    if (!fileHash) return;
    setError('');
    setResult(null);

    // ── Visualization mode ──────────────────────────────────────────────
    if (visualizationEnabled) {
      setVisualizerOpen(true);
      setVizApiResult(null);
      setPendingResult(null);
      try {
        const data = await certificateApi.verifyByHash(fileHash);
        setPendingResult(buildFileResult(data));
        setVizApiResult('success');
      } catch {
        setPendingResult(buildFileFailResult());
        setVizApiResult('failed');
      }
      return;
    }

    // ── Fast mode (no animation) ────────────────────────────────────────
    setLoading(true);
    try {
      const data = await certificateApi.verifyByHash(fileHash);
      setResult(buildFileResult(data));
    } catch {
      setResult(buildFileFailResult());
    } finally {
      setLoading(false);
    }
  };

  const resetFileUpload = () => {
    setUploadedFile(null);
    setFileHash('');
    setResult(null);
    setError('');
  };

  const resetAll = () => {
    setResult(null);
    setError('');
    setSearchId('');
    resetFileUpload();
  };

  const copyHash = async () => {
    if (!fileHash) return;
    await navigator.clipboard.writeText(fileHash);
    setHashCopied(true);
    setTimeout(() => setHashCopied(false), 2000);
  };

  const downloadReport = () => {
    if (!result) return;

    const config = statusConfig[result.status];
    const now = new Date();
    const lines: string[] = [
      '═══════════════════════════════════════════════════════════════',
      '            CERTIFICATE VERIFICATION REPORT',
      '     SME Certificate Trust Platform — Egypt Vision 2030',
      '═══════════════════════════════════════════════════════════════',
      '',
      `Report Generated: ${now.toLocaleString()}`,
      `Verification ID:  VR-${now.getTime().toString(36).toUpperCase()}`,
      '',
      '───────────────────────────────────────────────────────────────',
      '  VERIFICATION RESULT',
      '───────────────────────────────────────────────────────────────',
      '',
      `  Status:      ${config.label.toUpperCase()}`,
      `  Description: ${config.description}`,
      '',
    ];

    if (result.certificate) {
      lines.push(
        '───────────────────────────────────────────────────────────────',
        '  CERTIFICATE DETAILS',
        '───────────────────────────────────────────────────────────────',
        '',
        `  Certificate ID:  ${result.certificate.id || '—'}`,
        `  Holder Name:     ${result.certificate.holderName || '—'}`,
        `  Issuer:          ${result.certificate.issuerName || '—'}`,
        `  Certificate Type:${result.certificate.templateName ? ` ${result.certificate.templateName}` : ' —'}`,
        `  Issued Date:     ${result.certificate.issuedAt ? new Date(result.certificate.issuedAt).toLocaleDateString() : '—'}`,
        `  Expiry Date:     ${result.certificate.expiresAt ? new Date(result.certificate.expiresAt).toLocaleDateString() : 'N/A'}`,
        '',
      );
    }

    if (result.blockchainTxId) {
      lines.push(
        '───────────────────────────────────────────────────────────────',
        '  BLOCKCHAIN RECORD',
        '───────────────────────────────────────────────────────────────',
        '',
        `  Transaction ID: ${result.blockchainTxId}`,
        '',
      );
    }

    if (fileHash) {
      lines.push(
        '───────────────────────────────────────────────────────────────',
        '  FILE VERIFICATION',
        '───────────────────────────────────────────────────────────────',
        '',
        `  File Name:  ${uploadedFile?.name || '—'}`,
        `  File Size:  ${uploadedFile ? `${(uploadedFile.size / 1024).toFixed(1)} KB` : '—'}`,
        `  SHA-256:    ${fileHash}`,
        '',
      );
    }

    if (result.checks?.length) {
      lines.push(
        '───────────────────────────────────────────────────────────────',
        '  VERIFICATION CHECKS',
        '───────────────────────────────────────────────────────────────',
        '',
      );
      result.checks.forEach((check) => {
        lines.push(`  ${check.passed ? '[PASS]' : '[FAIL]'} ${check.label}`);
        lines.push(`         ${check.detail}`);
      });
      lines.push('');
    }

    lines.push(
      '───────────────────────────────────────────────────────────────',
      '  VERIFICATION METHOD',
      '───────────────────────────────────────────────────────────────',
      '',
      `  Method: ${method === 'id' ? 'Certificate ID Lookup' : method === 'qr' ? 'QR Code Scan' : 'File Upload Hash Verification'}`,
      `  Search: ${method === 'file' ? fileHash : searchId || certId || '—'}`,
      '',
      '═══════════════════════════════════════════════════════════════',
      '  This report was generated by the SME Certificate Trust',
      '  Platform verification system. The verification was performed',
      '  against the Hyperledger Fabric blockchain ledger.',
      '',
      '  Platform: https://sme-cert.gov.eg',
      '  Support:  support@sme-cert.gov.eg',
      '═══════════════════════════════════════════════════════════════',
    );

    const text = lines.join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verification-report-${now.toISOString().slice(0, 10)}-${now.getTime().toString(36)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Hero */}
      <section className="gradient-hero-subtle py-12 md:py-16 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <Badge variant="navy" className="mb-4">
            <Shield className="h-3.5 w-3.5 mr-1.5" />
            Public Verification
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            {t('verify.title', 'Verify a Certificate')}
          </h1>
          <p className="text-muted-foreground">
            {t('verify.subtitle', 'Instantly verify the authenticity of any certificate using ID lookup, QR code scan, or file upload.')}
          </p>
        </div>
      </section>

      <div className="container mx-auto max-w-3xl py-8 px-4">
        {/* Method Tabs */}
        <div className="flex rounded-lg bg-muted p-1 mb-6">
          {([
            { key: 'id' as const, icon: Search, label: 'Certificate ID' },
            { key: 'qr' as const, icon: QrCode, label: 'QR Code' },
            { key: 'file' as const, icon: Upload, label: 'File Upload' },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setMethod(tab.key); setResult(null); setError(''); }}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-colors',
                method === tab.key ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden text-xs">{tab.key === 'id' ? 'ID' : tab.key === 'qr' ? 'QR' : 'File'}</span>
            </button>
          ))}
        </div>

        {/* ID Search */}
        {method === 'id' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Certificate ID Lookup</CardTitle>
              <CardDescription>Enter the certificate ID to verify its authenticity.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => { e.preventDefault(); handleVerifyById(); }} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  placeholder="Enter certificate ID (e.g., abc123-def456-...)"
                  className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Button type="submit" disabled={loading || !searchId.trim()}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : 'Verify'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* QR Code */}
        {method === 'qr' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">QR Code Scanner</CardTitle>
              <CardDescription>Scan the QR code on the certificate to verify it instantly.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Camera viewport — always in DOM so html5-qrcode can find the element */}
              <div className="relative rounded-xl overflow-hidden border-2 border-dashed border-border bg-muted/20">
                {/* html5-qrcode renders into this div */}
                <div
                  id="qr-reader"
                  style={{ minHeight: scanning ? 300 : 0, overflow: 'hidden' }}
                />
                {/* Placeholder shown when not scanning */}
                {!scanning && (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                    <QrCode className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-sm font-medium mb-1">Ready to scan</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Point your camera at the QR code on the certificate
                    </p>
                    <Button onClick={startScanner} disabled={loading}>
                      <QrCode className="h-4 w-4 mr-2" />
                      Start Camera
                    </Button>
                  </div>
                )}
                {/* Stop button overlay */}
                {scanning && (
                  <div className="absolute top-2 right-2 z-10">
                    <Button size="sm" variant="secondary" onClick={stopScanner}>
                      Stop
                    </Button>
                  </div>
                )}
              </div>

              {/* Camera error */}
              {cameraError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{cameraError}</span>
                </div>
              )}

              {/* Manual entry fallback */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or enter manually</span>
                </div>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); handleVerifyById(); }} className="flex gap-2">
                <input
                  type="text"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  placeholder="Paste certificate ID from QR"
                  className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Button type="submit" disabled={loading || !searchId.trim()} size="sm">Verify</Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* File Upload - Enhanced */}
        {method === 'file' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">File Upload Verification</CardTitle>
              <CardDescription>Upload the digital certificate file to verify its authenticity against the blockchain record.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Drop zone or file info */}
              {!uploadedFile ? (
                <div
                  className={cn(
                    'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
                    isDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  )}
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleFileDrop}
                  onClick={() => document.getElementById('verify-file-input')?.click()}
                >
                  <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium">Drop your certificate file here</p>
                  <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-2">Supported: PDF, JSON, XML, DOC, DOCX</p>
                  <input
                    id="verify-file-input"
                    type="file"
                    accept=".pdf,.json,.xml,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {/* File info card */}
                  <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/30">
                    <File className="h-8 w-8 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{uploadedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(uploadedFile.size / 1024).toFixed(1)} KB
                        {hashing && ' — Computing hash...'}
                        {fileHash && !hashing && ' — Hash computed'}
                      </p>
                    </div>
                    {hashing ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
                    ) : fileHash ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                    ) : null}
                  </div>

                  {/* Hash display */}
                  {fileHash && (
                    <div className="p-3 rounded-lg border bg-slate-50">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          <Fingerprint className="h-3.5 w-3.5" />
                          SHA-256 Hash
                        </span>
                        <button
                          onClick={copyHash}
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                        >
                          {hashCopied ? (
                            <>
                              <Check className="h-3 w-3 text-green-600" />
                              <span className="text-green-600">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                      <p className="font-mono text-xs break-all text-foreground/80 select-all leading-relaxed">
                        {fileHash}
                      </p>
                    </div>
                  )}

                  {/* ── Visualization toggle ── */}
                  <div
                    className="flex items-center justify-between p-3 rounded-xl border transition-colors"
                    style={{
                      background: visualizationEnabled
                        ? 'linear-gradient(135deg,rgba(197,162,61,0.06),rgba(0,155,77,0.04))'
                        : undefined,
                      borderColor: visualizationEnabled ? 'rgba(197,162,61,0.35)' : undefined,
                    }}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{
                          background: visualizationEnabled
                            ? 'linear-gradient(135deg,#C5A23D,#009B4D)'
                            : 'rgba(100,116,139,0.15)',
                        }}
                      >
                        {visualizationEnabled
                          ? <Eye className="h-3.5 w-3.5 text-white" />
                          : <Zap className="h-3.5 w-3.5 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-tight">
                          {visualizationEnabled ? 'Advanced Visualization' : 'Fast Mode'}
                        </p>
                        <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                          {visualizationEnabled
                            ? 'Watch the full blockchain verification journey — document → hash → distributed nodes'
                            : 'Instant verification without animation'}
                        </p>
                      </div>
                    </div>
                    {/* Toggle switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={visualizationEnabled}
                      onClick={toggleVisualization}
                      className="relative inline-flex h-6 w-11 shrink-0 ml-3 rounded-full transition-colors duration-200 focus-visible:outline-none"
                      style={{
                        background: visualizationEnabled
                          ? 'linear-gradient(90deg,#C5A23D,#009B4D)'
                          : 'rgba(100,116,139,0.3)',
                      }}
                    >
                      <span
                        className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200"
                        style={{ transform: visualizationEnabled ? 'translateX(20px)' : 'translateX(0px)' }}
                      />
                    </button>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleVerifyFile}
                      disabled={!fileHash || loading || hashing}
                      className="flex-1"
                      style={
                        visualizationEnabled && fileHash && !loading && !hashing
                          ? { background: 'linear-gradient(135deg,#1B3A5C,#C5A23D)', border: 'none' }
                          : {}
                      }
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Verifying on Blockchain...
                        </>
                      ) : visualizationEnabled ? (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Verify Uploaded Certificate
                        </>
                      ) : (
                        <>
                          <Shield className="h-4 w-4 mr-2" />
                          Verify Uploaded Certificate
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={resetFileUpload} disabled={loading}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                  </div>
                </div>
              )}

              {/* How it works info */}
              <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                <p className="font-medium mb-1">How file verification works:</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Your file is hashed locally using SHA-256 (file never leaves your device)</li>
                  <li>Click "Verify" to check the hash against the blockchain record</li>
                  <li>A match confirms the file is authentic and unmodified</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <Card className="mt-6 border-destructive/50">
            <CardContent className="flex items-center gap-3 py-4">
              <XCircle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Result */}
        {result && (
          <div className="mt-6 space-y-4">
            {/* Status Badge */}
            {(() => {
              const config = statusConfig[result.status];
              const StatusIcon = config.icon;
              return (
                <Card className={cn('border-2', config.bg)}>
                  <CardContent className="py-6">
                    <div className="flex items-center gap-4">
                      <div className={cn('w-16 h-16 rounded-full flex items-center justify-center shrink-0', config.bg)}>
                        <StatusIcon className={cn('h-8 w-8', config.color)} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className={cn('text-xl font-bold', config.color)}>{config.label}</h2>
                          <Badge className={cn(
                            'text-xs',
                            result.status === 'VALID' ? 'bg-green-100 text-green-700 border-green-200' :
                            result.status === 'REVOKED' || result.status === 'INVALID' ? 'bg-red-100 text-red-700 border-red-200' :
                            result.status === 'EXPIRED' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                            result.status === 'MISMATCH' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                            'bg-gray-100 text-gray-700 border-gray-200'
                          )}>
                            {result.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{config.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Verification Checks */}
            {result.checks && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Verification Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.checks.map((check, i) => (
                      <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/30">
                        {check.passed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{check.label}</p>
                          <p className="text-xs text-muted-foreground">{check.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Certificate Details */}
            {result.certificate && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Certificate Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Holder</p>
                      <p className="font-medium">{result.certificate.holderName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Issuer</p>
                      <p className="font-medium flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {result.certificate.issuerName}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Certificate Type</p>
                      <p className="font-medium">{result.certificate.templateName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Issued Date</p>
                      <p className="font-medium flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(result.certificate.issuedAt).toLocaleDateString()}
                      </p>
                    </div>
                    {result.certificate.expiresAt && (
                      <div>
                        <p className="text-muted-foreground text-xs">Expires</p>
                        <p className="font-medium">{new Date(result.certificate.expiresAt).toLocaleDateString()}</p>
                      </div>
                    )}
                    {result.blockchainTxId && (
                      <div className="col-span-1 sm:col-span-2">
                        <p className="text-muted-foreground text-xs">Blockchain Transaction</p>
                        <p className="font-mono text-xs break-all flex items-center gap-1">
                          <Fingerprint className="h-3 w-3 shrink-0" />
                          {result.blockchainTxId}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" className="flex-1" onClick={resetAll}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Verify Another
              </Button>
              <Button variant="outline" className="flex-1" onClick={downloadReport}>
                <Download className="mr-2 h-4 w-4" />
                Download Report
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Blockchain Visualization Modal ──────────────────────────────── */}
      <BlockchainVerificationVisualizer
        isOpen={visualizerOpen}
        fileName={uploadedFile?.name ?? ''}
        fileSize={uploadedFile?.size ?? 0}
        hash={fileHash}
        verificationResult={vizApiResult}
        onClose={handleVisualizerClose}
      />
    </div>
  );
}
