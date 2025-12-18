/**
 * URL Processing Module
 * Handles URL detection, transformation, and Google Drive special handling
 */

// Robust URL pattern matching
const URL_PATTERN = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;

// Google Drive URL patterns
const GOOGLE_DRIVE_PATTERNS = {
  file: /https?:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i,
  open: /https?:\/\/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/i,
  view: /https?:\/\/docs\.google\.com\/(?:document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/i,
  export: /https?:\/\/drive\.google\.com\/uc\?(?:.*&)?id=([a-zA-Z0-9_-]+)/i,
};

export interface ProcessedUrl {
  original: string;
  display: string;
  href: string;
  isGoogleDrive: boolean;
  fileId?: string;
}

export interface ProcessedMessage {
  text: string;
  urls: ProcessedUrl[];
}

/**
 * Extract Google Drive file ID from various URL formats
 */
export function extractGoogleDriveFileId(url: string): string | null {
  for (const [type, pattern] of Object.entries(GOOGLE_DRIVE_PATTERNS)) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  // Try to extract from query parameter
  try {
    const urlObj = new URL(url);
    const id = urlObj.searchParams.get('id');
    if (id) return id;
  } catch (e) {
    // Invalid URL
  }
  
  return null;
}

/**
 * Convert Google Drive URL to preview/embed URL
 */
export function convertToGoogleDrivePreview(url: string): string {
  const fileId = extractGoogleDriveFileId(url);
  
  if (!fileId) {
    console.warn('[URL Processing] Unrecognized Google Drive URL format:', url);
    return url;
  }
  
  // Return a preview-friendly URL
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

/**
 * Check if URL is a Google Drive link
 */
export function isGoogleDriveUrl(url: string): boolean {
  return url.includes('drive.google.com') || url.includes('docs.google.com');
}

/**
 * Validate if a string is a valid URL
 */
export function isValidUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Process a single URL and return processed URL object
 */
export function processUrl(url: string): ProcessedUrl {
  if (!isValidUrl(url)) {
    console.warn('[URL Processing] Invalid URL detected:', url);
    return {
      original: url,
      display: '[Link]',
      href: url,
      isGoogleDrive: false,
    };
  }
  
  const isGDrive = isGoogleDriveUrl(url);
  let href = url;
  let fileId: string | undefined;
  
  if (isGDrive) {
    fileId = extractGoogleDriveFileId(url) || undefined;
    href = convertToGoogleDrivePreview(url);
  }
  
  return {
    original: url,
    display: '[Link]',
    href,
    isGoogleDrive: isGDrive,
    fileId,
  };
}

/**
 * Process message text and extract/transform all URLs
 * Returns the processed text with URL placeholders and URL data
 */
export function processMessageUrls(message: string): ProcessedMessage {
  const urls: ProcessedUrl[] = [];
  const matches = message.match(URL_PATTERN) || [];
  
  // Process each unique URL
  const uniqueUrls = Array.from(new Set(matches));
  
  uniqueUrls.forEach((url, index) => {
    const processed = processUrl(url);
    urls.push(processed);
  });
  
  return {
    text: message,
    urls,
  };
}

/**
 * Convert message text to React-compatible segments with clickable links
 * This is used by the ChatMessage component
 */
export interface MessageSegment {
  type: 'text' | 'link';
  content: string;
  href?: string;
}

export function parseMessageToSegments(message: string): MessageSegment[] {
  const segments: MessageSegment[] = [];
  let lastIndex = 0;
  
  // Reset regex
  const urlRegex = new RegExp(URL_PATTERN.source, 'gi');
  let match;
  
  while ((match = urlRegex.exec(message)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: message.slice(lastIndex, match.index),
      });
    }
    
    // Process the URL
    const url = match[0];
    const processed = processUrl(url);
    
    segments.push({
      type: 'link',
      content: processed.display,
      href: processed.href,
    });
    
    lastIndex = match.index + url.length;
  }
  
  // Add remaining text
  if (lastIndex < message.length) {
    segments.push({
      type: 'text',
      content: message.slice(lastIndex),
    });
  }
  
  // If no URLs found, return the whole message as text
  if (segments.length === 0) {
    segments.push({
      type: 'text',
      content: message,
    });
  }
  
  return segments;
}
