import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  FilePlus, CheckCircle2, Upload, File, X, Loader2,
  Fingerprint, Copy, Check, AlertCircle, ShieldCheck
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { certificateApi } from '@/services/api/certificates';
import { cn } from '@/lib/utils';
import { computeSHA256 } from '@/lib/hash';

type IssuingMode = 'form' | 'document';

export function IssueCertificate() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<IssuingMode>('form');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [holderEmail, setHolderEmail] = useState('');
  const [holderName, setHolderName] = useState('');
  const [customFields, setCustomFields] = useState('');
  const [success, setSuccess] = useState(false);
  const [issuedCertId, setIssuedCertId] = useState('');
  const [pendingPayload, setPendingPayload] = useState<Record<string, unknown> | null>(null);

  // Document upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileHash, setFileHash] = useState('');
  const [hashing, setHashing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [hashCopied, setHashCopied] = useState(false);

  const { data: templates } = useQuery({
    queryKey: ['templates'],
    queryFn: () => certificateApi.getTemplates(),
  });

  const [errorMessage, setErrorMessage] = useState('');

  const issueMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => certificateApi.issueCertificate(payload),
    onSuccess: (data) => {
      setSuccess(true);
      setErrorMessage('');
      setIssuedCertId(data?.id || data?.certificateId || '');
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || error?.message || 'Unknown error';
      setErrorMessage(Array.isArray(msg) ? msg.join(', ') : String(msg));
    },
  });

  const isFormDirty = !!(holderName || holderEmail || customFields || uploadedFile);

  const switchMode = (newMode: IssuingMode) => {
    if (newMode === mode) return;
    if (isFormDirty && !window.confirm('Switching modes will clear the current form. Continue?')) return;
    setMode(newMode);
    setHolderName('');
    setHolderEmail('');
    setCustomFields('');
    clearFile();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    const payload: Record<string, unknown> = {
      templateId: selectedTemplate,
      holderEmail,
      holderName,
    };

    if (mode === 'document' && fileHash) {
      payload.documentHash = fileHash;
      payload.documentName = uploadedFile?.name;
      payload.documentSize = uploadedFile?.size;
    }

    if (customFields.trim()) {
      try {
        payload.data = JSON.parse(customFields);
      } catch {
        payload.data = {};
      }
    }

    setPendingPayload(payload);
  };

  const handleConfirmIssue = () => {
    if (!pendingPayload) return;
    issueMutation.mutate(pendingPayload);
    setPendingPayload(null);
  };

  const processFile = async (f: File) => {
    setUploadedFile(f);
    setHashing(true);
    setFileHash('');
    try {
      const hash = await computeSHA256(f);
      setFileHash(hash);
    } catch {
      // hash failed
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

  const clearFile = () => {
    setUploadedFile(null);
    setFileHash('');
  };

  const copyHash = async () => {
    if (!fileHash) return;
    await navigator.clipboard.writeText(fileHash);
    setHashCopied(true);
    setTimeout(() => setHashCopied(false), 2000);
  };

  const resetForm = () => {
    setSuccess(false);
    setIssuedCertId('');
    setHolderEmail('');
    setHolderName('');
    setCustomFields('');
    setSelectedTemplate('');
    clearFile();
    issueMutation.reset();
  };

  const generateQrData = () => {
    if (!issuedCertId) return '';
    return `${window.location.origin}/verify/${issuedCertId}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('issuer.issue_certificate')}</h1>
        <p className="text-muted-foreground mt-1">Issue a new digital certificate to a holder</p>
      </div>

      {/* Success State */}
      {success && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-green-800">Certificate Issued Successfully</h2>
                <p className="text-sm text-green-700 mt-1">The certificate has been recorded on the blockchain.</p>
              </div>

              {issuedCertId && (
                <div className="w-full max-w-md space-y-3">
                  <div className="p-3 rounded-lg border border-green-200 bg-white">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Certificate ID</p>
                    <p className="font-mono text-sm break-all">{issuedCertId}</p>
                  </div>

                  {/* QR Code */}
                  <div className="p-4 rounded-lg border border-green-200 bg-white text-center">
                    <div className="flex justify-center mb-2">
                      <QRCodeSVG
                        value={generateQrData()}
                        size={160}
                        level="H"
                        includeMargin
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Scan to verify this certificate</p>
                    <p className="text-xs font-mono text-muted-foreground mt-1 break-all">{generateQrData()}</p>
                  </div>
                </div>
              )}

              {fileHash && (
                <div className="w-full max-w-md p-3 rounded-lg border border-green-200 bg-white">
                  <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                    <Fingerprint className="h-3 w-3" />
                    Document Hash (SHA-256)
                  </p>
                  <p className="font-mono text-xs break-all text-foreground/80">{fileHash}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={resetForm}>
                  <FilePlus className="h-4 w-4 mr-2" />
                  Issue Another
                </Button>
                <Button variant="outline" onClick={() => {
                  const qr = generateQrData();
                  if (qr) navigator.clipboard.writeText(qr);
                }}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Verify Link
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!success && (
        <>
          {/* Issuance Confirmation Dialog */}
          {pendingPayload && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="confirm-issue-title">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-5 w-5 text-green-700" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 id="confirm-issue-title" className="text-lg font-bold">Confirm Certificate Issuance</h2>
                    <p className="text-sm text-muted-foreground">This will create a permanent blockchain record.</p>
                  </div>
                </div>
                <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground shrink-0">Holder Name</span>
                    <span className="font-medium text-right">{holderName}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground shrink-0">Holder Email</span>
                    <span className="font-medium text-right break-all">{holderEmail}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground shrink-0">Mode</span>
                    <span className="font-medium text-right">{mode === 'document' ? 'Document Upload' : 'Form Entry'}</span>
                  </div>
                  {mode === 'document' && fileHash && (
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground shrink-0">Document</span>
                      <span className="font-medium text-right truncate max-w-[200px]">{uploadedFile?.name}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 pt-1">
                  <Button variant="outline" className="flex-1" onClick={() => setPendingPayload(null)} disabled={issueMutation.isPending}>
                    Cancel
                  </Button>
                  <Button className="flex-1" onClick={handleConfirmIssue} disabled={issueMutation.isPending}>
                    {issueMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Issuing...</>
                    ) : 'Confirm & Issue'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Mode Tabs */}
          <div className="flex rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => switchMode('form')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-colors',
                mode === 'form' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <FilePlus className="h-4 w-4" aria-hidden="true" />
              Form Entry
            </button>
            <button
              type="button"
              onClick={() => switchMode('document')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-colors',
                mode === 'document' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              Document Upload
            </button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {mode === 'form' ? (
                  <>
                    <FilePlus className="h-5 w-5" />
                    Issue Certificate
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5" />
                    Issue from Document
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {mode === 'form'
                  ? 'Fill in the details to issue a certificate'
                  : 'Upload a document (PDF, DOCX) to generate a certificate with its hash anchored on the blockchain'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Template Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Certificate Template</label>
                  <select
                    required
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="">Select a template...</option>
                    {(templates || []).map((t: { id: string; name: string }) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                {/* Holder Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Holder Name</label>
                    <input
                      required
                      value={holderName}
                      onChange={(e) => setHolderName(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      placeholder="Full name of certificate holder"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Holder Email</label>
                    <input
                      type="email"
                      required
                      value={holderEmail}
                      onChange={(e) => setHolderEmail(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      placeholder="holder@example.com"
                    />
                  </div>
                </div>

                {/* Document Upload Section (Document mode only) */}
                {mode === 'document' && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Certificate Document</label>

                    {!uploadedFile ? (
                      <div
                        className={cn(
                          'border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer',
                          isDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                        )}
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={handleFileDrop}
                        onClick={() => document.getElementById('issue-file-input')?.click()}
                      >
                        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm font-medium">Drop your document here or click to browse</p>
                        <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX supported (max 10MB)</p>
                        <input
                          id="issue-file-input"
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* File info */}
                        <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                          <File className="h-8 w-8 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{uploadedFile.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(uploadedFile.size / 1024).toFixed(1)} KB
                              {hashing && ' — Computing hash...'}
                            </p>
                          </div>
                          {hashing ? (
                            <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
                          ) : (
                            <button type="button" onClick={clearFile} className="p-1 hover:bg-muted rounded">
                              <X className="h-4 w-4 text-muted-foreground" />
                            </button>
                          )}
                        </div>

                        {/* Hash display */}
                        {fileHash && (
                          <div className="p-3 rounded-lg border bg-slate-50">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                <Fingerprint className="h-3.5 w-3.5" />
                                SHA-256 Document Hash
                              </span>
                              <button
                                type="button"
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

                        {/* Document metadata preview */}
                        {fileHash && (
                          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                            <p className="text-xs font-medium text-blue-800 flex items-center gap-1.5 mb-2">
                              <AlertCircle className="h-3.5 w-3.5" />
                              Document Metadata
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-blue-600">File Name:</span>
                                <span className="ml-1 text-blue-900">{uploadedFile.name}</span>
                              </div>
                              <div>
                                <span className="text-blue-600">Size:</span>
                                <span className="ml-1 text-blue-900">{(uploadedFile.size / 1024).toFixed(1)} KB</span>
                              </div>
                              <div>
                                <span className="text-blue-600">Type:</span>
                                <span className="ml-1 text-blue-900">{uploadedFile.type || 'Unknown'}</span>
                              </div>
                              <div>
                                <span className="text-blue-600">Modified:</span>
                                <span className="ml-1 text-blue-900">{new Date(uploadedFile.lastModified).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <p className="text-xs text-blue-700 mt-2">
                              This hash will be anchored on the blockchain, allowing future verification of document authenticity.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Certificate Data (form mode) */}
                {mode === 'form' && (
                  <div className="space-y-2">
                    <label htmlFor="certDataJson" className="text-sm font-medium">Certificate Data (JSON)</label>
                    <textarea
                      id="certDataJson"
                      value={customFields}
                      onChange={(e) => setCustomFields(e.target.value)}
                      placeholder={'{\n  "courseName": "...",\n  "grade": "A",\n  "completionDate": "2024-01-01"\n}'}
                      className="w-full px-3 py-2 border rounded-md text-sm font-mono"
                      rows={4}
                    />
                  </div>
                )}

                {/* Submit */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button
                    type="submit"
                    disabled={issueMutation.isPending || (mode === 'document' && (!fileHash || hashing))}
                    className="flex-1"
                  >
                    {issueMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Issuing Certificate...
                      </>
                    ) : (
                      <>
                        <FilePlus className="h-4 w-4 mr-2" />
                        {mode === 'document' ? 'Issue Certificate with Document' : 'Issue Certificate'}
                      </>
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Clear
                  </Button>
                </div>

                {issueMutation.isError && (
                  <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                    <p className="text-sm font-medium text-destructive flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      Failed to issue certificate
                    </p>
                    {errorMessage && (
                      <p className="text-xs text-destructive/80 mt-1 ml-5.5">{errorMessage}</p>
                    )}
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Info Panel */}
          {mode === 'document' && (
            <Card className="bg-muted/30">
              <CardContent className="py-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">How document-based issuance works:</p>
                <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-1">
                  <li>Upload the certificate document (PDF or DOCX)</li>
                  <li>A SHA-256 hash is computed locally — the file never leaves your device</li>
                  <li>The hash is anchored on the blockchain alongside certificate metadata</li>
                  <li>A QR code and verification link are generated for the holder</li>
                  <li>Anyone can later verify the document by uploading it on the verification page</li>
                </ol>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
