'use client';

import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Upload,
  X,
  FileText,
  FileArchive,
  Image,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

interface FileUploadProps {
  onUpload: (file: File, description?: string) => Promise<boolean>;
  acceptedTypes?: string[];
  maxSizeMB?: number;
  className?: string;
  existingFile?: {
    file_name: string;
    file_size: number;
    file_url: string;
  } | null;
}

function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <FileText className="w-8 h-8 text-red-500" />;
  if (['zip', 'rar', '7z'].includes(ext || '')) return <FileArchive className="w-8 h-8 text-amber-500" />;
  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return <Image className="w-8 h-8 text-blue-500" />;
  return <FileText className="w-8 h-8 text-slate-500" />;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function FileUpload({
  onUpload,
  acceptedTypes = ['.pdf', '.zip', '.jpg', '.jpeg', '.png'],
  maxSizeMB = 10,
  className,
  existingFile,
}: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const validateFile = useCallback(
    (file: File): string | null => {
      if (file.size > maxSizeBytes) {
        return `File size exceeds ${maxSizeMB}MB limit`;
      }
      const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
      if (!acceptedTypes.includes(ext)) {
        return `Invalid file type. Accepted: ${acceptedTypes.join(', ')}`;
      }
      return null;
    },
    [acceptedTypes, maxSizeBytes, maxSizeMB]
  );

  const handleFile = useCallback(
    (file: File) => {
      const error = validateFile(file);
      if (error) {
        toast.error(error);
        return;
      }

      setSelectedFile(file);
      setStatus('idle');
      setProgress(0);

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setPreviewUrl(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setPreviewUrl(null);
      }
    },
    [validateFile]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
      }
    },
    [handleFile]
  );

  const handleUpload = async () => {
    if (!selectedFile) return;

    setStatus('uploading');
    setProgress(10);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 15, 90));
      }, 200);

      const success = await onUpload(selectedFile, description);

      clearInterval(progressInterval);

      if (success) {
        setProgress(100);
        setStatus('success');
        toast.success('File uploaded successfully');
      } else {
        setStatus('error');
        setProgress(0);
        toast.error('Upload failed. Please try again.');
      }
    } catch {
      setStatus('error');
      setProgress(0);
      toast.error('Upload failed. Please try again.');
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setStatus('idle');
    setProgress(0);
    setDescription('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const acceptedTypesString = acceptedTypes.join(',');

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop zone */}
      {!selectedFile && !existingFile && (
        <div
          className={cn(
            'relative border-2 border-dashed rounded-lg p-8 transition-all duration-200 text-center cursor-pointer',
            dragActive
              ? 'border-primary bg-primary/5'
              : 'border-slate-300 hover:border-slate-400 bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700'
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept={acceptedTypesString}
            onChange={handleInputChange}
            className="hidden"
          />
          <Upload className="w-10 h-10 mx-auto text-slate-400 mb-3" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {acceptedTypes.join(', ').toUpperCase()} up to {maxSizeMB}MB
          </p>
        </div>
      )}

      {/* Existing file display */}
      {existingFile && !selectedFile && (
        <div className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            {getFileIcon(existingFile.file_name)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                {existingFile.file_name}
              </p>
              <p className="text-xs text-slate-500">
                {formatFileSize(existingFile.file_size)} - Already uploaded
              </p>
            </div>
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => {
              setStatus('idle');
              if (inputRef.current) {
                inputRef.current.click();
              }
            }}
          >
            Replace file
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept={acceptedTypesString}
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      )}

      {/* Selected file display */}
      {selectedFile && (
        <div className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-800/50 space-y-3">
          <div className="flex items-start gap-3">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="w-16 h-16 object-cover rounded-md border"
              />
            ) : (
              getFileIcon(selectedFile.name)
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-slate-500">{formatFileSize(selectedFile.size)}</p>
            </div>
            {status !== 'uploading' && (
              <button
                onClick={handleClear}
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Description textarea */}
          <textarea
            placeholder="Add a brief description of your submission (optional)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full text-sm border rounded-md px-3 py-2 bg-white dark:bg-slate-900 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            rows={2}
          />

          {/* Upload progress */}
          {status === 'uploading' && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-slate-500">Uploading... {progress}%</p>
            </div>
          )}

          {/* Success state */}
          {status === 'success' && (
            <div className="flex items-center gap-2 text-emerald-600 text-sm">
              <CheckCircle className="w-4 h-4" />
              Upload complete!
            </div>
          )}

          {/* Error state */}
          {status === 'error' && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              Upload failed. Please try again.
            </div>
          )}

          {/* Upload button */}
          {status !== 'uploading' && status !== 'success' && (
            <Button onClick={handleUpload} size="sm" className="w-full">
              <Upload className="w-4 h-4 mr-2" />
              Upload File
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default FileUpload;
