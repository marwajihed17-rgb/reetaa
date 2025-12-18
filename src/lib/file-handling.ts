/**
 * File Handling Module
 * Handles binary file validation, processing, and security
 */

// Allowed MIME types
export const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  // Documents
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
  
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'],
  
  // Archives
  'application/zip': ['.zip'],
  'application/x-rar-compressed': ['.rar'],
  'application/x-7z-compressed': ['.7z'],
  
  // Other
  'application/json': ['.json'],
  'application/xml': ['.xml'],
  'text/xml': ['.xml'],
};

// Maximum file size (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Dangerous file extensions to block
const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.js', '.jar',
  '.msi', '.dll', '.scr', '.com', '.pif', '.app', '.dmg',
];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedName?: string;
  mimeType?: string;
  size?: number;
}

export interface FileMetadata {
  name: string;
  type: string;
  size: number;
  extension: string;
  isPreviewable: boolean;
  previewType?: 'image' | 'pdf' | 'none';
}

/**
 * Validate file MIME type
 */
export function isAllowedMimeType(mimeType: string): boolean {
  return Object.keys(ALLOWED_MIME_TYPES).includes(mimeType.toLowerCase());
}

/**
 * Check if file extension is blocked
 */
export function isBlockedExtension(filename: string): boolean {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  return BLOCKED_EXTENSIONS.includes(ext);
}

/**
 * Sanitize filename to prevent path traversal and other attacks
 */
export function sanitizeFilename(filename: string): string {
  // Remove path components
  let sanitized = filename.replace(/^.*[\\/]/, '');
  
  // Remove potentially dangerous characters
  sanitized = sanitized.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
  
  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.slice(sanitized.lastIndexOf('.'));
    const name = sanitized.slice(0, sanitized.lastIndexOf('.'));
    sanitized = name.slice(0, 255 - ext.length) + ext;
  }
  
  return sanitized;
}

/**
 * Validate a file for upload
 */
export function validateFile(
  filename: string,
  mimeType: string,
  size: number
): FileValidationResult {
  // Check file size
  if (size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }
  
  // Check for blocked extensions
  if (isBlockedExtension(filename)) {
    return {
      valid: false,
      error: 'This file type is not allowed for security reasons',
    };
  }
  
  // Check MIME type
  if (!isAllowedMimeType(mimeType)) {
    return {
      valid: false,
      error: `File type "${mimeType}" is not supported`,
    };
  }
  
  // Sanitize filename
  const sanitizedName = sanitizeFilename(filename);
  
  return {
    valid: true,
    sanitizedName,
    mimeType,
    size,
  };
}

/**
 * Extract file metadata
 */
export function extractFileMetadata(
  filename: string,
  mimeType: string,
  size: number
): FileMetadata {
  const extension = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  
  // Determine if file is previewable
  let isPreviewable = false;
  let previewType: 'image' | 'pdf' | 'none' = 'none';
  
  if (mimeType.startsWith('image/')) {
    isPreviewable = true;
    previewType = 'image';
  } else if (mimeType === 'application/pdf') {
    isPreviewable = true;
    previewType = 'pdf';
  }
  
  return {
    name: sanitizeFilename(filename),
    type: mimeType,
    size,
    extension,
    isPreviewable,
    previewType,
  };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file icon based on MIME type
 */
export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.includes('word')) return '📝';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📽️';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return '📦';
  return '📎';
}

/**
 * Check if file can be previewed inline
 */
export function canPreviewInline(mimeType: string): boolean {
  return (
    mimeType.startsWith('image/') ||
    mimeType === 'application/pdf'
  );
}

/**
 * Generate a secure download URL with authentication token
 */
export function generateSecureDownloadUrl(
  baseUrl: string,
  fileId: string,
  token?: string
): string {
  const url = new URL(`${baseUrl}/api/files/${fileId}`);
  if (token) {
    url.searchParams.set('token', token);
  }
  return url.toString();
}
