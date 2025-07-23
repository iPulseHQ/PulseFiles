'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DownloadButtonProps {
  shareId: string;
}

export default function DownloadButton({ shareId }: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleSecureDownload = async () => {
    try {
      setIsDownloading(true);
      
      const response = await fetch(`/api/secure-download/${shareId}`);
      
      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Download failed');
        return;
      }

      const { downloadUrl, fileName } = await response.json();
      
      // Create temporary link and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Download error:', error);
      alert('Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button 
      className="w-full" 
      size="lg"
      onClick={handleSecureDownload}
      disabled={isDownloading}
    >
      {isDownloading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Preparing Download...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Secure Download
        </>
      )}
    </Button>
  );
}