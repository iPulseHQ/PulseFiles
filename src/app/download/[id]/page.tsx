import { db } from '@/lib/neon';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { isFileExpired } from '@/lib/security';
import DownloadPageClient from './download-page-client';

// Import FileRecord type from client component
interface FileRecord {
  id: string;
  file_name: string;
  file_size: number;
  title: string | null;
  message: string | null;
  is_folder: boolean;
  total_files: number | null;
  created_at: string;
  expires_at: string;
  access_control: string;
  max_downloads: number | null;
  download_count: number;
  download_limit_reached: boolean;
  client: string | null;
}

interface DownloadPageProps {
  params: Promise<{ id: string }>;
}

// Dynamic metadata for download pages
export async function generateMetadata({ params }: DownloadPageProps): Promise<Metadata> {
  const { id } = await params;
  
  // Fetch file info for metadata using Neon
  const file = await db.getFileById(id);

  const filename = file?.file_name || 'Bestand';
  const fileSize = file?.file_size ? formatBytes(file.file_size) : '';
  
  return {
    title: `Download: ${filename}`,
    description: `Download ${filename}${fileSize ? ` (${fileSize})` : ''} veilig via PulseFiles. End-to-end versleuteld bestandsdeling.`,
    robots: {
      index: false, // Don't index individual download pages
      follow: false,
    },
    openGraph: {
      title: `Download: ${filename}`,
      description: `Download dit bestand veilig via PulseFiles met end-to-end encryptie.`,
      type: 'website',
    },
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Validate share ID format (should be 64 characters long or custom slug 3+ chars)
function isValidShareId(id: string): boolean {
  return typeof id === 'string' && ((id.length === 64 && /^[A-Za-z0-9_-]+$/.test(id)) || (id.length >= 3 && /^[a-z0-9_-]+$/.test(id)));
}

export default async function DownloadPage({ params }: DownloadPageProps) {
  const { id } = await params;

  // Basic validation
  if (!id || !isValidShareId(id)) {
    return notFound();
  }

  // Fetch the file record using Neon - id IS the share_id
  const fileRecord = await db.getFileById(id) as FileRecord | null;

  if (!fileRecord) {
    return notFound();
  }

  // Use filename directly - it should be the display name
  const displayFilename = fileRecord.file_name || 'file';

  const isExpired = isFileExpired(fileRecord.expires_at);
  const downloadLimitReached = fileRecord.max_downloads 
    ? fileRecord.download_count >= fileRecord.max_downloads 
    : false;

  const expiresAt = new Date(fileRecord.expires_at);
  const now = new Date();
  const timeLeft = expiresAt.getTime() - now.getTime();

  // Render client component with all the data
  return (
    <DownloadPageClient
      fileRecord={fileRecord}
      displayFilename={displayFilename}
      isExpired={isExpired}
      downloadLimitReached={downloadLimitReached}
      timeLeft={timeLeft}
    />
  );
}
