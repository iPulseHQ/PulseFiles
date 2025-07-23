'use client';

import { useState, useEffect } from 'react';
import { Upload, FileText, Mail, Clock, Lock, X, Zap, ChevronDown, ChevronUp, Settings, Github, Heart, User, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ThemeToggle } from '@/components/theme-toggle';
import { useChunkedUpload } from '@/hooks/useChunkedUpload';
import { EXPIRATION_OPTIONS, type ExpirationOption, type AccessControl, validateEmails, validateFolderUpload } from '@/lib/security';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

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
  const { user, session, getUserDisplayName } = useAuth();
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

  const { uploadFile, abortUpload, isUploading, progress } = useChunkedUpload({
    accessToken: session?.access_token,
    onError: (error) => {
      setMessage(`Error: ${error}`);
    },
    onSuccess: (result) => {
      setMessage(result.message);
      setShareUrl(result.shareUrl);
      // Clear form
      setFile(null);
      setEmail('');
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }
  });

  // Auto-fill email for logged in users ONLY in "Generate Link Only" mode
  useEffect(() => {
    if (shareMode === 'link' && user?.email && (!recipients[0] || recipients[0].trim() === '')) {
      setRecipients([user.email]);
    } else if (shareMode === 'email') {
      // Clear the first recipient when switching to email mode
      setRecipients(['']);
    }
  }, [user?.email, shareMode]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      
      if (selectedFiles.length === 1) {
        // Single file upload
        setFile(selectedFiles[0]);
        setFiles([]);
        setIsFolder(false);
        // Auto-select chunked upload for files > 100MB
        setUploadMethod(selectedFiles[0].size > 100 * 1024 * 1024 ? 'chunked' : 'standard');
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
        
        // Auto-select chunked upload for folders or large total size
        setUploadMethod(validation.totalSize > 100 * 1024 * 1024 ? 'chunked' : 'standard');
        setMessage('');
      }
    }
  };

  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');

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
      if (session?.access_token) {
        xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
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
    } catch (error) {
      setMessage('Upload failed. Please try again.');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadStatus('');
    }
  };

  const handleChunkedUpload = async () => {
    if (!file) {
      setMessage('Please select a file');
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
      await uploadFile(file, emailsToSend[0], expirationOption, customSlug, shareMode, {
        recipients: emailsToSend,
        title: title.trim() || file.name,
        message: messageText.trim(),
        accessControl: accessControl,
        password: accessControl === 'password' ? password.trim() : undefined,
        maxDownloads: typeof maxDownloads === 'number' ? maxDownloads : undefined
      });
    } catch {
      // Error is handled by the hook
    }
  };

  const handleUpload = uploadMethod === 'chunked' ? handleChunkedUpload : handleStandardUpload;
  const isCurrentlyUploading = uploading || isUploading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
      {/* Header Navigation */}
      <div className="absolute top-4 right-4 flex items-center gap-3">
        <Link href="/info">
          <Button variant="ghost" size="sm">
            <Info className="h-4 w-4 mr-2" />
            Info
          </Button>
        </Link>
        {user ? (
          <>
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                <User className="h-4 w-4 mr-2" />
                My Files
              </Button>
            </Link>
            <span className="text-sm text-muted-foreground">
              {getUserDisplayName()}
            </span>
          </>
        ) : (
          <Link href="/auth">
            <Button variant="outline" size="sm">
              <User className="h-4 w-4 mr-2" />
              Sign In
            </Button>
          </Link>
        )}
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">OpenFiles</CardTitle>
          <CardDescription>
            Upload a file and get a secure sharing link
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File/Folder Selection */}
          <div className="space-y-2">
            <Label htmlFor="file-upload" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Select File or Folder
            </Label>
            <div className="space-y-2">
              <Input
                id="file-upload"
                type="file"
                onChange={handleFileChange}
                disabled={uploading}
                className="cursor-pointer file:cursor-pointer"
                multiple
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById('file-upload') as HTMLInputElement;
                    if (input) {
                      input.removeAttribute('webkitdirectory');
                      input.multiple = false;
                      input.click();
                    }
                  }}
                  className="text-xs px-2 py-1 bg-muted hover:bg-muted/80 rounded"
                  disabled={uploading}
                >
                  Choose File
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById('file-upload') as HTMLInputElement;
                    if (input) {
                      (input as HTMLInputElement & { webkitdirectory: boolean }).webkitdirectory = true;
                      input.multiple = true;
                      input.click();
                    }
                  }}
                  className="text-xs px-2 py-1 bg-muted hover:bg-muted/80 rounded"
                  disabled={uploading}
                >
                  Choose Folder
                </button>
              </div>
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
          <div className="space-y-3">
            <Label className="text-sm font-medium">Share Method</Label>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="email-mode"
                  name="shareMode"
                  value="email"
                  checked={shareMode === 'email'}
                  onChange={(e) => setShareMode(e.target.value as 'email' | 'link')}
                  disabled={uploading}
                />
                <Label htmlFor="email-mode" className="flex items-center gap-1 text-sm">
                  <Mail className="h-3 w-3" />
                  Send via Email
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="link-mode"
                  name="shareMode"
                  value="link"
                  checked={shareMode === 'link'}
                  onChange={(e) => setShareMode(e.target.value as 'email' | 'link')}
                  disabled={uploading}
                />
                <Label htmlFor="link-mode" className="flex items-center gap-1 text-sm">
                  <Lock className="h-3 w-3" />
                  Generate Link Only
                </Label>
              </div>
            </div>
          </div>

          {/* Recipients Management */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {shareMode === 'email' ? `Recipients (max 3)` : user ? 'Confirmation Email' : 'Your Email Address'}
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


          {/* Advanced Settings (Collapsible) */}
          <div className="space-y-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <Settings className="h-4 w-4" />
              Advanced Settings
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>

            {showAdvanced && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                {/* Upload Method */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Upload Method</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="standard"
                        name="uploadMethod"
                        value="standard"
                        checked={uploadMethod === 'standard'}
                        onChange={(e) => setUploadMethod(e.target.value as 'standard' | 'chunked')}
                        disabled={isCurrentlyUploading}
                      />
                      <Label htmlFor="standard" className="flex items-center gap-1 text-sm">
                        <Upload className="h-3 w-3" />
                        Standard
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="chunked"
                        name="uploadMethod"
                        value="chunked"
                        checked={uploadMethod === 'chunked'}
                        onChange={(e) => setUploadMethod(e.target.value as 'standard' | 'chunked')}
                        disabled={isCurrentlyUploading}
                      />
                      <Label htmlFor="chunked" className="flex items-center gap-1 text-sm">
                        <Zap className="h-3 w-3" />
                        Chunked
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Expiration Time */}
                <div className="space-y-2">
                  <Label htmlFor="expiration" className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="h-4 w-4" />
                    Link Expires In
                  </Label>
                  <select
                    id="expiration"
                    value={expirationOption}
                    onChange={(e) => setExpirationOption(e.target.value as ExpirationOption)}
                    disabled={isCurrentlyUploading}
                    className="w-full p-2 border rounded-md bg-background text-sm"
                  >
                    {Object.entries(EXPIRATION_OPTIONS).map(([key, option]) => (
                      <option key={key} value={key}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Slug */}
                <div className="space-y-2">
                  <Label htmlFor="customSlug" className="flex items-center gap-2 text-sm font-medium">
                    <Lock className="h-4 w-4" />
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
                    Leave empty for auto-generated secure link. Only letters, numbers, _ and - allowed.
                  </p>
                </div>

                {/* Access Control */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Access Control</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="access-public"
                        name="accessControl"
                        value="public"
                        checked={accessControl === 'public'}
                        onChange={(e) => setAccessControl(e.target.value as AccessControl)}
                        disabled={isCurrentlyUploading}
                      />
                      <Label htmlFor="access-public" className="text-sm">
                        Public - Anyone with the link can access
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="access-password"
                        name="accessControl"
                        value="password"
                        checked={accessControl === 'password'}
                        onChange={(e) => setAccessControl(e.target.value as AccessControl)}
                        disabled={isCurrentlyUploading}
                      />
                      <Label htmlFor="access-password" className="text-sm">
                        Password Protected - Requires password to access
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="access-authenticated"
                        name="accessControl"
                        value="authenticated"
                        checked={accessControl === 'authenticated'}
                        onChange={(e) => setAccessControl(e.target.value as AccessControl)}
                        disabled={isCurrentlyUploading}
                      />
                      <Label htmlFor="access-authenticated" className="text-sm">
                        Authenticated Users Only - Requires account to access
                      </Label>
                    </div>
                  </div>

                  {accessControl === 'password' && (
                    <div className="space-y-2 ml-6">
                      <Label htmlFor="password" className="text-sm">
                        Password
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password for protection"
                        disabled={isCurrentlyUploading}
                        maxLength={50}
                      />
                      <p className="text-xs text-muted-foreground">
                        Users will need this password to download the file
                      </p>
                    </div>
                  )}
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
                  <p className="text-xs text-muted-foreground">
                    Maximum number of times this file can be downloaded (leave empty for unlimited)
                  </p>
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

                {((file && file.size > 100 * 1024 * 1024 && uploadMethod === 'standard') || (isFolder && files.reduce((sum, f) => sum + f.size, 0) > 100 * 1024 * 1024 && uploadMethod === 'standard')) && (
                  <Alert>
                    <Zap className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {isFolder ? 'Folder' : 'File'} is over 100MB. Consider using <strong>Chunked Upload</strong> for better reliability.
                    </AlertDescription>
                  </Alert>
                )}
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
            <div className="flex gap-2">
              <Button
                onClick={handleUpload}
                disabled={(!file && !isFolder) || recipients.filter(r => r.trim()).length === 0 || isCurrentlyUploading}
                className="flex-1"
                size="lg"
              >
                {isCurrentlyUploading ? (
                  <>
                    <Upload className="mr-2 h-4 w-4 animate-spin" />
                    {uploadMethod === 'chunked' ? 'Processing...' : 'Uploading...'}
                  </>
                ) : (
                  <>
                    {uploadMethod === 'chunked' ? (
                      <Zap className="mr-2 h-4 w-4" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    {uploadMethod === 'chunked' ? 'Chunked Upload' : (shareMode === 'email' ? 'Upload & Email' : 'Upload & Generate Link')}
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
                    onClick={() => navigator.clipboard.writeText(shareUrl)}
                    className="text-xs"
                  >
                    Copy URL
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
      
      {/* Footer */}
      <footer className="p-4 flex justify-center">
        <div className="flex gap-3">
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
      </footer>
    </div>
  );
}
