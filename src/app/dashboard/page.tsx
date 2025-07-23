'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuth } from '@/contexts/AuthContext';
import { Files, Upload, LogOut, Clock, Download, Share, Copy, Settings, Github, Heart, Info } from 'lucide-react';
import Link from 'next/link';

interface SharedFile {
  id: string;
  file_name: string;
  encrypted_filename?: string;
  filename_salt?: string;
  file_size: number;
  file_type: string;
  email: string;
  expires_at: string;
  created_at: string;
  download_count: number;
}

export default function DashboardPage() {
  const { user, session, loading, signOut, getUserDisplayName } = useAuth();
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  const fetchUserFiles = useCallback(async () => {
    try {
      const response = await fetch('/api/user/files', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
      } else {
        setError('Failed to load your files');
      }
    } catch {
      setError('Failed to load your files');
    } finally {
      setLoadingFiles(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
      return;
    }

    if (user) {
      fetchUserFiles();
    }
  }, [user, loading, router, fetchUserFiles]);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) {
      router.push('/');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const copyShareUrl = (fileId: string) => {
    const shareUrl = `${window.location.origin}/download/${fileId}`;
    navigator.clipboard.writeText(shareUrl);
  };

  const isExpired = (expiresAt: string) => {
    return new Date() > new Date(expiresAt);
  };

  if (loading || loadingFiles) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Files className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">My Files</h1>
              <p className="text-muted-foreground">{getUserDisplayName()}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Link href="/info">
              <Button variant="ghost" size="sm">
                <Info className="h-4 w-4 mr-2" />
                Info
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Upload New
              </Button>
            </Link>
            <Link href="/account">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Account
              </Button>
            </Link>
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Files Grid */}
        {files.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Files className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <CardTitle className="text-xl mb-2">No files yet</CardTitle>
              <CardDescription className="mb-6">
                Upload your first file to get started
              </CardDescription>
              <Link href="/">
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {files.map((file) => (
              <Card key={file.id} className={`${isExpired(file.expires_at) ? 'opacity-60' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base truncate">
                      {file.file_name}
                    </CardTitle>
                    {isExpired(file.expires_at) && (
                      <span className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded">
                        Expired
                      </span>
                    )}
                  </div>
                  <CardDescription>
                    {formatFileSize(file.file_size)} • {file.file_type}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Uploaded {formatDate(file.created_at)}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Download className="h-3 w-3" />
                      {file.download_count} downloads
                    </div>
                    <div className="text-muted-foreground">
                      Expires {formatDate(file.expires_at)}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {!isExpired(file.expires_at) && (
                      <>
                        <Link href={`/download/${file.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">
                            <Share className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyShareUrl(file.id)}
                          className="flex-1"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy Link
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Footer Links */}
      <div className="absolute bottom-4 left-4 flex gap-3">
        <a
          href="https://github.com/ArjandenHartog/openfiles"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-full bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 transition-colors shadow-sm"
          title="View on GitHub"
        >
          <Github className="h-5 w-5 text-slate-600 dark:text-slate-300" />
        </a>
        <a
          href="https://arjandenhartog.com"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-full bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 transition-colors shadow-sm"
          title="Made with ❤️ by Arjan"
        >
          <Heart className="h-5 w-5 text-slate-600 dark:text-slate-300" />
        </a>
      </div>
    </div>
  );
}