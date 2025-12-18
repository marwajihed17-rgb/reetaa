'use client';

import { useState, useRef, useCallback, memo, useMemo } from 'react';
import { Attachment } from '@/types';
import { formatFileSize, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '@/lib/file-handling';

interface ChatInputProps {
  onSend: (message: string, attachments: Attachment[]) => Promise<void>;
  disabled?: boolean;
}

interface PendingFile {
  file: File;
  uploading: boolean;
  uploaded: boolean;
  attachment?: Attachment;
  error?: string;
}

const ACCEPTED_FILE_TYPES = Object.keys(ALLOWED_MIME_TYPES).join(',');

// Loading spinner
const Spinner = memo(() => (
  <svg className="animate-spin h-4 w-4 text-[#4A90F5]" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
));
Spinner.displayName = 'Spinner';

// File preview component
const FilePreview = memo(({ 
  file, 
  onRemove, 
  onRetry 
}: { 
  file: PendingFile; 
  onRemove: () => void;
  onRetry: () => void;
}) => {
  const fileSize = useMemo(() => formatFileSize(file.file.size), [file.file.size]);
  
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-[#1a1f2e] border border-[#2a3144] group">
      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      </svg>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate max-w-[150px]">
          {file.file.name}
        </p>
        <p className="text-xs text-gray-400">{fileSize}</p>
      </div>
      
      {file.uploading && <Spinner />}
      
      {file.uploaded && (
        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )}
      
      {file.error && (
        <button onClick={onRetry} className="text-red-400 hover:text-red-300 text-xs underline">
          Retry
        </button>
      )}
      
      <button
        onClick={onRemove}
        className="p-1 rounded hover:bg-[#242938] text-gray-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
});
FilePreview.displayName = 'FilePreview';

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    const urlResponse = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        size: file.size,
      }),
    });

    if (!urlResponse.ok) {
      const errorData = await urlResponse.json();
      throw new Error(errorData.error || 'Failed to get upload URL');
    }

    const { uploadUrl, publicUrl, sanitizedFilename } = await urlResponse.json();

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload file');
    }

    return {
      name: sanitizedFilename || file.name,
      url: publicUrl,
      type: file.type,
      size: file.size,
    };
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setError(null);
    
    const validFiles: File[] = [];
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`File "${file.name}" exceeds maximum size of ${formatFileSize(MAX_FILE_SIZE)}`);
        continue;
      }
      if (!Object.keys(ALLOWED_MIME_TYPES).includes(file.type)) {
        setError(`File type "${file.type}" is not supported`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const newPendingFiles: PendingFile[] = validFiles.map((file) => ({
      file,
      uploading: true,
      uploaded: false,
    }));

    const startIndex = pendingFiles.length;
    setPendingFiles((prev) => [...prev, ...newPendingFiles]);
    setUploading(true);

    await Promise.all(
      validFiles.map(async (file, i) => {
        const pendingIndex = startIndex + i;
        try {
          const attachment = await uploadFile(file);
          setPendingFiles((prev) =>
            prev.map((pf, idx) =>
              idx === pendingIndex
                ? { ...pf, uploading: false, uploaded: true, attachment }
                : pf
            )
          );
        } catch (uploadError) {
          const errorMessage = uploadError instanceof Error ? uploadError.message : 'Upload failed';
          setPendingFiles((prev) =>
            prev.map((pf, idx) =>
              idx === pendingIndex
                ? { ...pf, uploading: false, error: errorMessage }
                : pf
            )
          );
        }
      })
    );

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [pendingFiles.length, uploadFile]);

  const removeFile = useCallback((index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
    setError(null);
  }, []);

  const retryUpload = useCallback(async (index: number) => {
    const pendingFile = pendingFiles[index];
    if (!pendingFile || pendingFile.uploaded) return;

    setPendingFiles((prev) =>
      prev.map((pf, idx) =>
        idx === index ? { ...pf, uploading: true, error: undefined } : pf
      )
    );

    try {
      const attachment = await uploadFile(pendingFile.file);
      setPendingFiles((prev) =>
        prev.map((pf, idx) =>
          idx === index ? { ...pf, uploading: false, uploaded: true, attachment } : pf
        )
      );
    } catch (uploadError) {
      const errorMessage = uploadError instanceof Error ? uploadError.message : 'Upload failed';
      setPendingFiles((prev) =>
        prev.map((pf, idx) =>
          idx === index ? { ...pf, uploading: false, error: errorMessage } : pf
        )
      );
    }
  }, [pendingFiles, uploadFile]);

  const handleSend = useCallback(async () => {
    const trimmedMessage = message.trim();
    const uploadedAttachments = pendingFiles
      .filter((pf) => pf.uploaded && pf.attachment)
      .map((pf) => pf.attachment!);

    if (!trimmedMessage && uploadedAttachments.length === 0) return;
    if (disabled || uploading) return;

    if (pendingFiles.some((pf) => pf.uploading)) {
      setError('Please wait for files to finish uploading');
      return;
    }

    if (pendingFiles.some((pf) => pf.error)) {
      setError('Remove or retry failed uploads before sending');
      return;
    }

    setMessage('');
    setPendingFiles([]);
    setError(null);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    await onSend(trimmedMessage, uploadedAttachments);
  }, [message, pendingFiles, disabled, uploading, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
  }, []);

  const hasContent = message.trim() || pendingFiles.some((pf) => pf.uploaded);
  const isDisabled = disabled || uploading;

  return (
    <div className="border-t border-[#2a3144]/50 bg-[#0d1117]/80 backdrop-blur-xl">
      <div className="max-w-4xl mx-auto p-4">
        {error && (
          <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        
        {pendingFiles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {pendingFiles.map((pf, index) => (
              <FilePreview
                key={index}
                file={pf}
                onRemove={() => removeFile(index)}
                onRetry={() => retryUpload(index)}
              />
            ))}
          </div>
        )}

        <div className="flex items-end gap-3">
          {/* Attachment button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isDisabled}
            className="flex-shrink-0 p-3 rounded-xl text-gray-400 hover:text-white hover:bg-[#1a1f2e] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Attach files"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_FILE_TYPES}
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Text input */}
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              disabled={isDisabled}
              rows={1}
              className="w-full px-4 py-3 bg-[#1a1f2e]/80 border border-[#2a3144] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#4A90F5]/50 focus:border-[#4A90F5] transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ minHeight: '48px', maxHeight: '150px' }}
            />
          </div>

          {/* Send button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={isDisabled || !hasContent}
            className={`
              flex-shrink-0 p-3 rounded-xl transition-all
              ${hasContent && !isDisabled
                ? 'bg-gradient-to-r from-[#4A90F5] to-[#C74AFF] text-white shadow-lg shadow-[#4A90F5]/25 hover:opacity-90 active:scale-95'
                : 'bg-[#1a1f2e] text-gray-500 cursor-not-allowed'
              }
            `}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3 21l18-9-18-9 3 9zm0 0l9 0" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
