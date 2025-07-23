import { useState, useCallback } from 'react';

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed: number; // bytes per second
  remainingTime: number; // seconds
}

interface ChunkedUploadOptions {
  chunkSize?: number;
  maxRetries?: number;
  accessToken?: string;
  onProgress?: (progress: UploadProgress) => void;
  onError?: (error: string) => void;
  onSuccess?: (result: { shareUrl: string; expirationDate: string; message: string }) => void;
}

export function useChunkedUpload(options: ChunkedUploadOptions = {}) {
  const {
    chunkSize = 5 * 1024 * 1024, // 5MB chunks
    maxRetries = 3,
    accessToken,
    onProgress,
    onError,
    onSuccess
  } = options;

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({
    loaded: 0,
    total: 0,
    percentage: 0,
    speed: 0,
    remainingTime: 0
  });
  const [sessionId, setSessionId] = useState<string | null>(null);

  const uploadFile = useCallback(async (
    file: File, 
    email: string, 
    expirationOption?: string, 
    customSlug?: string,
    shareMode: 'email' | 'link' = 'email',
    additionalData?: {
      recipients?: string[];
      title?: string;
      message?: string;
      accessControl?: string;
      password?: string;
      maxDownloads?: number;
    }
  ) => {
    if (!file || !email) {
      onError?.('File and email are required');
      return;
    }

    setIsUploading(true);
    const startTime = Date.now();
    let uploadedBytes = 0;

    try {
      // Initialize upload
      const initFormData = new FormData();
      initFormData.append('action', 'init');
      initFormData.append('fileName', file.name);
      initFormData.append('fileSize', file.size.toString());
      initFormData.append('fileType', file.type);
      initFormData.append('shareMode', shareMode);
      initFormData.append('email', email);
      
      // Add additional data if provided
      if (additionalData?.recipients) {
        initFormData.append('recipients', JSON.stringify(additionalData.recipients));
      }
      if (additionalData?.title) {
        initFormData.append('title', additionalData.title);
      }
      if (additionalData?.message) {
        initFormData.append('message', additionalData.message);
      }
      if (additionalData?.accessControl) {
        initFormData.append('accessControl', additionalData.accessControl);
      }
      if (additionalData?.password) {
        initFormData.append('password', additionalData.password);
      }
      if (additionalData?.maxDownloads) {
        initFormData.append('maxDownloads', additionalData.maxDownloads.toString());
      }
      
      if (expirationOption) {
        initFormData.append('expirationOption', expirationOption);
      }
      if (customSlug?.trim()) {
        initFormData.append('customSlug', customSlug.trim());
      }

      const initHeaders: Record<string, string> = {};
      if (accessToken) {
        initHeaders['Authorization'] = `Bearer ${accessToken}`;
      }

      const initResponse = await fetch('/api/upload-chunk', {
        method: 'POST',
        headers: initHeaders,
        body: initFormData,
      });

      if (!initResponse.ok) {
        const error = await initResponse.json();
        throw new Error(error.error || 'Failed to initialize upload');
      }

      const { sessionId: newSessionId } = await initResponse.json();
      setSessionId(newSessionId);

      // Calculate number of chunks
      const totalChunks = Math.ceil(file.size / chunkSize);
      
      // Upload chunks
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        let retries = 0;
        let chunkUploaded = false;

        while (!chunkUploaded && retries < maxRetries) {
          try {
            const chunkFormData = new FormData();
            chunkFormData.append('action', 'chunk');
            chunkFormData.append('sessionId', newSessionId);
            chunkFormData.append('chunkNumber', (chunkIndex + 1).toString());
            chunkFormData.append('chunk', chunk);

            const chunkHeaders: Record<string, string> = {};
            if (accessToken) {
              chunkHeaders['Authorization'] = `Bearer ${accessToken}`;
            }

            const chunkResponse = await fetch('/api/upload-chunk', {
              method: 'POST',
              headers: chunkHeaders,
              body: chunkFormData,
            });

            if (!chunkResponse.ok) {
              throw new Error(`Failed to upload chunk ${chunkIndex + 1}`);
            }

            chunkUploaded = true;
            uploadedBytes += chunk.size;

            // Calculate progress
            const elapsedTime = (Date.now() - startTime) / 1000;
            const speed = uploadedBytes / elapsedTime;
            const remainingBytes = file.size - uploadedBytes;
            const remainingTime = remainingBytes / speed;

            const newProgress: UploadProgress = {
              loaded: uploadedBytes,
              total: file.size,
              percentage: Math.round((uploadedBytes / file.size) * 100),
              speed,
              remainingTime
            };

            setProgress(newProgress);
            onProgress?.(newProgress);

          } catch {
            retries++;
            if (retries >= maxRetries) {
              throw new Error(`Failed to upload chunk ${chunkIndex + 1} after ${maxRetries} retries`);
            }
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * retries));
          }
        }
      }

      // Complete upload
      const completeFormData = new FormData();
      completeFormData.append('action', 'complete');
      completeFormData.append('sessionId', newSessionId);

      const completeHeaders: Record<string, string> = {};
      if (accessToken) {
        completeHeaders['Authorization'] = `Bearer ${accessToken}`;
      }

      const completeResponse = await fetch('/api/upload-chunk', {
        method: 'POST',
        headers: completeHeaders,
        body: completeFormData,
      });

      if (!completeResponse.ok) {
        const error = await completeResponse.json();
        throw new Error(error.error || 'Failed to complete upload');
      }

      const result = await completeResponse.json();
      onSuccess?.(result);
      return result;

    } catch (error) {
      // Abort upload on error
      if (sessionId) {
        try {
          const abortFormData = new FormData();
          abortFormData.append('action', 'abort');
          abortFormData.append('sessionId', sessionId);
          const abortHeaders: Record<string, string> = {};
          if (accessToken) {
            abortHeaders['Authorization'] = `Bearer ${accessToken}`;
          }

          await fetch('/api/upload-chunk', {
            method: 'POST',
            headers: abortHeaders,
            body: abortFormData,
          });
        } catch (abortError) {
          console.error('Failed to abort upload:', abortError);
        }
      }

      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      onError?.(errorMessage);
      throw error;
    } finally {
      setIsUploading(false);
      setSessionId(null);
    }
  }, [chunkSize, maxRetries, accessToken, onProgress, onError, onSuccess, sessionId]);

  const abortUpload = useCallback(async () => {
    if (sessionId) {
      try {
        const abortFormData = new FormData();
        abortFormData.append('action', 'abort');
        abortFormData.append('sessionId', sessionId);
        const abortHeaders: Record<string, string> = {};
        if (accessToken) {
          abortHeaders['Authorization'] = `Bearer ${accessToken}`;
        }

        await fetch('/api/upload-chunk', {
          method: 'POST',
          headers: abortHeaders,
          body: abortFormData,
        });
        setIsUploading(false);
        setSessionId(null);
      } catch (error) {
        console.error('Failed to abort upload:', error);
      }
    }
  }, [sessionId, accessToken]);

  return {
    uploadFile,
    abortUpload,
    isUploading,
    progress,
    sessionId
  };
}