'use client';

import { Clock, FileText, AlertTriangle, Lock, User, Folder, Upload, Shield, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@clerk/nextjs';
import DownloadSection from './download-section';
import Link from 'next/link';
import ElectricBorder from '@/components/ElectricBorder';

interface FileRecord {
  id: string;
  file_name: string;
  file_size: number;
  title: string | null;
  message: string | null;
  is_folder: boolean;
  total_files: number | null;
  created_at: string;
  expires_at: string;
  access_control: string;
  max_downloads: number | null;
  download_count: number;
  download_limit_reached: boolean;
}

interface DownloadPageClientProps {
  fileRecord: FileRecord;
  displayFilename: string;
  isExpired: boolean;
  downloadLimitReached: boolean;
  timeLeft: number;
}

function formatTimeLeft(milliseconds: number, t: any, language: string = 'nl') {
  const minutes = Math.floor(milliseconds / (1000 * 60));
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(milliseconds / (1000 * 60 * 60 * 24 * 7));

  // Fallback translations if t is undefined
  const fallbackTranslations = language === 'en' ? {
    weeks: 'weeks',
    days: 'days',
    hours: 'hours',
    minutes: 'minutes'
  } : {
    weeks: 'weken',
    days: 'dagen',
    hours: 'uur',
    minutes: 'minuten'
  };
  
  const translations = t || fallbackTranslations;

  if (weeks > 0) {
    return `${weeks} ${translations.weeks}`;
  } else if (days > 0) {
    return `${days} ${translations.days}`;
  } else if (hours > 0) {
    return `${hours} ${translations.hours}`;
  } else {
    return `${minutes} ${translations.minutes}`;
  }
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString: string, language: string = 'nl') {
  const date = new Date(dateString);
  // Use consistent formatting to avoid hydration mismatches
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  // Use DD-MM-YYYY format for Dutch, MM-DD-YYYY for English
  return language === 'nl' 
    ? `${day}-${month}-${year}`
    : `${month}-${day}-${year}`;
}

export default function DownloadPageClient({
  fileRecord,
  displayFilename,
  isExpired,
  downloadLimitReached,
  timeLeft,
}: DownloadPageClientProps) {
  const { t, language } = useLanguage();
  const { user } = useUser();
  const createdAt = new Date(fileRecord.created_at);

  if (isExpired || downloadLimitReached) {
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
          {/* Left Column - Download Content (40% width on large screens) */}
          <div className="w-full lg:w-2/5 p-6 sm:p-8 lg:p-12 overflow-y-auto flex items-center">
            <div className="max-w-lg w-full">
              <ElectricBorder
              color="#ef4444"
              speed={1}
              chaos={0.5}
              thickness={2}
              className="relative z-50"
              style={{ borderRadius: 24 }}
            >
              <Card className="border-0 shadow-none overflow-hidden rounded-3xl bg-card/95 backdrop-blur-sm">
                <CardHeader className="text-center pb-8 pt-12">
                  <CardTitle className="text-3xl font-bold text-destructive mb-3">
                    {isExpired ? t.linkExpired : t.downloadLimitReached}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {isExpired ? t.linkExpiredDescription : t.downloadLimitDescription}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-12">
                  <Alert variant="destructive" className="mb-6">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {isExpired 
                        ? t.linkExpiredMessage
                        : t.downloadLimitMessage
                            .replace('{count}', String(fileRecord.download_count))
                            .replace('{max}', String(fileRecord.max_downloads))
                      }
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3 bg-muted/30 p-6 rounded-xl">
                    <h3 className="font-semibold text-sm text-muted-foreground mb-4">{t.fileInformation}</h3>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">{fileRecord.is_folder ? t.folderName : t.fileName}</span>
                      <span className="font-medium truncate ml-2">{displayFilename}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">{t.size}</span>
                      <span className="font-medium">{formatFileSize(fileRecord.file_size)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">{t.uploaded}</span>
                      <span className="font-medium">{formatDate(fileRecord.created_at, language)}</span>
                    </div>
                  </div>

                  <div className="mt-8">
                    <Link href="/">
                      <button className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-colors">
                        {t.goToHomepage}
                      </button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </ElectricBorder>
            </div>
          </div>

          {/* Right Column - Visual/Background (60% width on large screens) */}
          <div className="hidden lg:flex flex-1 bg-gradient-to-br from-background via-muted/30 to-background items-center justify-center p-12 relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-20 left-20 w-72 h-72 bg-destructive/30 rounded-full blur-3xl"></div>
              <div className="absolute bottom-20 right-20 w-96 h-96 bg-destructive/20 rounded-full blur-3xl"></div>
            </div>
            
            <div className="text-center max-w-xl relative z-10">
              {/* Icon with animated border */}
              <div className="relative inline-block mb-8">
                <div className="absolute inset-0 bg-destructive/20 rounded-full blur-xl animate-pulse"></div>
                <div className="relative w-40 h-40 bg-gradient-to-br from-destructive/20 to-destructive/5 rounded-full flex items-center justify-center border-2 border-destructive/20 shadow-2xl">
                  <AlertTriangle className="h-20 w-20 text-destructive" />
                </div>
              </div>
              
              <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                {isExpired ? t.linkExpired : t.downloadLimitReached}
              </h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                {isExpired ? t.linkExpiredDescription : t.downloadLimitDescription}
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

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
        {/* Left Column - Download Content (40% width on large screens) */}
        <div className="w-full lg:w-2/5 p-6 sm:p-8 lg:p-12 overflow-y-auto flex items-center">
          <div className="max-w-lg w-full">
            <ElectricBorder
            color="#7df9ff"
            speed={1}
            chaos={0.5}
            thickness={2}
            className="relative z-50"
            style={{ borderRadius: 24 }}
          >
            <Card className="border-0 shadow-none overflow-hidden rounded-3xl bg-card/95 backdrop-blur-sm">
              <CardHeader className="text-center pb-8 pt-12">
                <CardTitle className="text-3xl font-bold mb-3">
                  {fileRecord.title || (fileRecord.is_folder ? t.folderDownload : t.fileDownload)}
                </CardTitle>
                <CardDescription className="text-base">
                  {fileRecord.is_folder ? t.folderReady : t.fileReady}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6 pb-12">
                {/* Display message if provided */}
                {fileRecord.message && (
                  <div className="bg-primary/5 p-6 rounded-xl border-l-4 border-primary">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1">{t.messageFromSender}</p>
                        <p className="text-sm text-muted-foreground italic">
                          &ldquo;{fileRecord.message}&rdquo;
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* File Information */}
                <div className="space-y-4 bg-muted/30 p-6 rounded-xl">
                  <h3 className="font-semibold text-sm text-muted-foreground mb-4 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {t.fileInformation}
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">{fileRecord.is_folder ? t.folderName : t.fileName}</span>
                      <span className="font-medium truncate ml-2 max-w-[60%] text-right">{displayFilename}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">{t.size}</span>
                      <span className="font-medium">{formatFileSize(fileRecord.file_size)}</span>
                    </div>
                    {fileRecord.is_folder && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">{t.files}:</span>
                        <span className="font-medium">{fileRecord.total_files} {t.files}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">{t.uploaded}</span>
                      <span className="font-medium">{formatDate(fileRecord.created_at, language)}</span>
                    </div>
                    {fileRecord.max_downloads && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">{t.downloadsCount}</span>
                        <span className="font-medium">{fileRecord.download_count || 0} / {fileRecord.max_downloads}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Security badges */}
                <div className="flex flex-wrap gap-2">
                  {fileRecord.access_control === 'password' && (
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg text-xs font-medium text-amber-800 dark:text-amber-200">
                      <Lock className="h-3.5 w-3.5" />
                      {t.passwordProtected}
                    </div>
                  )}
                  {fileRecord.access_control === 'authenticated' && (
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-medium text-blue-800 dark:text-blue-200">
                      <Shield className="h-3.5 w-3.5" />
                      {t.authenticationRequired}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg text-xs font-medium text-green-800 dark:text-green-200">
                    <Clock className="h-3.5 w-3.5" />
                    {t.expiresIn} {formatTimeLeft(timeLeft, t, language)}
                  </div>
                </div>

                {/* Download Section */}
                <DownloadSection 
                  shareId={fileRecord.id} 
                  accessControl={fileRecord.access_control}
                  isFolder={fileRecord.is_folder}
                />
              </CardContent>
              </Card>
            </ElectricBorder>
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
                {fileRecord.is_folder ? (
                  <Folder className="h-20 w-20 text-primary" />
                ) : (
                  <FileText className="h-20 w-20 text-primary" />
                )}
              </div>
            </div>
            
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {t.safeFileDownload}
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              {t.safeFileDownloadDescription}
            </p>
            
            {/* Feature highlights */}
            <div className="grid grid-cols-3 gap-4 mt-12">
              <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-center">{t.virusFree}</span>
                <span className="text-xs text-muted-foreground text-center">{t.virusFreeDescription}</span>
              </div>
              <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-center">{t.encryptedTransfer}</span>
                <span className="text-xs text-muted-foreground text-center">{t.encryptedTransferDescription}</span>
              </div>
              <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-center">{t.noMalware}</span>
                <span className="text-xs text-muted-foreground text-center">{t.noMalwareDescription}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
