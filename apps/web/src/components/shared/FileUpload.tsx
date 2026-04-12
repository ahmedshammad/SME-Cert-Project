import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { computeSHA256 } from '@/lib/hash';
import { Upload, File, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileUploadProps {
  onFileHash: (hash: string, fileName: string) => void;
  accept?: string;
  className?: string;
}

export function FileUpload({ onFileHash, accept, className }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [hashing, setHashing] = useState(false);

  const processFile = useCallback(async (f: File) => {
    setFile(f);
    setHashing(true);
    try {
      const hash = await computeSHA256(f);
      onFileHash(hash, f.name);
    } catch {
      // hash computation failed
    } finally {
      setHashing(false);
    }
  }, [onFileHash]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  }, [processFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  }, [processFile]);

  const clear = () => {
    setFile(null);
  };

  return (
    <div className={cn('space-y-3', className)}>
      {!file ? (
        <div
          className={cn(
            'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
            isDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          )}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-upload-input')?.click()}
        >
          <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium">Drop your certificate file here</p>
          <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
          <input
            id="file-upload-input"
            type="file"
            accept={accept}
            onChange={handleChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/30">
          <File className="h-8 w-8 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024).toFixed(1)} KB
              {hashing && ' — Computing hash...'}
            </p>
          </div>
          {hashing ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <Button variant="ghost" size="icon" onClick={clear}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
