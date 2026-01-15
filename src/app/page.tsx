'use client';

import { useState, useEffect, useRef } from 'react';
import { Upload, Mail, Clock, Lock, X, ChevronDown, ChevronUp, Settings, User, Send, Link as LinkIcon, Check, Shield, FileText, Copy, HardDrive, Zap, ImageIcon, Video, Archive, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';
import ElectricBorder from '@/components/ElectricBorder';
import GoogleAd from '@/components/GoogleAd';
import { useChunkedUpload } from '@/hooks/useChunkedUpload';
import { EXPIRATION_OPTIONS, type ExpirationOption, type AccessControl, validateEmails, validateFolderUpload } from '@/lib/security';
import { useUser, useAuth } from '@clerk/nextjs';
import { useLanguage } from '@/contexts/LanguageContext';
import { getExpirationLabel } from '@/lib/translations';
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

export default function Home() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const { t, language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  const { uploadFile, abortUpload: _abortUpload, isUploading, progress } = useChunkedUpload({
    accessToken: undefined,
    onError: (error) => {
      setMessage(`Error: ${error}`);
    },
    onSuccess: (result) => {
      setMessage(result.message);
      setShareUrl(result.shareUrl);
      setUrlCopied(false);
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  });

  // Removed automatic redirect - users can use the app without logging in
  // They'll be prompted to login when trying to upload files

  useEffect(() => {
    if (shareMode === 'link' && user?.primaryEmailAddress?.emailAddress && (!recipients[0] || recipients[0].trim() === '')) {
      setRecipients([user.primaryEmailAddress.emailAddress]);
    } else if (shareMode === 'email' && recipients[0] !== '') {
      setRecipients(['']);
    }
  }, [user?.primaryEmailAddress?.emailAddress, shareMode, recipients]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t.loading}</p>
        </div>
      </div>
    );
  }

  // Users can view the app without being logged in
  // Upload functionality will require authentication

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
      
      // Voeg nieuwe bestanden toe aan bestaande files
      setFiles(prevFiles => [...prevFiles, ...droppedFiles]);
      setIsFolder(droppedFiles.length > 1 || files.length > 0);
      
      // Gebruik chunked upload voor grote bestanden
      const hasLargeFile = droppedFiles.some(f => f.size > 50 * 1024 * 1024);
      setUploadMethod(hasLargeFile ? 'chunked' : 'standard');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      
      // Voeg nieuwe bestanden toe aan bestaande files
      setFiles(prevFiles => [...prevFiles, ...selectedFiles]);
      setIsFolder(selectedFiles.length > 1 || files.length > 0);
      
      // Gebruik chunked upload voor grote bestanden
      const hasLargeFile = selectedFiles.some(f => f.size > 50 * 1024 * 1024);
      setUploadMethod(hasLargeFile ? 'chunked' : 'standard');
      setMessage('');
    }
  };

  const removeFile = (index: number) => {
    setFiles(prevFiles => {
      const newFiles = prevFiles.filter((_, i) => i !== index);
      if (newFiles.length === 0) {
        setIsFolder(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
      return newFiles;
    });
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
    if (files.length === 0) {
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
      // Voor shareLink mode: email is optioneel (alleen voor notificatie)
      if (recipients[0] && recipients[0].trim()) {
        const { valid, invalid } = validateEmails([recipients[0]]);
        if (invalid.length > 0) {
          setMessage('Voer een geldig email adres in');
          return;
        }
        emailsToSend = valid;
      }
      // Als geen email is ingevuld, gewoon een lege array gebruiken
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
    
    if (files.length > 1) {
      files.forEach((file) => {
        formData.append(`files`, file);
      });
      formData.append('isFolder', 'true');
      formData.append('folderName', files[0].webkitRelativePath?.split('/')[0] || 'Upload');
    } else if (files.length === 1) {
      formData.append('file', files[0]);
      formData.append('isFolder', 'false');
    }

    formData.append('shareMode', shareMode);
    formData.append('recipients', JSON.stringify(emailsToSend));
    formData.append('title', title.trim() || (files[0]?.name || 'Shared File'));
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
    if (files.length === 0) {
      setMessage('Selecteer eerst een bestand');
      return;
    }
    
    if (files.length > 1) {
      setMessage('Chunked upload wordt nog niet ondersteund voor meerdere bestanden.');
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
      // Voor shareLink mode: email is optioneel (alleen voor notificatie)
      if (recipients[0] && recipients[0].trim()) {
        const { valid, invalid } = validateEmails([recipients[0]]);
        if (invalid.length > 0) {
          setMessage('Voer een geldig email adres in');
          return;
        }
        emailsToSend = valid;
      }
      // Als geen email is ingevuld, gewoon een lege array gebruiken
    }

    if (accessControl === 'password' && !password.trim()) {
      setMessage('Voer een wachtwoord in');
      return;
    }

    setMessage('');
    setShareUrl('');

    try {
      const token = await getToken();
      await uploadFile(files[0], emailsToSend[0], expirationOption, customSlug, shareMode, {
        recipients: emailsToSend,
        title: title.trim() || files[0].name,
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
<div className="flex items-center gap-3">
              <Link href="/" className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
                <Upload className="h-5 w-5" />
              </Link>
              <div className="hidden sm:flex flex-col">
                <Link href="/" className="text-xl font-semibold leading-tight hover:text-primary transition-colors">
                  {t.appName}
                </Link>
                <a 
                  href="https://ipulse.one" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  by iPulse
                </a>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />

              {user ? (
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">{t.myFiles}</span>
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    window.location.href = '/sign-in';
                  }}
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.login}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - WeTransfer Style Layout */}
      <main className="flex-1 flex">
        {/* Left Column - Upload Form (40% width on large screens) */}
        <div className="w-full lg:w-2/5 p-6 sm:p-8 lg:p-12 overflow-y-auto flex items-center">
          <div className="max-w-lg w-full">

            {/* Success State - Enhanced */}
            {shareUrl && !isCurrentlyUploading ? (
              <div className="space-y-6">
                {/* Success Banner */}
                <div className="relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-2 border-green-200 dark:border-green-800 rounded-2xl p-8">
                  <div className="relative z-10">
                    <div className="flex items-start gap-4 mb-6">
                      <div className="flex-shrink-0 w-14 h-14 rounded-full bg-green-500 dark:bg-green-600 flex items-center justify-center shadow-lg">
                        <Check className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-green-900 dark:text-green-100 mb-2">
                          {shareMode === 'email' ? t.fileSent : t.linkGenerated}
                        </h2>
                        <p className="text-green-700 dark:text-green-300">
                          {shareMode === 'email' 
                            ? t.fileSentSuccessfully
                            : t.linkReadyToShare}
                        </p>
                      </div>
                    </div>

                    {/* Share Link - Prominent */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-green-900 dark:text-green-100">
                        {t.yourShareLink}
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          value={shareUrl}
                          readOnly
                          className="h-12 font-mono text-sm bg-white dark:bg-slate-900 border-2 border-green-200 dark:border-green-800 focus:border-green-400 dark:focus:border-green-600"
                        />
                        <Button 
                          onClick={copyToClipboard}
                          variant="default"
                          size="lg"
                          className="h-12 px-6 bg-green-600 hover:bg-green-700 text-white shadow-lg"
                        >
                          {urlCopied ? (
                            <>
                              <Check className="h-5 w-5 mr-2" />
                              {t.copied}
                            </>
                          ) : (
                            <>
                              <Copy className="h-5 w-5 mr-2" />
                              {t.copy}
                            </>
                          )}
                        </Button>
                      </div>
                      
                      {/* Info badges */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/60 dark:bg-slate-900/60 rounded-full text-xs font-medium text-green-800 dark:text-green-200">
                          <Clock className="h-3.5 w-3.5" />
                          {t.expiresOver} {getExpirationLabel(expirationOption, language)}
                        </div>
                        {accessControl === 'password' && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/60 dark:bg-slate-900/60 rounded-full text-xs font-medium text-green-800 dark:text-green-200">
                            <Lock className="h-3.5 w-3.5" />
                            {t.protectedWithPassword}
                          </div>
                        )}
                        {maxDownloads && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/60 dark:bg-slate-900/60 rounded-full text-xs font-medium text-green-800 dark:text-green-200">
                            <Download className="h-3.5 w-3.5" />
                            {t.maxDownloads} {maxDownloads} {t.downloads}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Background decoration */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-green-200 dark:bg-green-900 rounded-full blur-3xl opacity-20 -mr-32 -mt-32"></div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    onClick={() => {
                      setShareUrl('');
                      setMessage('');
                      setFiles([]);
                      setIsFolder(false);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    variant="outline"
                    size="lg"
                    className="h-12 font-semibold"
                  >
                    <Upload className="mr-2 h-5 w-5" />
                    {t.newUpload}
                  </Button>
                  
                  {user && (
                    <Link href="/dashboard" className="flex-1">
                      <Button 
                        variant="default"
                        size="lg"
                        className="w-full h-12 font-semibold"
                      >
                        <User className="mr-2 h-5 w-5" />
                        {t.myFiles}
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              /* Upload Form */
              <div className="space-y-6">
                {/* Login Notice for non-authenticated users - Only show when file is selected */}
                {!user && files.length > 0 && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                          {t.tipLoginTitle}
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          {t.tipLoginDescription}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
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
                    style={{ pointerEvents: files.length > 0 ? 'none' : 'auto' }}
                    multiple
                  />
                  
                  {files.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
                        <Upload className="h-10 w-10 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">{t.uploadTitle}</h3>
                      <p className="text-sm text-muted-foreground mb-6">
                        {t.dragDropText}
                      </p>
                      <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground mb-8">
                        <div className="flex items-center gap-2">
                          <HardDrive className="h-4 w-4" />
                          <span>{t.upTo2GB}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span>{t.allTypes}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          <span>{t.superFast}</span>
                        </div>
                      </div>
                      
                      {/* Popular file types */}
                      <div className="border-t pt-8 mt-8">
                        <p className="text-sm font-semibold mb-6 text-center">{t.supportedFileTypes}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto">
                          <div className="flex flex-col items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all duration-200 group">
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                              <FileText className="h-6 w-6" />
                            </div>
                            <span className="text-xs font-medium">{t.documents}</span>
                          </div>
                          <div className="flex flex-col items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all duration-200 group">
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                              <ImageIcon className="h-6 w-6" />
                            </div>
                            <span className="text-xs font-medium">{t.images}</span>
                          </div>
                          <div className="flex flex-col items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all duration-200 group">
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                              <Video className="h-6 w-6" />
                            </div>
                            <span className="text-xs font-medium">{t.videos}</span>
                          </div>
                          <div className="flex flex-col items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all duration-200 group">
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                              <Archive className="h-6 w-6" />
                            </div>
                            <span className="text-xs font-medium">{t.archives}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4">
                      {files.length > 0 && (
                        <div className="space-y-2">
                          {files.length > 1 && (
                            <div className="flex items-center justify-between p-3 bg-muted/50 border border-border rounded-lg mb-3">
                              <div className="flex items-center gap-2">
                                <Archive className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">
                                  {files.length} {t.filesSelected}
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground font-medium">
                                {t.total}: {formatFileSize(files.reduce((sum, f) => sum + f.size, 0))}
                              </span>
                            </div>
                          )}
                          {files.map((file, index) => (
                            <div key={`${file.name}-${index}`} className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-xl hover:bg-primary/10 transition-colors">
                              <div className="flex items-center gap-4 min-w-0 flex-1">
                                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <FileText className="h-6 w-6 text-primary" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-sm truncate mb-1">{file.name}</p>
                                  <p className="text-xs text-muted-foreground font-medium">{formatFileSize(file.size)}</p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  removeFile(index);
                                }}
                                disabled={isCurrentlyUploading}
                                className="shrink-0 hover:bg-destructive/10 hover:text-destructive"
                              >
                                <X className="h-5 w-5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Upload Progress - Inline onder bestanden */}
                      {isCurrentlyUploading && (
                        <div className="mt-4 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-2 border-primary/30 rounded-xl p-5 space-y-4 shadow-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-base mb-1 flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-primary animate-pulse"></div>
                                {t.uploading}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {files.length === 1 ? files[0].name : `${files.length} ${t.filesSelected}`}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-3xl font-bold text-primary tabular-nums">
                                {uploadMethod === 'chunked' ? progress.percentage : uploadProgress}%
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Progress 
                              value={uploadMethod === 'chunked' ? progress.percentage : uploadProgress} 
                              className="h-3 shadow-inner" 
                            />
                            
                            {uploadMethod === 'chunked' ? (
                              <div className="flex justify-between text-xs text-muted-foreground font-medium">
                                <span>{formatFileSize(progress.loaded)} {t.of} {formatFileSize(progress.total)}</span>
                                <span className="font-mono flex items-center gap-1">
                                  <Zap className="h-3 w-3" />
                                  {formatSpeed(progress.speed)}
                                </span>
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground font-medium text-center">{uploadStatus}</p>
                            )}
                          </div>

                          {uploadMethod === 'chunked' && progress.speed > 0 && (
                            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2 border-t border-primary/20">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{t.estimatedTime}: {Math.ceil((progress.total - progress.loaded) / progress.speed)}s</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                </ElectricBorder>

                {/* Simple Form - Only show when file is selected */}
                {files.length > 0 && !isCurrentlyUploading && (
                  <div className="space-y-5">
                    {/* Main Settings Card */}
                    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                      {/* Share Mode Toggle */}
                      <div>
                        <Label className="text-sm font-semibold mb-3 block">{t.howToShare}</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setShareMode('link')}
                            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                              shareMode === 'link'
                                ? 'border-primary bg-primary/10 shadow-sm'
                                : 'border-border hover:border-primary/50 hover:bg-muted/50'
                            }`}
                          >
                            <div className={`p-2 rounded-lg ${shareMode === 'link' ? 'bg-primary/20' : 'bg-muted'}`}>
                              <LinkIcon className={`h-5 w-5 ${shareMode === 'link' ? 'text-primary' : 'text-muted-foreground'}`} />
                            </div>
                            <div className="text-left">
                              <div className="font-semibold text-sm">{t.shareLink}</div>
                              <div className="text-xs text-muted-foreground">{t.getShareLink}</div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setShareMode('email')}
                            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                              shareMode === 'email'
                                ? 'border-primary bg-primary/10 shadow-sm'
                                : 'border-border hover:border-primary/50 hover:bg-muted/50'
                            }`}
                          >
                            <div className={`p-2 rounded-lg ${shareMode === 'email' ? 'bg-primary/20' : 'bg-muted'}`}>
                              <Mail className={`h-5 w-5 ${shareMode === 'email' ? 'text-primary' : 'text-muted-foreground'}`} />
                            </div>
                            <div className="text-left">
                              <div className="font-semibold text-sm">{t.directEmail}</div>
                              <div className="text-xs text-muted-foreground">{t.sendViaEmail}</div>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Recipients - Simplified */}
                      <div>
                        <Label className="text-sm font-semibold mb-2 block">
                          {shareMode === 'email' ? t.toWho : t.yourEmail}
                        </Label>
                        {shareMode === 'email' ? (
                          <div className="space-y-2">
                            {recipients.map((recipient, index) => (
                              <div key={index} className="flex gap-2">
                                <Input
                                  type="email"
                                  value={recipient}
                                  onChange={(e) => updateRecipient(index, e.target.value)}
                                  placeholder={t.emailPlaceholder}
                                  className="h-11"
                                />
                                {recipients.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => removeRecipient(index)}
                                    className="h-11 w-11 shrink-0"
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
                                className="w-full h-10"
                              >
                                + {t.addRecipient}
                              </Button>
                            )}
                          </div>
                        ) : (
                          <Input
                            type="email"
                            value={recipients[0]}
                            onChange={(e) => updateRecipient(0, e.target.value)}
                            placeholder={t.yourEmailOptional}
                            className="h-11"
                          />
                        )}
                      </div>

                      {/* Quick Settings - More Prominent */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-medium mb-2 flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {t.expiresIn}
                          </Label>
                          <select
                            value={expirationOption}
                            onChange={(e) => setExpirationOption(e.target.value as ExpirationOption)}
                            className="w-full h-11 px-3 py-2 border border-border rounded-lg bg-background text-sm font-medium hover:border-primary/50 transition-colors"
                          >
                            {Object.entries(EXPIRATION_OPTIONS).map(([key, option]) => (
                              <option key={key} value={key}>
                                {getExpirationLabel(key, language)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <Label className="text-xs font-medium mb-2 flex items-center gap-1.5 text-muted-foreground">
                            <Shield className="h-3.5 w-3.5" />
                            {t.security}
                          </Label>
                          <select
                            value={accessControl}
                            onChange={(e) => setAccessControl(e.target.value as AccessControl)}
                            className="w-full h-11 px-3 py-2 border border-border rounded-lg bg-background text-sm font-medium hover:border-primary/50 transition-colors"
                          >
                            <option value="public">{t.public}</option>
                            <option value="password">{t.password}</option>
                            <option value="authenticated">{t.loginRequired}</option>
                          </select>
                        </div>
                      </div>

                      {/* Password - Inline with better styling */}
                      {accessControl === 'password' && (
                        <div className="pt-2">
                          <Label className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            {t.setPassword}
                          </Label>
                          <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t.enterStrongPassword}
                            className="h-11"
                          />
                        </div>
                      )}
                    </div>

                    {/* Advanced Options - Collapsible */}
                    <div className="border border-border rounded-xl overflow-hidden">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="w-full h-12 justify-between px-5 hover:bg-muted/50 rounded-none"
                      >
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          <span className="font-semibold">{t.advancedOptions}</span>
                        </div>
                        {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>

                      {showAdvanced && (
                        <div className="space-y-4 p-5 border-t bg-muted/30">
                          <div>
                            <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              {t.title}
                            </Label>
                            <Input
                              type="text"
                              value={title}
                              onChange={(e) => setTitle(e.target.value)}
                              placeholder={t.giveUploadName}
                              className="h-11"
                              maxLength={100}
                            />
                          </div>

                          <div>
                            <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              {t.personalMessage}
                            </Label>
                            <textarea
                              value={messageText}
                              onChange={(e) => setMessageText(e.target.value)}
                              placeholder={t.addMessageForRecipient}
                              maxLength={500}
                              rows={3}
                              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <p className="text-xs text-muted-foreground mt-1">{messageText.length}/500 {t.charactersLimit}</p>
                          </div>

                          <div>
                            <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                              <LinkIcon className="h-4 w-4" />
                              {t.customLinkURL}
                            </Label>
                            <Input
                              type="text"
                              value={customSlug}
                              onChange={(e) => setCustomSlug(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                              placeholder={t.customLinkPlaceholder}
                              className="h-11 font-mono"
                              maxLength={50}
                            />
                            {customSlug && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {t.linkWillBe} {process.env.NEXT_PUBLIC_SITE_URL}/download/{customSlug}
                              </p>
                            )}
                          </div>

                          <div>
                            <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                              <Download className="h-4 w-4" />
                              {t.downloadLimit}
                            </Label>
                            <Input
                              type="number"
                              value={maxDownloads}
                              onChange={(e) => setMaxDownloads(e.target.value ? parseInt(e.target.value) : '')}
                              placeholder={t.unlimitedDownloads}
                              className="h-11"
                              min="1"
                              max="1000"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              {t.limitDownloadTimes}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Error/Status Message */}
                    {message && !shareUrl && (
                      <div className={`p-4 rounded-xl border-2 text-sm flex items-start gap-3 ${
                        message.includes('Error') || message.includes('failed') || message.includes('mislukt')
                          ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200'
                          : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200'
                      }`}>
                        <div className="shrink-0 mt-0.5">
                          {message.includes('Error') || message.includes('failed') || message.includes('mislukt') ? (
                            <X className="h-5 w-5" />
                          ) : (
                            <Shield className="h-5 w-5" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{message}</p>
                        </div>
                      </div>
                    )}

                    {/* Upload Button - Large and Prominent */}
                    <Button
                      onClick={handleUpload}
                      disabled={files.length === 0 || (shareMode === 'email' && recipients.filter(r => r.trim()).length === 0) || isCurrentlyUploading}
                      className="w-full h-14 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                      size="lg"
                    >
                      {isCurrentlyUploading ? (
                        <>
                          <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                          {shareMode === 'email' ? t.beingSent : t.beingUploaded}
                        </>
                      ) : (
                        <>
                          <Send className="mr-3 h-5 w-5" />
                          {shareMode === 'email' ? t.sendFile : t.generateShareLink}
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
              {t.secureFileSharing}
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              {t.secureFileSharingDescription}
            </p>
            
            {/* Feature highlights */}
            <div className="grid grid-cols-3 gap-6 mt-12">
              <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium">{t.secured}</span>
              </div>
              <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium">{t.superFast}</span>
              </div>
              <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium">{t.private}</span>
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
