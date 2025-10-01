'use client';

import { useState, useEffect, useRef } from 'react';
import { Upload, Mail, Clock, Lock, X, ChevronDown, ChevronUp, Settings, User, Send, Link as LinkIcon, Check, Shield, FileText, Copy, HardDrive, Zap, Image as ImageIcon, Music, Video, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ThemeToggle } from '@/components/theme-toggle';
import ElectricBorder from '@/components/ElectricBorder';
import GoogleAd from '@/components/GoogleAd';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isFolder, setIsFolder] = useState(false);
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
  const [shareMode, setShareMode] = useState<'email' | 'link'>('link');
  const [accessControl, setAccessControl] = useState<AccessControl>('public');
  const [password, setPassword] = useState('');
  const [maxDownloads, setMaxDownloads] = useState<number | ''>('');
  const [urlCopied, setUrlCopied] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const { uploadFile, abortUpload, isUploading, progress } = useChunkedUpload({
    accessToken: undefined,
    onError: (error) => {
      setMessage(`Error: ${error}`);
    },
    onSuccess: (result) => {
      setMessage(result.message);
      setShareUrl(result.shareUrl);
      setUrlCopied(false);
      setFile(null);
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  });

  useEffect(() => {
    if (isLoaded && !user) {
      const clerkSignInUrl = `https://lucky-gannet-78.accounts.dev/sign-in?redirect_url=${encodeURIComponent(window.location.origin)}`;
      window.location.href = clerkSignInUrl;
    }
  }, [isLoaded, user]);

  useEffect(() => {
    if (shareMode === 'link' && user?.primaryEmailAddress?.emailAddress && (!recipients[0] || recipients[0].trim() === '')) {
      setRecipients([user.primaryEmailAddress.emailAddress]);
    } else if (shareMode === 'email' && recipients[0] !== '') {
      setRecipients(['']);
    }
  }, [user?.primaryEmailAddress?.emailAddress, shareMode]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      
      if (droppedFiles.length === 1) {
        setFile(droppedFiles[0]);
        setFiles([]);
        setIsFolder(false);
        setUploadMethod(droppedFiles[0].size > 50 * 1024 * 1024 ? 'chunked' : 'standard');
      } else {
        setFiles(droppedFiles);
        setFile(null);
        setIsFolder(true);
        setUploadMethod('standard');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      
      if (selectedFiles.length === 1) {
        setFile(selectedFiles[0]);
        setFiles([]);
        setIsFolder(false);
        setUploadMethod(selectedFiles[0].size > 50 * 1024 * 1024 ? 'chunked' : 'standard');
      } else if (selectedFiles.length > 1) {
        setFiles(selectedFiles);
        setFile(null);
        setIsFolder(true);
        
        const validation = validateFolderUpload(selectedFiles);
        if (!validation.valid) {
          setMessage(`Folder validation failed: ${validation.errors.join(', ')}`);
          return;
        }
        
        setUploadMethod('standard');
        setMessage('');
      }
    }
  };

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
      setMessage('Selecteer eerst een bestand');
      return;
    }
    
    let emailsToSend: string[] = [];
    if (shareMode === 'email') {
      const validation = validateRecipients();
      if (!validation.valid) {
        return;
      }
      emailsToSend = validation.emails;
    } else {
      if (!recipients[0] || !recipients[0].trim()) {
        setMessage('Voer je email adres in');
        return;
      }
      const { valid, invalid } = validateEmails([recipients[0]]);
      if (invalid.length > 0) {
        setMessage('Voer een geldig email adres in');
        return;
      }
      emailsToSend = valid;
    }

    if (accessControl === 'password' && !password.trim()) {
      setMessage('Voer een wachtwoord in');
      return;
    }

    setUploading(true);
    setMessage('');
    setShareUrl('');
    setUploadProgress(0);
    setUploadStatus('Voorbereiden...');

    const formData = new FormData();
    
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
      setUploadStatus('Uploaden...');
      setUploadProgress(10);

      const token = await getToken();

      const xhr = new XMLHttpRequest();
      
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 80;
          setUploadProgress(Math.round(percentComplete));
          setUploadStatus(`Uploaden... ${formatFileSize(e.loaded)} / ${formatFileSize(e.total)}`);
        }
      };

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
      
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      
      xhr.send(formData);

      setUploadProgress(80);
      setUploadStatus('Verwerken...');

      const result = await uploadPromise;

      if (shareMode === 'email') {
        setUploadProgress(90);
        setUploadStatus('Email versturen...');
      }

      if (result.success) {
        setUploadProgress(100);
        setUploadStatus('Voltooid!');
        setMessage(result.message);
        setShareUrl(result.shareUrl);
        setUrlCopied(false);

        setFile(null);
        setFiles([]);
        setIsFolder(false);
        setRecipients(shareMode === 'link' && user?.primaryEmailAddress?.emailAddress ? [user.primaryEmailAddress.emailAddress] : ['']);
        setTitle('');
        setMessageText('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setMessage(`Error: ${result.error}`);
      }
    } catch (error: unknown) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('413')) {
        setMessage(`Bestand te groot. Overschakelen naar chunked upload...`);
        setUploadMethod('chunked');
        setTimeout(() => {
          setMessage('');
          setUploadProgress(0);
          setUploadStatus('');
          handleChunkedUpload();
        }, 1500);
        return;
      }

      setMessage('Upload mislukt. Probeer het opnieuw.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadStatus('');
    }
  };

  const handleChunkedUpload = async () => {
    if (!file && !isFolder) {
      setMessage('Selecteer eerst een bestand');
      return;
    }
    
    if (isFolder) {
      setMessage('Chunked upload wordt nog niet ondersteund voor folders.');
      setUploadMethod('standard');
      return;
    }
    
    let emailsToSend: string[] = [];
    if (shareMode === 'email') {
      const validation = validateRecipients();
      if (!validation.valid) {
        return;
      }
      emailsToSend = validation.emails;
    } else {
      if (!recipients[0] || !recipients[0].trim()) {
        setMessage('Voer je email adres in');
        return;
      }
      const { valid, invalid } = validateEmails([recipients[0]]);
      if (invalid.length > 0) {
        setMessage('Voer een geldig email adres in');
        return;
      }
      emailsToSend = valid;
    }

    if (accessControl === 'password' && !password.trim()) {
      setMessage('Voer een wachtwoord in');
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
      // Error handled by hook
    }
  };

  const handleUpload = uploadMethod === 'chunked' ? handleChunkedUpload : handleStandardUpload;
  const isCurrentlyUploading = uploading || isUploading;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
                <Upload className="h-5 w-5" />
              </div>
              <span className="text-xl font-semibold hidden sm:inline">
                PulseFiles
              </span>
            </Link>

            <div className="flex items-center gap-3">
              {user && (
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">Mijn Bestanden</span>
                  </Button>
                </Link>
              )}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - WeTransfer Style Layout */}
      <main className="flex-1 flex">
        {/* Left Column - Upload Form (40% width on large screens) */}
        <div className="w-full lg:w-2/5 p-6 sm:p-8 lg:p-12 overflow-y-auto flex items-center">
          <div className="max-w-lg w-full">

            {/* Success State */}
            {shareUrl && !isCurrentlyUploading ? (
              <div className="space-y-6">
                <div className="p-6 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-start gap-3 mb-4">
                    <Check className="h-6 w-6 text-green-600 dark:text-green-400 mt-0.5" />
                    <div>
                      <h2 className="text-lg font-semibold mb-1">
                        {shareMode === 'email' ? 'Bestand verstuurd!' : 'Link gegenereerd!'}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {shareMode === 'email' 
                          ? 'Je bestand is succesvol verstuurd.'
                          : 'Je link is klaar om te delen.'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        value={shareUrl}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button 
                        onClick={copyToClipboard}
                        variant="outline"
                        className="shrink-0"
                      >
                        {urlCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Verloopt over {EXPIRATION_OPTIONS[expirationOption]?.label.toLowerCase()}
                    </p>
                  </div>
                </div>

                <Button 
                  onClick={() => {
                    setShareUrl('');
                    setMessage('');
                    setFile(null);
                    setFiles([]);
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Nog een bestand versturen
                </Button>
              </div>
            ) : (
              /* Upload Form */
              <div className="space-y-6">
                {/* Upload Area */}
                <ElectricBorder
                  color="#7df9ff"
                  speed={1}
                  chaos={0.5}
                  thickness={2}
                  className=""
                  style={{ borderRadius: 16 }}
                >
                  <div
                    className={`relative border-2 border-dashed rounded-lg p-8 transition-all ${
                      dragActive
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    disabled={isCurrentlyUploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    multiple
                  />
                  
                  {!file && files.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
                        <Upload className="h-10 w-10 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Upload je bestanden</h3>
                      <p className="text-sm text-muted-foreground mb-6">
                        Sleep bestanden hiernaartoe of klik om te bladeren
                      </p>
                      <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground mb-8">
                        <div className="flex items-center gap-2">
                          <HardDrive className="h-4 w-4" />
                          <span>Tot 2GB</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span>Alle types</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          <span>Supersnel</span>
                        </div>
                      </div>
                      
                      {/* Popular file types */}
                      <div className="border-t pt-8 mt-8">
                        <p className="text-sm font-semibold mb-6 text-center">Ondersteunde bestandstypes</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto">
                          <div className="flex flex-col items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all duration-200 group">
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                              <FileText className="h-6 w-6" />
                            </div>
                            <span className="text-xs font-medium">Documenten</span>
                          </div>
                          <div className="flex flex-col items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all duration-200 group">
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                              <ImageIcon className="h-6 w-6" />
                            </div>
                            <span className="text-xs font-medium">Afbeeldingen</span>
                          </div>
                          <div className="flex flex-col items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all duration-200 group">
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                              <Video className="h-6 w-6" />
                            </div>
                            <span className="text-xs font-medium">Video's</span>
                          </div>
                          <div className="flex flex-col items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all duration-200 group">
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                              <Archive className="h-6 w-6" />
                            </div>
                            <span className="text-xs font-medium">Archieven</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {file && !isFolder && (
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{file.name}</p>
                              <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFile(null);
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      {isFolder && files.length > 0 && (
                        <div className="p-3 bg-muted rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium text-sm">
                                  {files.length} bestanden
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatFileSize(files.reduce((sum, f) => sum + f.size, 0))}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFiles([]);
                                setIsFolder(false);
                                if (fileInputRef.current) fileInputRef.current.value = '';
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                </ElectricBorder>

                {/* Form - Only show when file is selected */}
                {(file || files.length > 0) && !isCurrentlyUploading && (
                  <div className="space-y-6">
                    {/* Share Mode */}
                    <div>
                      <Label className="text-sm font-medium mb-3 block">Hoe wil je delen?</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setShareMode('link')}
                          className={`p-4 rounded-lg border-2 transition-all text-left ${
                            shareMode === 'link'
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <LinkIcon className="h-5 w-5 mb-2" />
                          <div className="font-medium text-sm">Link</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShareMode('email')}
                          className={`p-4 rounded-lg border-2 transition-all text-left ${
                            shareMode === 'email'
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <Mail className="h-5 w-5 mb-2" />
                          <div className="font-medium text-sm">Email</div>
                        </button>
                      </div>
                    </div>

                    {/* Recipients */}
                    <div>
                      <Label className="text-sm font-medium mb-2 block">
                        {shareMode === 'email' ? 'Naar wie?' : 'Jouw email'}
                      </Label>
                      {shareMode === 'email' ? (
                        <div className="space-y-2">
                          {recipients.map((recipient, index) => (
                            <div key={index} className="flex gap-2">
                              <Input
                                type="email"
                                value={recipient}
                                onChange={(e) => updateRecipient(index, e.target.value)}
                                placeholder={`email${index + 1}@example.com`}
                                disabled={isCurrentlyUploading}
                              />
                              {recipients.length > 1 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => removeRecipient(index)}
                                  disabled={isCurrentlyUploading}
                                >
                                  <X className="h-4 w-4" />
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
                              disabled={isCurrentlyUploading}
                              className="w-full"
                            >
                              + Toevoegen
                            </Button>
                          )}
                        </div>
                      ) : (
                        <Input
                          type="email"
                          value={recipients[0]}
                          onChange={(e) => updateRecipient(0, e.target.value)}
                          placeholder="jij@example.com"
                          disabled={isCurrentlyUploading}
                        />
                      )}
                    </div>

                    {/* Quick Settings */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium mb-2 block flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Vervaltijd
                        </Label>
                        <select
                          value={expirationOption}
                          onChange={(e) => setExpirationOption(e.target.value as ExpirationOption)}
                          disabled={isCurrentlyUploading}
                          className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
                        >
                          {Object.entries(EXPIRATION_OPTIONS).map(([key, option]) => (
                            <option key={key} value={key}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Label className="text-sm font-medium mb-2 block flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Beveiliging
                        </Label>
                        <select
                          value={accessControl}
                          onChange={(e) => setAccessControl(e.target.value as AccessControl)}
                          disabled={isCurrentlyUploading}
                          className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
                        >
                          <option value="public">Openbaar</option>
                          <option value="password">Wachtwoord</option>
                          <option value="authenticated">Inlog</option>
                        </select>
                      </div>
                    </div>

                    {/* Password */}
                    {accessControl === 'password' && (
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Wachtwoord</Label>
                        <Input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Voer wachtwoord in"
                          disabled={isCurrentlyUploading}
                        />
                      </div>
                    )}

                    {/* Advanced Options */}
                    <div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="gap-2 -ml-3"
                      >
                        <Settings className="h-4 w-4" />
                        Meer opties
                        {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>

                      {showAdvanced && (
                        <div className="space-y-4 mt-4 p-4 bg-muted/50 rounded-lg">
                          <div>
                            <Label className="text-sm font-medium mb-2 block">Titel</Label>
                            <Input
                              type="text"
                              value={title}
                              onChange={(e) => setTitle(e.target.value)}
                              placeholder="Optioneel"
                              disabled={isCurrentlyUploading}
                              maxLength={100}
                            />
                          </div>

                          <div>
                            <Label className="text-sm font-medium mb-2 block">Bericht</Label>
                            <textarea
                              value={messageText}
                              onChange={(e) => setMessageText(e.target.value)}
                              placeholder="Optioneel bericht..."
                              disabled={isCurrentlyUploading}
                              maxLength={500}
                              rows={3}
                              className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm resize-none"
                            />
                          </div>

                          <div>
                            <Label className="text-sm font-medium mb-2 block">Custom link</Label>
                            <Input
                              type="text"
                              value={customSlug}
                              onChange={(e) => setCustomSlug(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                              placeholder="mijn-link"
                              disabled={isCurrentlyUploading}
                              maxLength={50}
                            />
                          </div>

                          <div>
                            <Label className="text-sm font-medium mb-2 block">Download limiet</Label>
                            <Input
                              type="number"
                              value={maxDownloads}
                              onChange={(e) => setMaxDownloads(e.target.value ? parseInt(e.target.value) : '')}
                              placeholder="Onbeperkt"
                              disabled={isCurrentlyUploading}
                              min="1"
                              max="1000"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Upload Progress */}
                    {isCurrentlyUploading && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm font-medium">
                          <span>Uploaden</span>
                          <span>{uploadMethod === 'chunked' ? progress.percentage : uploadProgress}%</span>
                        </div>
                        <Progress 
                          value={uploadMethod === 'chunked' ? progress.percentage : uploadProgress} 
                          className="h-2" 
                        />
                        {uploadMethod === 'chunked' ? (
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{formatFileSize(progress.loaded)} / {formatFileSize(progress.total)}</span>
                            <span>{formatSpeed(progress.speed)}</span>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">{uploadStatus}</p>
                        )}
                      </div>
                    )}

                    {/* Error Message */}
                    {message && !shareUrl && (
                      <div className={`p-3 rounded-lg text-sm ${
                        message.includes('Error') || message.includes('failed')
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {message}
                      </div>
                    )}

                    {/* Upload Button */}
                    <Button
                      onClick={handleUpload}
                      disabled={(!file && !isFolder) || recipients.filter(r => r.trim()).length === 0 || isCurrentlyUploading}
                      className="w-full"
                      size="lg"
                    >
                      {isCurrentlyUploading ? (
                        <>
                          <Upload className="mr-2 h-5 w-5" />
                          {shareMode === 'email' ? 'Versturen...' : 'Uploaden...'}
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-5 w-5" />
                          {shareMode === 'email' ? 'Versturen' : 'Link genereren'}
                        </>
                      )}
                    </Button>
                  </div>
                )}
                
                {/* Google Ad - Bottom of form */}
                {!shareUrl && (
                  <div className="mt-8">
                    <GoogleAd 
                      adSlot="4137358694"
                      adFormat="auto"
                      fullWidthResponsive={true}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Visual/Background (60% width on large screens) */}
        <div className="hidden lg:flex flex-1 bg-gradient-to-br from-background via-muted/30 to-background items-center justify-center p-12 relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-20 left-20 w-72 h-72 bg-primary/30 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl"></div>
          </div>
          
          <div className="text-center max-w-xl relative z-10">
            {/* Icon with animated border */}
            <div className="relative inline-block mb-8">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
              <div className="relative w-40 h-40 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center border-2 border-primary/20 shadow-2xl">
                <Upload className="h-20 w-20 text-primary" />
              </div>
            </div>
            
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Veilig bestanden delen
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Upload tot 2GB gratis. Bestanden worden automatisch verwijderd na de vervaldatum.
            </p>
            
            {/* Feature highlights */}
            <div className="grid grid-cols-3 gap-6 mt-12">
              <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium">Beveiligd</span>
              </div>
              <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium">Supersnel</span>
              </div>
              <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium">Privé</span>
              </div>
            </div>
            
            {/* Google Ad - Responsive Banner */}
            <div className="mt-12">
              <GoogleAd 
                adSlot="8076603709"
                adFormat="auto"
                fullWidthResponsive={true}
                className="max-w-xl mx-auto"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
