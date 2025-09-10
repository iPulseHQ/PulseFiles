'use client';

import { useState, useEffect } from 'react';
import { Upload, FileText, Mail, Clock, Lock, X, Zap, ChevronDown, ChevronUp, Settings, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ThemeToggle } from '@/components/theme-toggle';
import { useChunkedUpload } from '@/hooks/useChunkedUpload';
import { EXPIRATION_OPTIONS, type ExpirationOption, type AccessControl, validateEmails, validateFolderUpload } from '@/lib/security';
import { useUser, useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import Image from 'next/image';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatSpeed(bytesPerSecond: number): string {
  return formatFileSize(bytesPerSecond) + '/s';
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

export default function Home() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  
  // All state hooks must be at the top level
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isFolder, setIsFolder] = useState(false);
  const [, setEmail] = useState('');
  const [recipients, setRecipients] = useState<string[]>(['']);
  const [title, setTitle] = useState('');
  const [messageText, setMessageText] = useState('');
  const [message, setMessage] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [uploadMethod, setUploadMethod] = useState<'standard' | 'chunked'>('standard');
  const [uploading, setUploading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expirationOption, setExpirationOption] = useState<ExpirationOption>('7days');
  const [customSlug, setCustomSlug] = useState('');
  const [shareMode, setShareMode] = useState<'email' | 'link'>('email');
  const [accessControl, setAccessControl] = useState<AccessControl>('public');
  const [password, setPassword] = useState('');
  const [maxDownloads, setMaxDownloads] = useState<number | ''>('');
  const [urlCopied, setUrlCopied] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');

  const { uploadFile, abortUpload, isUploading, progress } = useChunkedUpload({
    accessToken: undefined, // Will be handled by getToken() when needed
    onError: (error) => {
      setMessage(`Error: ${error}`);
    },
    onSuccess: (result) => {
      setMessage(result.message);
      setShareUrl(result.shareUrl);
      setUrlCopied(false);
      // Clear form
      setFile(null);
      setEmail('');
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }
  });

  // Redirect to Clerk hosted login if not logged in
  useEffect(() => {
    if (isLoaded && !user) {
      const clerkSignInUrl = `https://lucky-gannet-78.accounts.dev/sign-in?redirect_url=${encodeURIComponent(window.location.origin)}`;
      window.location.href = clerkSignInUrl;
    }
  }, [isLoaded, user]);

  // Auto-fill email for logged in users ONLY in "Generate Link Only" mode
  useEffect(() => {
    if (shareMode === 'link' && user?.primaryEmailAddress?.emailAddress && (!recipients[0] || recipients[0].trim() === '')) {
      setRecipients([user.primaryEmailAddress.emailAddress]);
    } else if (shareMode === 'email' && recipients[0] !== '') {
      // Clear the first recipient when switching to email mode
      setRecipients(['']);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.primaryEmailAddress?.emailAddress, shareMode]);

  // Show loading or redirect to auth if not logged in
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Don't render anything while redirecting
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      
      if (selectedFiles.length === 1) {
        // Single file upload
        setFile(selectedFiles[0]);
        setFiles([]);
        setIsFolder(false);
        // Auto-select chunked upload for files > 50MB to prevent 413 errors
        setUploadMethod(selectedFiles[0].size > 50 * 1024 * 1024 ? 'chunked' : 'standard');
      } else if (selectedFiles.length > 1) {
        // Multiple files (folder upload)
        setFiles(selectedFiles);
        setFile(null);
        setIsFolder(true);
        
        // Validate folder upload
        const validation = validateFolderUpload(selectedFiles);
        if (!validation.valid) {
          setMessage(`Folder validation failed: ${validation.errors.join(', ')}`);
          return;
        }
        
        // Folders currently use standard upload (chunked not yet supported for folders)
        setUploadMethod('standard');
        setMessage('');
      }
    }
  };

  // Helper functions for recipients management
  const addRecipient = () => {
    if (recipients.length < 3) {
      setRecipients([...recipients, '']);
    }
  };

  const removeRecipient = (index: number) => {
    if (recipients.length > 1) {
      setRecipients(recipients.filter((_, i) => i !== index));
    }
  };

  const updateRecipient = (index: number, value: string) => {
    const newRecipients = [...recipients];
    newRecipients[index] = value;
    setRecipients(newRecipients);
  };

  const validateRecipients = (): { valid: boolean; emails: string[] } => {
    const allEmails = recipients.filter(email => email.trim().length > 0);
    if (allEmails.length === 0) {
      return { valid: false, emails: [] };
    }
    
    const { valid, invalid } = validateEmails(allEmails);
    if (invalid.length > 0) {
      setMessage(`Invalid email addresses: ${invalid.join(', ')}`);
      return { valid: false, emails: [] };
    }
    
    return { valid: true, emails: valid };
  };

  const handleStandardUpload = async () => {
    if (!file && !isFolder) {
      setMessage('Please select a file or folder');
      return;
    }
    
    // Validate recipients
    let emailsToSend: string[] = [];
    if (shareMode === 'email') {
      const validation = validateRecipients();
      if (!validation.valid) {
        return;
      }
      emailsToSend = validation.emails;
    } else {
      // For link mode, use the first recipient as the sender's email
      if (!recipients[0] || !recipients[0].trim()) {
        setMessage('Please enter your email address');
        return;
      }
      const { valid, invalid } = validateEmails([recipients[0]]);
      if (invalid.length > 0) {
        setMessage('Please enter a valid email address');
        return;
      }
      emailsToSend = valid;
    }

    // Validate password if password protection is enabled
    if (accessControl === 'password' && !password.trim()) {
      setMessage('Please enter a password for protection');
      return;
    }

    setUploading(true);
    setMessage('');
    setShareUrl('');
    setUploadProgress(0);
    setUploadStatus('Preparing upload...');

    const formData = new FormData();
    
    // Add files
    if (isFolder && files.length > 0) {
      files.forEach((file) => {
        formData.append(`files`, file);
      });
      formData.append('isFolder', 'true');
      formData.append('folderName', files[0].webkitRelativePath?.split('/')[0] || 'Upload');
    } else if (file) {
      formData.append('file', file);
      formData.append('isFolder', 'false');
    }

    // Add metadata
    formData.append('shareMode', shareMode);
    formData.append('recipients', JSON.stringify(emailsToSend));
    formData.append('title', title.trim() || (file?.name || files[0]?.name || 'Shared File'));
    formData.append('message', messageText.trim());
    formData.append('expirationOption', expirationOption);
    formData.append('accessControl', accessControl);
    
    if (customSlug.trim()) {
      formData.append('customSlug', customSlug.trim());
    }
    
    if (accessControl === 'password' && password.trim()) {
      formData.append('password', password.trim());
    }
    
    if (maxDownloads && typeof maxDownloads === 'number') {
      formData.append('maxDownloads', maxDownloads.toString());
    }

    try {
      setUploadStatus('Uploading file...');
      setUploadProgress(10);

      // Get auth token first
      const token = await getToken();

      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 80; // Reserve 20% for processing
          setUploadProgress(Math.round(percentComplete));
          setUploadStatus(`Uploading... ${formatFileSize(e.loaded)} / ${formatFileSize(e.total)}`);
        }
      };

      // Handle completion
      const uploadPromise = new Promise<{ success: boolean; message: string; shareUrl: string; error?: string }>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error('Upload failed'));
      });

      xhr.open('POST', '/api/upload');
      
      // Add authorization header if user is authenticated
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      
      xhr.send(formData);

      setUploadProgress(80);
      setUploadStatus('Processing file...');

      const result = await uploadPromise;

      if (shareMode === 'email') {
        setUploadProgress(90);
        setUploadStatus('Sending email...');
      }

      if (result.success) {
        setUploadProgress(100);
        setUploadStatus(shareMode === 'email' ? 'Upload complete!' : 'Link generated!');
        setMessage(result.message);
        setShareUrl(result.shareUrl);
        setUrlCopied(false);

        // Clear form
        setFile(null);
        setFiles([]);
        setIsFolder(false);
        setRecipients(['']);
        setTitle('');
        setMessageText('');
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        setMessage(`Error: ${result.error}`);
      }
    } catch (error: unknown) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check if it's a 413 error (Payload Too Large)
      if (errorMessage.includes('413')) {
        setMessage(`Bestand te groot voor standaard upload. Automatisch overschakelen naar chunked upload...`);
        setUploadMethod('chunked');

        // Automatically retry with chunked upload after a short delay
        setTimeout(() => {
          setMessage('');
          setUploadProgress(0);
          setUploadStatus('');
          handleChunkedUpload();
        }, 1500);
        return;
      }

      // Check for other upload size related errors
      if (errorMessage.includes('too large') || errorMessage.includes('chunked upload') || errorMessage.includes('413')) {
        setMessage(`${errorMessage} Automatisch overschakelen naar chunked upload...`);
        setUploadMethod('chunked');

        // Automatically retry with chunked upload
        setTimeout(() => {
          setMessage('');
          setUploadProgress(0);
          setUploadStatus('');
          handleChunkedUpload();
        }, 1500);
        return;
      }

      // Handle network errors that might indicate size issues
      if (errorMessage.includes('Failed to load resource')) {
        setMessage('Netwerkfout gedetecteerd. Probeer chunked upload voor grote bestanden.');
        setUploadMethod('chunked');
        return;
      }

      setMessage('Upload mislukt. Probeer het opnieuw of gebruik chunked upload voor grote bestanden.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadStatus('');
    }
  };

  const handleChunkedUpload = async () => {
    if (!file && !isFolder) {
      setMessage('Please select a file or folder');
      return;
    }
    
    // Chunked upload currently only supports single files
    if (isFolder) {
      setMessage('Chunked upload is not yet supported for folders. Please use standard upload.');
      setUploadMethod('standard');
      return;
    }
    
    // Validate recipients
    let emailsToSend: string[] = [];
    if (shareMode === 'email') {
      const validation = validateRecipients();
      if (!validation.valid) {
        return;
      }
      emailsToSend = validation.emails;
    } else {
      // For link mode, use the first recipient as the sender's email
      if (!recipients[0] || !recipients[0].trim()) {
        setMessage('Please enter your email address');
        return;
      }
      const { valid, invalid } = validateEmails([recipients[0]]);
      if (invalid.length > 0) {
        setMessage('Please enter a valid email address');
        return;
      }
      emailsToSend = valid;
    }

    // Validate password if password protection is enabled
    if (accessControl === 'password' && !password.trim()) {
      setMessage('Please enter a password for protection');
      return;
    }

    setMessage('');
    setShareUrl('');

    try {
      const token = await getToken();
      await uploadFile(file!, emailsToSend[0], expirationOption, customSlug, shareMode, {
        recipients: emailsToSend,
        title: title.trim() || file!.name,
        message: messageText.trim(),
        accessControl: accessControl,
        password: accessControl === 'password' ? password.trim() : undefined,
        maxDownloads: typeof maxDownloads === 'number' ? maxDownloads : undefined,
        accessToken: token || undefined
      });
    } catch {
      // Error is handled by the hook
    }
  };

  const handleUpload = uploadMethod === 'chunked' ? handleChunkedUpload : handleStandardUpload;
  const isCurrentlyUploading = uploading || isUploading;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
      {/* Header Navigation */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        {/* Left side - Navigation */}
        <div className="flex items-center">
          <div className="flex flex-col items-center">
            <a href="https://ipulse.one" target="_blank" rel="noopener noreferrer">
              <Image 
                src="/logopulsefileswithtekstdark.png" 
                alt="IPulse" 
                width={120} 
                height={32} 
                className="h-8 w-auto dark:hidden" 
              />
              <Image 
                src="/logopulsefileswithtekstlight.png" 
                alt="IPulse" 
                width={120} 
                height={32} 
                className="h-8 w-auto hidden dark:block" 
              />
            </a>
            <span className="text-xs text-muted-foreground mt-1">by IPulse</span>
          </div>
        </div>
        
        {/* Right side - User & Theme */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user.firstName || user.primaryEmailAddress?.emailAddress?.split('@')[0] || 'User'}
              </span>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <User className="h-4 w-4 mr-2" />
                  My Files
                </Button>
              </Link>
            </>
          ) : (
            <Link href="/auth">
              <Button variant="ghost" size="sm">
                <User className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            </Link>
          )}
          <ThemeToggle />
        </div>
      </div>
      <Card className="w-full max-w-2xl mx-auto border-0 shadow-none bg-card/50">
        <CardHeader className="text-center pb-8">
          <div className="mx-auto mb-6 h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Image src="/android-chrome-512x512.png" alt="Pulsefile" width={64} height={64} className="h-16 w-auto" />
          </div>
          <CardTitle className="text-3xl font-light">PulseFiles</CardTitle>
          <CardDescription className="text-muted-foreground">
            Veilig bestanden delen - by IPulse
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-8">
          {/* File/Folder Selection */}
          <div className="space-y-3">
            <div className="text-center">
              <Label htmlFor="file-upload" className="text-base font-medium">
                Selecteer bestanden
              </Label>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <Input
                  id="file-upload"
                  type="file"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="cursor-pointer file:cursor-pointer h-12 text-center file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  multiple
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Kies bestanden of sleep ze hiernaartoe
              </p>
            </div>
            
            {/* Display selected files */}
            {file && !isFolder && (
              <div className="flex items-center justify-between text-sm text-muted-foreground p-2 bg-muted/50 rounded">
                <span>Selected: {file.name}</span>
                <span>{formatFileSize(file.size)}</span>
              </div>
            )}
            
            {isFolder && files.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground p-2 bg-muted/50 rounded">
                  📁 Folder: {files[0].webkitRelativePath?.split('/')[0] || 'Unknown'} 
                  <span className="ml-2">({files.length} files, {formatFileSize(files.reduce((sum, f) => sum + f.size, 0))})</span>
                </div>
                {files.length <= 10 && (
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {files.map((f, i) => (
                      <div key={i} className="text-xs text-muted-foreground flex justify-between px-2">
                        <span className="truncate">{f.webkitRelativePath || f.name}</span>
                        <span>{formatFileSize(f.size)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {files.length > 10 && (
                  <div className="text-xs text-muted-foreground px-2">
                    ... and {files.length - 10} more files
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Share Mode Selection */}
          <div className="space-y-4">
            <div className="text-center">
              <Label className="text-base font-medium">Deel methode</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                shareMode === 'email' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border bg-card hover:bg-muted/50'
              }`} onClick={() => setShareMode('email')}>
                <input
                  type="radio"
                  id="email-mode"
                  name="shareMode"
                  value="email"
                  checked={shareMode === 'email'}
                  onChange={(e) => setShareMode(e.target.value as 'email' | 'link')}
                  disabled={uploading}
                  className="sr-only"
                />
                <div className="text-center">
                  <Mail className="h-6 w-6 mx-auto mb-2" />
                  <div className="font-medium">Via Email</div>
                  <div className="text-sm text-muted-foreground">Direct versturen</div>
                </div>
              </div>
              <div className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                shareMode === 'link' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border bg-card hover:bg-muted/50'
              }`} onClick={() => setShareMode('link')}>
                <input
                  type="radio"
                  id="link-mode"
                  name="shareMode"
                  value="link"
                  checked={shareMode === 'link'}
                  onChange={(e) => setShareMode(e.target.value as 'email' | 'link')}
                  disabled={uploading}
                  className="sr-only"
                />
                <div className="text-center">
                  <Lock className="h-6 w-6 mx-auto mb-2" />
                  <div className="font-medium">Link Alleen</div>
                  <div className="text-sm text-muted-foreground">Link genereren</div>
                </div>
              </div>
            </div>
          </div>

          {/* Recipients Management */}
          <div className="space-y-3">
            <Label className="text-base font-medium">
              {shareMode === 'email' ? 'Ontvangers (max 3)' : 'Je email adres'}
            </Label>
            
            {shareMode === 'email' ? (
              <div className="space-y-2">
                {recipients.map((recipient, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="email"
                      value={recipient}
                      onChange={(e) => updateRecipient(index, e.target.value)}
                      placeholder={`Email ${index + 1}`}
                      disabled={uploading}
                      className="flex-1"
                    />
                    {recipients.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeRecipient(index)}
                        disabled={uploading}
                        className="px-2"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
                {recipients.length < 3 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addRecipient}
                    disabled={uploading}
                    className="text-xs"
                  >
                    + Add Recipient
                  </Button>
                )}
              </div>
            ) : (
              <div>
                <Input
                  type="email"
                  value={recipients[0]}
                  onChange={(e) => updateRecipient(0, e.target.value)}
                  placeholder={user ? "example@domain.com" : "Enter your email address"}
                  disabled={uploading}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {user ? "We'll send you a confirmation email with the share link" : "We'll send you a confirmation that the link has been generated"}
                </p>
              </div>
            )}
          </div>


          {/* Quick Settings */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="expiration" className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4" />
                Verloopt na
              </Label>
              <select
                id="expiration"
                value={expirationOption}
                onChange={(e) => setExpirationOption(e.target.value as ExpirationOption)}
                disabled={isCurrentlyUploading}
                className="w-full p-3 border rounded-lg bg-background"
              >
                {Object.entries(EXPIRATION_OPTIONS).map(([key, option]) => (
                  <option key={key} value={key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Beveiliging</Label>
              <select
                value={accessControl}
                onChange={(e) => setAccessControl(e.target.value as AccessControl)}
                disabled={isCurrentlyUploading}
                className="w-full p-3 border rounded-lg bg-background"
              >
                <option value="public">Openbare link</option>
                <option value="password">Wachtwoord beveiligd</option>
                <option value="authenticated">Inlog vereist</option>
              </select>
            </div>
          </div>

          {accessControl === 'password' && (
            <div className="space-y-3">
              <Label htmlFor="password" className="text-sm font-medium">
                Wachtwoord
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Voer wachtwoord in"
                disabled={isCurrentlyUploading}
                maxLength={50}
                className="h-12"
              />
            </div>
          )}

          {/* Advanced Settings (Collapsible) */}
          <div className="space-y-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-full justify-center sm:justify-start"
            >
              <Settings className="h-4 w-4" />
              <span>More Options</span>
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>

            {showAdvanced && (
              <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 border rounded-lg bg-muted/30">
                {/* Custom Link */}
                <div className="space-y-2">
                  <Label htmlFor="customSlug" className="text-sm font-medium">
                    Custom Link (Optional)
                  </Label>
                  <Input
                    id="customSlug"
                    type="text"
                    value={customSlug}
                    onChange={(e) => setCustomSlug(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                    placeholder="my-custom-link"
                    disabled={isCurrentlyUploading}
                    className="text-sm"
                    maxLength={50}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty for auto-generated secure link
                  </p>
                </div>

                {/* Download Limits */}
                <div className="space-y-2">
                  <Label htmlFor="maxDownloads" className="text-sm font-medium">
                    Download Limit (Optional)
                  </Label>
                  <Input
                    id="maxDownloads"
                    type="number"
                    value={maxDownloads}
                    onChange={(e) => setMaxDownloads(e.target.value ? parseInt(e.target.value) : '')}
                    placeholder="Unlimited"
                    disabled={isCurrentlyUploading}
                    min="1"
                    max="1000"
                  />
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium">
                    Title (Optional)
                  </Label>
                  <Input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter a title for your share"
                    disabled={isCurrentlyUploading}
                    maxLength={100}
                  />
                </div>
                
                {/* Message */}
                <div className="space-y-2">
                  <Label htmlFor="message" className="text-sm font-medium">
                    Message (Optional)
                  </Label>
                  <textarea
                    id="message"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Add a personal message..."
                    disabled={isCurrentlyUploading}
                    maxLength={500}
                    rows={3}
                    className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    {messageText.length}/500 characters
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Progress Bar for Uploads */}
          {(isCurrentlyUploading) && (
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{uploadMethod === 'chunked' ? 'Chunked Upload' : 'Standard Upload'}</span>
                  <span>{uploadMethod === 'chunked' ? progress.percentage : uploadProgress}%</span>
                </div>
                <Progress 
                  value={uploadMethod === 'chunked' ? progress.percentage : uploadProgress} 
                  className="h-3" 
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  {uploadMethod === 'chunked' ? (
                    <>
                      <span>{formatFileSize(progress.loaded)} / {formatFileSize(progress.total)}</span>
                      <span>{formatSpeed(progress.speed)} • {formatTime(progress.remainingTime)} remaining</span>
                    </>
                  ) : (
                    <span className="w-full text-center">{uploadStatus}</span>
                  )}
                </div>
              </div>
              
              {uploadMethod === 'chunked' && (
                <Button
                  onClick={abortUpload}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel Upload
                </Button>
              )}
            </div>
          )}

          {/* Upload Button */}
          {!isUploading && (
            <div className="pt-4">
              <Button
                onClick={handleUpload}
                disabled={(!file && !isFolder) || recipients.filter(r => r.trim()).length === 0 || isCurrentlyUploading}
                className="w-full h-14 text-lg font-medium"
              >
                {isCurrentlyUploading ? (
                  <>
                    <Upload className="mr-3 h-5 w-5 animate-spin" />
                    {shareMode === 'email' ? 'Uploaden en versturen...' : 'Uploaden...'}
                  </>
                ) : (
                  <>
                    <Upload className="mr-3 h-5 w-5" />
                    {shareMode === 'email' ? 'Upload en Verstuur' : 'Upload en Genereer Link'}
                  </>
                )}
              </Button>
            </div>
          )}

          {message && (
            <div className={`p-3 rounded-lg text-sm border ${
              message.includes('Error') || message.includes('failed')
                ? 'bg-destructive/10 text-destructive border-destructive/20'
                : 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400'
            }`}>
              {message}
            </div>
          )}

          {shareUrl && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-green-600" />
                <p className="text-sm font-medium text-green-700 dark:text-green-400">Share URL Generated</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                <p className="text-xs text-green-800 dark:text-green-300 break-all font-mono bg-white dark:bg-green-900 p-2 rounded">
                  {shareUrl}
                </p>
                <div className="flex justify-between items-center mt-2">
                  <div className="text-xs text-green-700 dark:text-green-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Expires in {EXPIRATION_OPTIONS[expirationOption]?.label.toLowerCase()}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(shareUrl);
                        setUrlCopied(true);
                        setTimeout(() => setUrlCopied(false), 2000);
                      } catch (err) {
                        console.error('Failed to copy URL:', err);
                      }
                    }}
                    className="text-xs"
                  >
                    {urlCopied ? 'URL Copied!' : 'Copy URL'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
