// Enhanced file type detection and validation

export const MIME_TYPES = {
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'],
  'image/bmp': ['.bmp'],
  'image/tiff': ['.tiff', '.tif'],
  
  // Documents
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
  'application/rtf': ['.rtf'],
  
  // Microsoft Office
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  
  // Archives
  'application/zip': ['.zip'],
  'application/x-zip-compressed': ['.zip'],
  'application/x-rar-compressed': ['.rar'],
  'application/x-7z-compressed': ['.7z'],
  'application/gzip': ['.gz'],
  'application/x-tar': ['.tar'],
  
  // Audio
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/ogg': ['.ogg'],
  'audio/m4a': ['.m4a'],
  'audio/flac': ['.flac'],
  
  // Video
  'video/mp4': ['.mp4'],
  'video/mpeg': ['.mpeg', '.mpg'],
  'video/quicktime': ['.mov'],
  'video/x-msvideo': ['.avi'],
  'video/webm': ['.webm'],
  'video/x-flv': ['.flv'],
  
  // Code files
  'text/javascript': ['.js'],
  'application/json': ['.json'],
  'text/html': ['.html', '.htm'],
  'text/css': ['.css'],
  'application/xml': ['.xml'],
  'text/x-python': ['.py'],
  'text/x-java-source': ['.java'],
  'text/x-c': ['.c'],
  'text/x-c++': ['.cpp', '.cxx'],
  
  // Other
  'application/octet-stream': [] // Generic binary
};

export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎥';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📽️';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('compressed')) return '🗜️';
  if (mimeType.startsWith('text/')) return '📃';
  return '📁';
}

export function isLargeFile(size: number): boolean {
  return size > 100 * 1024 * 1024; // 100MB
}

export function shouldUseChunkedUpload(size: number): boolean {
  return isLargeFile(size);
}

export function getOptimalChunkSize(fileSize: number): number {
  // Dynamic chunk size based on file size
  if (fileSize < 100 * 1024 * 1024) return 5 * 1024 * 1024; // 5MB for small files
  if (fileSize < 1024 * 1024 * 1024) return 10 * 1024 * 1024; // 10MB for medium files  
  return 20 * 1024 * 1024; // 20MB for large files
}

export function formatUploadTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
  return `${Math.round(seconds / 3600)} hours`;
}

export function predictUploadTime(fileSize: number, speed: number): number {
  if (speed === 0) return 0;
  return fileSize / speed;
}