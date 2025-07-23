import { randomBytes, createCipheriv, createDecipheriv, scryptSync, createHash } from 'crypto';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { Redis } from 'ioredis';

// Generate cryptographically secure share ID (64 characters long)
export function generateSecureShareId(): string {
  // Use nanoid with custom alphabet for URL-safe characters
  return nanoid(64);
}

// Generate secure token using crypto.randomBytes
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

// Validate file type against allowed types (extensive list for maximum compatibility)
export const ALLOWED_FILE_TYPES = [
  // Images
  'image/jpeg',
  'image/jpg',
  'image/png', 
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  
  // Documents
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/rtf',
  'text/rtf',
  
  // Microsoft Office
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  
  // Archives & Compressed
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'application/gzip',
  'application/x-gzip',
  'application/x-tar',
  'application/x-compressed',
  'application/x-archive',
  
  // Executables & Installers
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-msi',
  'application/x-ms-installer',
  'application/vnd.microsoft.portable-executable',
  'application/x-executable',
  'application/x-deb',
  'application/x-rpm',
  'application/x-apple-diskimage',
  'application/x-debian-package',
  
  // Audio
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/m4a',
  'audio/flac',
  'audio/aac',
  'audio/x-wav',
  'audio/x-ms-wma',
  
  // Video
  'video/mp4',
  'video/mpeg',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  'video/x-flv',
  'video/x-ms-wmv',
  'video/3gpp',
  'video/x-matroska',
  
  // Code & Development Files
  'text/javascript',
  'application/javascript',
  'application/json',
  'text/html',
  'text/css',
  'application/xml',
  'text/xml',
  'text/x-python',
  'text/x-java-source',
  'text/x-c',
  'text/x-c++',
  'text/x-csharp',
  'text/x-php',
  'text/x-ruby',
  'text/x-go',
  'text/x-rust',
  'text/x-sql',
  'text/x-yaml',
  'application/x-yaml',
  'text/markdown',
  
  // Fonts
  'font/ttf',
  'font/otf',
  'font/woff',
  'font/woff2',
  'application/font-woff',
  'application/font-woff2',
  'application/x-font-ttf',
  'application/x-font-otf',
  
  // Other Common Types
  'application/octet-stream', // Generic binary - allows anything
  'application/x-binary',
  'application/binary',
  'text/x-log',
  'application/x-sqlite3',
  'application/vnd.sqlite3',
  'application/x-iso9660-image',
  'application/x-cd-image',
  
  // Specific for Go, Rust, etc
  'application/x-go-binary',
  'application/x-executable-file',
  'application/x-sharedlib',
  
  // macOS specific
  'application/x-apple-diskimage',
  'application/x-bzip2',
  'application/x-xz',
  
  // Generic fallbacks
  'application/unknown',
  'text/unknown'
];

// Additional allowed file extensions as fallback (SECURITY: Be careful with executables)
export const ALLOWED_FILE_EXTENSIONS = [
  // Executables & Installers (CAUTION: These can be dangerous)
  '.exe', '.msi', '.dmg', '.pkg', '.deb', '.rpm', '.appimage',
  '.run', '.bin', '.app', '.apk', '.ipa',
  
  // Archives
  '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.tar.gz', '.tar.bz2', '.tar.xz',
  
  // Images
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff', '.ico',
  
  // Documents
  '.pdf', '.txt', '.rtf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.odt', '.ods', '.odp', '.csv',
  
  // Audio/Video
  '.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.wma',
  '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.3gp',
  
  // Code files
  '.js', '.ts', '.jsx', '.tsx', '.json', '.html', '.css', '.scss', '.less',
  '.py', '.java', '.c', '.cpp', '.cs', '.php', '.rb', '.go', '.rs', '.sql',
  '.yml', '.yaml', '.xml', '.md', '.sh', '.bat', '.ps1',
  
  // Fonts
  '.ttf', '.otf', '.woff', '.woff2', '.eot',
  
  // Other
  '.iso', '.img', '.vdi', '.vmdk', '.log', '.db', '.sqlite', '.sqlite3'
];

export function isAllowedFileType(mimeType: string, fileName?: string): boolean {
  // Block dangerous MIME types
  const dangerousMimeTypes = [
    'application/x-executable',
    'application/x-msdownload',
    'application/x-msdos-program'
  ];
  
  // Block dangerous extensions
  const dangerousExtensions = ['.exe', '.scr', '.bat', '.cmd', '.com', '.pif', '.vbs', '.js'];
  
  if (fileName) {
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    if (dangerousExtensions.includes(extension)) {
      console.warn(`Blocked dangerous file extension: ${extension} for file: ${fileName}`);
      return false;
    }
  }
  
  if (dangerousMimeTypes.includes(mimeType)) {
    console.warn(`Blocked dangerous MIME type: ${mimeType}`);
    return false;
  }
  
  // First check MIME type
  if (ALLOWED_FILE_TYPES.includes(mimeType)) {
    return true;
  }
  
  // If MIME type check fails, check file extension as fallback
  if (fileName) {
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    if (ALLOWED_FILE_EXTENSIONS.includes(extension)) {
      return true;
    }
  }
  
  // Special case for application/octet-stream (generic binary)
  // Allow if it has a recognized extension
  if (mimeType === 'application/octet-stream' && fileName) {
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    return ALLOWED_FILE_EXTENSIONS.includes(extension);
  }
  
  return false;
}

// Validate file size (configurable, default 10GB)
export const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || (10 * 1024 * 1024 * 1024).toString());

export function isValidFileSize(size: number): boolean {
  return size > 0 && size <= MAX_FILE_SIZE;
}

// Sanitize filename with enhanced security
export function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts
  let sanitized = filename.replace(/\.\./g, '').replace(/[\/\\]/g, '');
  
  // Remove potentially dangerous characters
  sanitized = sanitized
    .replace(/[<>:"|?*\x00-\x1f]/g, '_') // Windows reserved chars + control chars
    .replace(/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, '_reserved_') // Windows reserved names
    .replace(/[^a-zA-Z0-9._\-\s]/g, '_') // Allow spaces but replace other special chars
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_{2,}/g, '_') // Collapse multiple underscores
    .replace(/^[._]|[._]$/g, '') // Remove leading/trailing dots and underscores
    .substring(0, 200); // Shorter limit for safety
    
  // Ensure filename is not empty after sanitization
  if (!sanitized || sanitized.length === 0) {
    sanitized = 'file_' + Date.now();
  }
  
  return sanitized;
}

// Configurable expiration options
export const EXPIRATION_OPTIONS = {
  '1hour': { label: '1 Hour', hours: 1 },
  '6hours': { label: '6 Hours', hours: 6 },
  '1day': { label: '1 Day', hours: 24 },
  '3days': { label: '3 Days', hours: 72 },
  '7days': { label: '7 Days', hours: 168 },
  '14days': { label: '14 Days', hours: 336 },
  '30days': { label: '30 Days', hours: 720 },
  '90days': { label: '90 Days', hours: 2160 },
  'never': { label: 'Never (1 Year)', hours: 8760 }
};

export type ExpirationOption = keyof typeof EXPIRATION_OPTIONS;

// Generate expiration date with configurable duration
export function generateExpirationDate(option: ExpirationOption = '7days'): Date {
  const config = EXPIRATION_OPTIONS[option];
  const expiration = new Date();
  expiration.setTime(expiration.getTime() + (config.hours * 60 * 60 * 1000));
  return expiration;
}

// Legacy function for backward compatibility
export function generateExpirationDateLegacy(days: number = 7): Date {
  const expiration = new Date();
  expiration.setDate(expiration.getDate() + days);
  return expiration;
}

// Check if file has expired
export function isFileExpired(createdAt: string, expirationDate?: string): boolean {
  if (!expirationDate) return false;
  return new Date() > new Date(expirationDate);
}

// Rate limiting with Redis support
interface RateLimitStore {
  get(key: string): Promise<{ count: number; resetTime: number } | null>;
  set(key: string, value: { count: number; resetTime: number }): Promise<void>;
}

// In-memory fallback (not recommended for production)
const inMemoryStore = new Map<string, { count: number; resetTime: number }>();

const memoryRateLimitStore: RateLimitStore = {
  async get(key: string) {
    return inMemoryStore.get(key) || null;
  },
  async set(key: string, value: { count: number; resetTime: number }) {
    inMemoryStore.set(key, value);
  }
};

let rateLimitStore: RateLimitStore = memoryRateLimitStore;

// Initialize Redis if available
let redisRateLimitStore: RateLimitStore | null = null;

if (process.env.REDIS_URL) {
  try {
    const redis = new Redis(process.env.REDIS_URL);
    
    redisRateLimitStore = {
      async get(key: string) {
        const data = await redis.get(`rate_limit:${key}`);
        return data ? JSON.parse(data) : null;
      },
      async set(key: string, value: { count: number; resetTime: number }) {
        const ttl = Math.max(1, Math.ceil((value.resetTime - Date.now()) / 1000));
        await redis.setex(`rate_limit:${key}`, ttl, JSON.stringify(value));
      }
    };
    
    rateLimitStore = redisRateLimitStore;
  } catch {
  }
}

export async function checkRateLimit(
  ip: string, 
  maxRequests: number = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10'), 
  windowMs: number = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000')
): Promise<boolean> {
  const now = Date.now();
  const userLimit = await rateLimitStore.get(ip);
  
  if (!userLimit || now > userLimit.resetTime) {
    await rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (userLimit.count >= maxRequests) {
    return false;
  }
  
  await rateLimitStore.set(ip, { count: userLimit.count + 1, resetTime: userLimit.resetTime });
  return true;
}

// Encryption key from environment - REQUIRED for production
function getEncryptionKey(): string {
  // Only validate on server-side (Node.js environment)
  if (typeof window === 'undefined') {
    const key = process.env.ENCRYPTION_KEY;
    if (!key || key.length < 32) {
      throw new Error('ENCRYPTION_KEY environment variable must be set and at least 32 characters long');
    }
    return key;
  }
  // Client-side fallback (encryption functions won't work, but won't crash)
  return 'client-side-placeholder-key-not-for-encryption';
}

const ENCRYPTION_KEY = getEncryptionKey();

// Generate a salt for filename encryption
export function generateSalt(): string {
  return randomBytes(16).toString('hex');
}

// Encrypt filename with AES-256-CBC (server-side only)
export function encryptFilename(filename: string, salt?: string): { encrypted: string; salt: string } {
  if (typeof window !== 'undefined') {
    throw new Error('Encryption functions can only be used on server-side');
  }
  
  const useSalt = salt || generateSalt();
  const key = scryptSync(ENCRYPTION_KEY, useSalt, 32);
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', key, iv);
  
  let encrypted = cipher.update(filename, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Combine iv + encrypted data
  const combined = iv.toString('hex') + ':' + encrypted;
  
  return { encrypted: combined, salt: useSalt };
}

// Decrypt filename (server-side only)
export function decryptFilename(encryptedData: string, salt: string): string {
  if (typeof window !== 'undefined') {
    return 'Unknown File'; // Client-side fallback
  }
  
  try {
    const key = scryptSync(ENCRYPTION_KEY, salt, 32);
    const parts = encryptedData.split(':');
    
    if (parts.length !== 2) {
      // Fallback for old format (just encrypted data)
      const iv = randomBytes(16); // This won't work for old data, but prevents crashes
      const decipher = createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt filename:', error);
    return 'Unknown File';
  }
}

// Generate obfuscated S3 key from filename
export function generateObfuscatedKey(filename: string, shareId: string): string {
  const hash = createHash('sha256')
    .update(filename + shareId + Date.now())
    .digest('hex');
  
  const extension = filename.includes('.') ? filename.substring(filename.lastIndexOf('.')) : '';
  return `files/${hash}${extension}`;
}

// Hash email for privacy (one-way, server-side only)
export function hashEmail(email: string): string {
  if (typeof window !== 'undefined') {
    return 'client-side-hash'; // Client-side fallback
  }
  return createHash('sha256').update(email + ENCRYPTION_KEY).digest('hex');
}

// Hash IP address for privacy with salt and anonymization (server-side only)
export function hashIP(ip: string): string {
  if (typeof window !== 'undefined') {
    return 'client-ip-hash'; // Client-side fallback
  }
  
  // Anonymize IPv4 by zeroing last octet, IPv6 by keeping only first 64 bits
  let anonymizedIP = ip;
  if (ip.includes('.')) {
    // IPv4: 192.168.1.100 -> 192.168.1.0
    const parts = ip.split('.');
    if (parts.length === 4) {
      anonymizedIP = `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
  } else if (ip.includes(':')) {
    // IPv6: keep only first 4 groups
    const parts = ip.split(':');
    if (parts.length >= 4) {
      anonymizedIP = `${parts[0]}:${parts[1]}:${parts[2]}:${parts[3]}::`;
    }
  }
  
  const hash = createHash('sha256').update(anonymizedIP + ENCRYPTION_KEY + 'ip_salt').digest('hex');
  return hash.substring(0, 16); // Truncated hash for privacy
}

// Password hashing for file protection
export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = await bcrypt.genSalt(12);
  const hash = await bcrypt.hash(password, salt);
  return { hash, salt };
}

// Verify password against hash
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Access control types
export type AccessControl = 'public' | 'password' | 'authenticated';

// Validate email addresses (multiple recipients)
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

export function validateEmails(emails: string[]): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];
  
  emails.forEach(email => {
    const trimmed = email.trim();
    if (trimmed && isValidEmail(trimmed)) {
      valid.push(trimmed);
    } else if (trimmed) {
      invalid.push(trimmed);
    }
  });
  
  return { valid, invalid };
}

// Parse email string to array (handles comma/semicolon separation)
export function parseEmailString(emailString: string): string[] {
  return emailString
    .split(/[,;]/)
    .map(email => email.trim())
    .filter(email => email.length > 0)
    .slice(0, 3); // Max 3 recipients
}

// Validate file/folder upload limits (configurable)
export const FOLDER_LIMITS = {
  MAX_FILES: parseInt(process.env.MAX_FOLDER_FILES || '100'),
  MAX_TOTAL_SIZE: parseInt(process.env.MAX_FOLDER_SIZE || (5 * 1024 * 1024 * 1024).toString()),
  MAX_INDIVIDUAL_FILE_SIZE: 100 * 1024 * 1024, // 100MB per file in folder
};

export function validateFolderUpload(files: File[]): { 
  valid: boolean; 
  errors: string[]; 
  totalSize: number; 
} {
  const errors: string[] = [];
  let totalSize = 0;

  if (files.length === 0) {
    errors.push('No files found in folder');
    return { valid: false, errors, totalSize: 0 };
  }

  if (files.length > FOLDER_LIMITS.MAX_FILES) {
    errors.push(`Too many files in folder (max ${FOLDER_LIMITS.MAX_FILES})`);
  }

  files.forEach((file) => {
    totalSize += file.size;
    
    if (file.size > FOLDER_LIMITS.MAX_INDIVIDUAL_FILE_SIZE) {
      errors.push(`File "${file.name}" is too large (max ${formatFileSize(FOLDER_LIMITS.MAX_INDIVIDUAL_FILE_SIZE)})`);
    }
    
    if (!isAllowedFileType(file.type, file.name)) {
      errors.push(`File "${file.name}" has unsupported type`);
    }
  });

  if (totalSize > FOLDER_LIMITS.MAX_TOTAL_SIZE) {
    errors.push(`Total folder size too large (max ${formatFileSize(FOLDER_LIMITS.MAX_TOTAL_SIZE)})`);
  }

  return { valid: errors.length === 0, errors, totalSize };
}

// Format file size helper
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}