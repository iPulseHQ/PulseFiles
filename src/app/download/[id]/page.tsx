import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import { Clock, FileText, AlertTriangle, Lock, User, Folder } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ThemeToggle } from '@/components/theme-toggle';
import { isFileExpired, decryptFilename } from '@/lib/security';
import DownloadSection from './download-section';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface DownloadPageProps {
  params: Promise<{ id: string }>;
}

// Validate share ID format (should be 64 characters long or custom slug 3+ chars)
function isValidShareId(id: string): boolean {
  return typeof id === 'string' && ((id.length === 64 && /^[A-Za-z0-9_-]+$/.test(id)) || (id.length >= 3 && /^[a-z0-9_-]+$/.test(id)));
}

export default async function DownloadPage({ params }: DownloadPageProps) {
  const { id } = await params;

  // Validate share ID format first
  if (!isValidShareId(id)) {
    notFound();
  }

  const { data: fileRecord, error } = await supabase
    .from('shared_files')
    .select('*, folder_contents(*)')
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (error || !fileRecord) {
    notFound();
  }

  // Check if file has expired using the new expires_at field
  const isExpired = isFileExpired(fileRecord.created_at, fileRecord.expires_at);
  
  // Check if download limit has been reached
  const downloadLimitReached = fileRecord.download_limit_reached || 
    (fileRecord.max_downloads && fileRecord.download_count >= fileRecord.max_downloads);
  
  // Calculate time left for display
  const createdAt = new Date(fileRecord.created_at);
  const expiresAt = new Date(fileRecord.expires_at || fileRecord.created_at);
  const now = new Date();
  const timeLeft = expiresAt.getTime() - now.getTime();

  const formatTimeLeft = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Decrypt filename if available, otherwise use original
  let displayFilename = fileRecord.file_name;
  if (fileRecord.encrypted_filename && fileRecord.filename_salt) {
    displayFilename = decryptFilename(fileRecord.encrypted_filename, fileRecord.filename_salt);
  }

  if (isExpired || downloadLimitReached) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-2xl text-destructive">
              {isExpired ? 'Link Expired' : 'Download Limit Reached'}
            </CardTitle>
            <CardDescription>
              {isExpired 
                ? 'This download link has expired for security purposes'
                : 'This file has reached its maximum download limit'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {isExpired 
                  ? 'This download link has expired for security purposes.'
                  : `This file has been downloaded ${fileRecord.download_count} times and has reached its limit of ${fileRecord.max_downloads} downloads.`
                }
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            {fileRecord.is_folder ? (
              <Folder className="h-6 w-6 text-primary" />
            ) : (
              <FileText className="h-6 w-6 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {fileRecord.title || (fileRecord.is_folder ? 'Folder Download' : 'File Download')}
          </CardTitle>
          <CardDescription>
            {fileRecord.is_folder ? 'Your folder is ready for download' : 'Your file is ready for download'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Display message if provided */}
          {fileRecord.message && (
            <div className="bg-muted/50 p-4 rounded-lg border-l-4 border-primary">
              <p className="text-sm italic text-muted-foreground">
                &ldquo;{fileRecord.message}&rdquo;
              </p>
            </div>
          )}
          
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">{fileRecord.is_folder ? 'Folder name:' : 'File name:'}</span>
              <span className="font-medium truncate ml-2">{displayFilename}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Size:</span>
              <span className="font-medium">{formatFileSize(fileRecord.file_size)}</span>
            </div>
            {fileRecord.is_folder && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Files:</span>
                <span className="font-medium">{fileRecord.total_files} files</span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Uploaded:</span>
              <span className="font-medium">{createdAt.toLocaleDateString()}</span>
            </div>
            {fileRecord.max_downloads && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Downloads:</span>
                <span className="font-medium">{fileRecord.download_count || 0} / {fileRecord.max_downloads}</span>
              </div>
            )}
          </div>
          
          {/* Access control indicator */}
          {fileRecord.access_control !== 'public' && (
            <Alert>
              {fileRecord.access_control === 'password' ? (
                <Lock className="h-4 w-4" />
              ) : (
                <User className="h-4 w-4" />
              )}
              <AlertDescription>
                {fileRecord.access_control === 'password' 
                  ? 'This file is password protected'
                  : 'This file requires authentication'
                }
              </AlertDescription>
            </Alert>
          )}

          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              This link expires in {formatTimeLeft(timeLeft)}
            </AlertDescription>
          </Alert>

          <DownloadSection 
            shareId={id} 
            accessControl={fileRecord.access_control}
            isFolder={fileRecord.is_folder}
          />

          <p className="text-xs text-muted-foreground text-center">
            Click the button above to download your {fileRecord.is_folder ? 'folder' : 'file'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}