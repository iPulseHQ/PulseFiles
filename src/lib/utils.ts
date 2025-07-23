import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// HTML escape function to prevent XSS
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Validate URL to prevent open redirect attacks
export function isValidRedirectUrl(url: string, allowedDomains: string[] = []): boolean {
  try {
    const parsed = new URL(url);
    
    // Only allow http/https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    
    // If allowed domains specified, check against them
    if (allowedDomains.length > 0) {
      return allowedDomains.some(domain => 
        parsed.hostname === domain || 
        parsed.hostname.endsWith('.' + domain)
      );
    }
    
    return true;
  } catch {
    return false;
  }
}

// Generate Content Security Policy header (disabled - using next.config.js instead)
export function generateCSPHeader(nonce?: string): string {
  // CSP is now configured in next.config.js to avoid conflicts
  return "";
}

// Security headers helper
export function getSecurityHeaders(nonce?: string): Record<string, string> {
  const headers: Record<string, string> = {};
  
  if (process.env.ENABLE_CSP === 'true') {
    headers['Content-Security-Policy'] = generateCSPHeader(nonce);
  }
  
  if (process.env.ENABLE_HSTS === 'true') {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  }
  
  if (process.env.ENABLE_SECURITY_HEADERS === 'true') {
    Object.assign(headers, {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), location=(), payment=()'
    });
  }
  
  return headers;
}

// Validate file signature (magic bytes) against MIME type
export function validateFileSignature(buffer: ArrayBuffer, mimeType: string): boolean {
  const bytes = new Uint8Array(buffer.slice(0, 16));
  
  // Common file signatures
  const signatures: Record<string, number[][]> = {
    'image/jpeg': [[0xFF, 0xD8, 0xFF]],
    'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
    'image/gif': [[0x47, 0x49, 0x46, 0x38], [0x47, 0x49, 0x46, 0x39]],
    'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
    'application/zip': [[0x50, 0x4B, 0x03, 0x04], [0x50, 0x4B, 0x05, 0x06], [0x50, 0x4B, 0x07, 0x08]],
    'image/webp': [[0x52, 0x49, 0x46, 0x46]]
  };
  
  const expectedSignatures = signatures[mimeType];
  if (!expectedSignatures) {
    // If we don't have a signature for this type, allow it (but log)
    console.log(`No signature validation available for ${mimeType}`);
    return true;
  }
  
  return expectedSignatures.some(signature => 
    signature.every((byte, index) => bytes[index] === byte)
  );
}

// Generate secure random string
export function generateSecureRandomString(length: number = 32): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  } else {
    // Fallback for Node.js
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require('crypto');
    return crypto.randomBytes(length).toString('hex');
  }
}
