import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { isFileExpired } from '@/lib/security';
import DownloadPageClient from './download-page-client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface DownloadPageProps {
  params: Promise<{ id: string }>;
}

// Dynamic metadata for download pages
export async function generateMetadata({ params }: DownloadPageProps): Promise<Metadata> {
  const { id } = await params;
  
  // Fetch file info for metadata
  const { data: fileRecord } = await supabase
    .from('shared_files')
    .select('filename, file_name, file_size')
    .eq('id', id)
    .single();

  // If not found by id, try slug
  const file = fileRecord || (await supabase
    .from('shared_files')
    .select('filename, file_name, file_size')
    .eq('slug', id)
    .single()).data;

  const filename = file?.filename || file?.file_name || 'Bestand';
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

  // Fetch the file record - id IS the share_id
  const { data: fileRecord, error } = await supabase
    .from('shared_files')
    .select('*')
    .eq('id', id)
    .single();

  // If no record found, try to find by slug if applicable
  if (error || !fileRecord) {
    const { data: fileRecordBySlug } = await supabase
      .from('shared_files')
      .select('*')
      .eq('slug', id)
      .single();

    if (!fileRecordBySlug) {
      return notFound();
    }

    // Use the slug record
    const fileRecordToUse = fileRecordBySlug;
    // Use filename directly - it should be the display name
    const displayFilename = fileRecordToUse.filename || fileRecordToUse.file_name || 'file';

    const isExpired = isFileExpired(fileRecordToUse.expires_at);
    const downloadLimitReached = fileRecordToUse.max_downloads 
      ? fileRecordToUse.download_count >= fileRecordToUse.max_downloads 
      : false;

    const expiresAt = new Date(fileRecordToUse.expires_at);
    const now = new Date();
    const timeLeft = expiresAt.getTime() - now.getTime();

    return (
      <DownloadPageClient
        fileRecord={fileRecordToUse}
        displayFilename={displayFilename}
        isExpired={isExpired}
        downloadLimitReached={downloadLimitReached}
        timeLeft={timeLeft}
      />
    );
  }

  // Use filename directly - it should be the display name
  const displayFilename = fileRecord.filename || fileRecord.file_name || 'file';

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