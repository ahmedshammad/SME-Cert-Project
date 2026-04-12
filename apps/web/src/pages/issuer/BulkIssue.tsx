import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Upload, File, X, Loader2, CheckCircle2, XCircle,
  Fingerprint, Files, AlertCircle, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { certificateApi } from '@/services/api/certificates';
import { cn } from '@/lib/utils';
import { computeSHA256 } from '@/lib/hash';

type FileEntry = {
  id: string;
  file: File;
  hash: string;
  holderName: string;
  holderEmail: string;
  status: 'pending' | 'hashing' | 'ready' | 'issuing' | 'success' | 'error';
  error?: string;
  certId?: string;
};

export function BulkIssue() {
  const { t } = useTranslation();
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [issuingAll, setIssuingAll] = useState(false);

  const { data: templates } = useQuery({
    queryKey: ['templates'],
    queryFn: () => certificateApi.getTemplates(),
  });

  const addFiles = useCallback(async (fileList: FileList) => {
    const newEntries: FileEntry[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const id = `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`;
      const entry: FileEntry = {
        id,
        file,
        hash: '',
        holderName: '',
        holderEmail: '',
        status: 'hashing',
      };
      newEntries.push(entry);
    }

    setFiles(prev => [...prev, ...newEntries]);

    // Hash all files in parallel
    for (const entry of newEntries) {
      try {
        const hash = await computeSHA256(entry.file);
        setFiles(prev => prev.map(f =>
          f.id === entry.id ? { ...f, hash, status: 'ready' } : f
        ));
      } catch {
        setFiles(prev => prev.map(f =>
          f.id === entry.id ? { ...f, status: 'error', error: 'Hash computation failed' } : f
        ));
      }
    }
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
    e.target.value = '';
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateField = (id: string, field: 'holderName' | 'holderEmail', value: string) => {
    setFiles(prev => prev.map(f =>
      f.id === id ? { ...f, [field]: value } : f
    ));
  };

  const clearAll = () => {
    setFiles([]);
  };

  const readyFiles = files.filter(f => f.status === 'ready' && f.holderName && f.holderEmail);
  const issuedCount = files.filter(f => f.status === 'success').length;
  const errorCount = files.filter(f => f.status === 'error').length;
  const canIssue = readyFiles.length > 0 && selectedTemplate && !issuingAll;

  const handleBulkIssue = async () => {
    if (!canIssue) return;
    setIssuingAll(true);

    for (const entry of readyFiles) {
      setFiles(prev => prev.map(f =>
        f.id === entry.id ? { ...f, status: 'issuing' } : f
      ));

      try {
        const result = await certificateApi.issueCertificate({
          templateId: selectedTemplate,
          holderName: entry.holderName,
          holderEmail: entry.holderEmail,
          documentHash: entry.hash,
          documentName: entry.file.name,
          documentSize: entry.file.size,
          data: {},
        });

        setFiles(prev => prev.map(f =>
          f.id === entry.id ? { ...f, status: 'success', certId: result?.id || result?.certificateId } : f
        ));
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || 'Failed to issue';
        setFiles(prev => prev.map(f =>
          f.id === entry.id ? { ...f, status: 'error', error: Array.isArray(msg) ? msg.join(', ') : String(msg) } : f
        ));
      }
    }

    setIssuingAll(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Bulk Certificate Issuance</h1>
        <p className="text-muted-foreground mt-1">Upload multiple documents to issue certificates in batch</p>
      </div>

      {/* Template Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Step 1: Select Template</CardTitle>
          <CardDescription>Choose the certificate template for all documents in this batch</CardDescription>
        </CardHeader>
        <CardContent>
          <select
            required
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="w-full sm:w-80 px-3 py-2 border rounded-md text-sm"
          >
            <option value="">Select a template...</option>
            {(templates || []).map((t: { id: string; name: string }) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Step 2: Upload Documents</CardTitle>
          <CardDescription>Upload multiple certificate documents. Each will be hashed and anchored on the blockchain.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drop zone */}
          <div
            className={cn(
              'border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer',
              isDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('bulk-file-input')?.click()}
          >
            <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium">Drop multiple files here or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX supported — select multiple files at once</p>
            <input
              id="bulk-file-input"
              type="file"
              accept=".pdf,.doc,.docx"
              multiple
              onChange={handleFileInput}
              className="hidden"
            />
          </div>

          {/* Summary badges */}
          {files.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs">
                <Files className="h-3 w-3 mr-1" />
                {files.length} file{files.length !== 1 ? 's' : ''}
              </Badge>
              {readyFiles.length > 0 && (
                <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-200">
                  {readyFiles.length} ready
                </Badge>
              )}
              {issuedCount > 0 && (
                <Badge className="text-xs bg-green-100 text-green-700 border-green-200">
                  {issuedCount} issued
                </Badge>
              )}
              {errorCount > 0 && (
                <Badge className="text-xs bg-red-100 text-red-700 border-red-200">
                  {errorCount} failed
                </Badge>
              )}
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground ml-auto" onClick={clearAll}>
                <Trash2 className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* File list with field mapping */}
      {files.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Step 3: Map Holder Information</CardTitle>
            <CardDescription>Enter the holder name and email for each document</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {files.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    'p-3 rounded-lg border transition-colors',
                    entry.status === 'success' ? 'bg-green-50 border-green-200' :
                    entry.status === 'error' ? 'bg-red-50 border-red-200' :
                    entry.status === 'issuing' ? 'bg-blue-50 border-blue-200' :
                    'bg-white'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Status icon */}
                    <div className="mt-1 shrink-0">
                      {entry.status === 'hashing' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      {entry.status === 'ready' && <File className="h-4 w-4 text-primary" />}
                      {entry.status === 'issuing' && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
                      {entry.status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                      {entry.status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                      {entry.status === 'pending' && <File className="h-4 w-4 text-muted-foreground" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{entry.file.name}</p>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {(entry.file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>

                      {entry.hash && (
                        <p className="font-mono text-[10px] text-muted-foreground truncate flex items-center gap-1">
                          <Fingerprint className="h-3 w-3 shrink-0" />
                          {entry.hash.substring(0, 32)}...
                        </p>
                      )}

                      {entry.status !== 'success' && entry.status !== 'issuing' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            value={entry.holderName}
                            onChange={(e) => updateField(entry.id, 'holderName', e.target.value)}
                            placeholder="Holder name"
                            className="px-2 py-1.5 border rounded text-xs w-full"
                          />
                          <input
                            type="email"
                            value={entry.holderEmail}
                            onChange={(e) => updateField(entry.id, 'holderEmail', e.target.value)}
                            placeholder="Holder email"
                            className="px-2 py-1.5 border rounded text-xs w-full"
                          />
                        </div>
                      )}

                      {entry.status === 'success' && entry.certId && (
                        <p className="text-xs text-green-700">
                          Certificate ID: <span className="font-mono">{entry.certId}</span>
                        </p>
                      )}

                      {entry.status === 'error' && entry.error && (
                        <p className="text-xs text-red-600">{entry.error}</p>
                      )}
                    </div>

                    {/* Remove button */}
                    {entry.status !== 'issuing' && entry.status !== 'success' && (
                      <button
                        onClick={() => removeFile(entry.id)}
                        className="p-1 hover:bg-muted rounded shrink-0"
                      >
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Bulk Issue Button */}
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <Button
                onClick={handleBulkIssue}
                disabled={!canIssue}
                className="flex-1"
              >
                {issuingAll ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Issuing {readyFiles.length} Certificate{readyFiles.length !== 1 ? 's' : ''}...
                  </>
                ) : (
                  <>
                    <Files className="h-4 w-4 mr-2" />
                    Issue {readyFiles.length} Certificate{readyFiles.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>

            {!selectedTemplate && files.length > 0 && (
              <div className="mt-3 flex items-center gap-2 text-xs text-amber-600">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Please select a template above before issuing
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">How bulk issuance works:</p>
          <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-1">
            <li>Select a certificate template for the batch</li>
            <li>Upload multiple documents (PDF/DOCX) at once</li>
            <li>Each file is hashed locally using SHA-256</li>
            <li>Enter holder name and email for each document</li>
            <li>Click "Issue" to create all certificates in sequence, each anchored on the blockchain</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
