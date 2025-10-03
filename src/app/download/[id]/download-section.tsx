'use client';

import { useState } from 'react';
import { Download, Loader2, Lock, User, Eye, EyeOff, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface DownloadSectionProps {
  shareId: string;
  accessControl: string;
  isFolder: boolean;
}

export default function DownloadSection({ shareId, accessControl, isFolder }: DownloadSectionProps) {
  const { user } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [passwordRequired] = useState(accessControl === 'password');
  const [copyFeedback, setCopyFeedback] = useState('');

  const copyShareUrl = async () => {
    // Use environment variable for production URL, fallback to current origin for development
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const shareUrl = `${baseUrl}/download/${shareId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyFeedback('URL copied to clipboard!');
      setTimeout(() => setCopyFeedback(''), 3000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
      setCopyFeedback('Failed to copy URL');
      setTimeout(() => setCopyFeedback(''), 3000);
    }
  };

  const handleSecureDownload = async () => {
    try {
      setIsDownloading(true);
      setError('');
      
      // Prepare request body for password-protected files
      const requestBody: { password?: string } = {};
      if (accessControl === 'password' && password) {
        requestBody.password = password;
      }
      
      const response = await fetch(`/api/secure-download/${shareId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: Object.keys(requestBody).length > 0 ? JSON.stringify(requestBody) : undefined,
      });
      
      if (!response.ok) {
        let errorMessage = 'Download failed';
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch {
          // If JSON parsing fails, use status-based error messages
          if (response.status === 405) {
            errorMessage = 'Download service temporarily unavailable';
          } else if (response.status === 404) {
            errorMessage = 'File not found or expired';
          } else if (response.status === 401) {
            errorMessage = 'Authentication required';
          } else if (response.status === 403) {
            errorMessage = 'Access denied';
          } else {
            errorMessage = `Download failed (${response.status})`;
          }
        }
        setError(errorMessage);
        return;
      }

      const result = await response.json();
      
      if (isFolder) {
        // For folders, we get a ZIP download URL
        const { downloadUrl, fileName } = result;
        
        // Create temporary link and trigger download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // For single files
        const { downloadUrl, fileName } = result;
        
        // Create temporary link and trigger download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
    } catch (error) {
      console.error('Download error:', error);
      setError('Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // If authentication is required and user is not logged in
  if (accessControl === 'authenticated' && !user) {
    return (
      <div className="space-y-4">
        <Alert>
          <User className="h-4 w-4" />
          <AlertDescription>
            This {isFolder ? 'folder' : 'file'} requires authentication to access.
          </AlertDescription>
        </Alert>
        
        <div className="flex flex-col gap-2">
          <Link href="/sign-in">
            <Button className="w-full" size="lg">
              <User className="mr-2 h-4 w-4" />
              Sign In to Download
            </Button>
          </Link>
          <p className="text-xs text-muted-foreground text-center">
            You need to sign in to access this {isFolder ? 'folder' : 'file'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Password input for password-protected files */}
      {passwordRequired && (
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">
            Password Required
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password to access this file"
              disabled={isDownloading}
              className="pr-10"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && password.trim()) {
                  handleSecureDownload();
                }
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              disabled={isDownloading}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            This {isFolder ? 'folder' : 'file'} is password protected. Enter the correct password to download.
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Copy URL feedback */}
      {copyFeedback && (
        <Alert>
          <AlertDescription>{copyFeedback}</AlertDescription>
        </Alert>
      )}

      {/* Copy URL button */}
      <Button 
        variant="outline"
        className="w-full" 
        size="lg"
        onClick={copyShareUrl}
        disabled={isDownloading}
      >
        <Copy className="mr-2 h-4 w-4" />
        Copy URL
      </Button>

      {/* Download button */}
      <Button 
        className="w-full" 
        size="lg"
        onClick={handleSecureDownload}
        disabled={isDownloading || (passwordRequired && !password.trim())}
      >
        {isDownloading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Preparing Download...
          </>
        ) : (
          <>
            {accessControl === 'password' ? (
              <Lock className="mr-2 h-4 w-4" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {isFolder ? 'Download Folder' : 'Secure Download'}
          </>
        )}
      </Button>
    </div>
  );
}