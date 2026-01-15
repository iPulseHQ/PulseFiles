'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/theme-toggle';
import { useUser, useAuth, SignOutButton } from '@clerk/nextjs';
import { Files, Upload, LogOut, Clock, Download, Copy, Key, Plus, Trash2, FileText, Check, ExternalLink, Calendar } from 'lucide-react';
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

interface ApiKey {
  id: string;
  name: string;
  key_preview: string;
  created_at: string;
  last_used?: string;
  is_active: boolean;
  full_key?: string;
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'files' | 'api'>('files');
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loadingApiKeys, setLoadingApiKeys] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<ApiKey | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const router = useRouter();

  const fetchUserFiles = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/user/files', {
        headers: {
          'Authorization': `Bearer ${token}`,
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
  }, [getToken]);

  const fetchApiKeys = useCallback(async () => {
    setLoadingApiKeys(true);
    try {
      const token = await getToken();
      const response = await fetch('/api/api-keys', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.apiKeys || []);
      } else {
        setError('Failed to load API keys');
      }
    } catch {
      setError('Failed to load API keys');
    } finally {
      setLoadingApiKeys(false);
    }
  }, [getToken]);

  const createApiKey = async () => {
    if (!newKeyName.trim()) return;
    
    try {
      const token = await getToken();
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setNewlyCreatedKey(data.apiKey);
        setApiKeys(prev => [data.apiKey, ...prev]);
        setNewKeyName('');
        setShowNewKeyDialog(false);
      } else {
        setError('Failed to create API key');
      }
    } catch {
      setError('Failed to create API key');
    }
  };

  const deleteApiKey = async (keyId: string) => {
    if (!confirm('Weet je zeker dat je deze API key wilt verwijderen?')) return;
    
    try {
      const token = await getToken();
      const response = await fetch(`/api/api-keys?id=${keyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setApiKeys(prev => prev.filter(key => key.id !== keyId));
      } else {
        setError('Failed to delete API key');
      }
    } catch {
      setError('Failed to delete API key');
    }
  };

  useEffect(() => {
    if (!isLoaded) return;
    
    if (!user) {
      window.location.href = '/sign-in';
      return;
    }

    if (user) {
      fetchUserFiles();
      if (activeTab === 'api') {
        fetchApiKeys();
      }
    }
  }, [user, isLoaded, router, fetchUserFiles, activeTab, fetchApiKeys]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const copyShareUrl = async (fileId: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const shareUrl = `${baseUrl}/download/${fileId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedId(fileId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const copyApiKey = async (apiKey: string, keyId: string) => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopiedId(keyId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date() > new Date(expiresAt);
  };

  if (!isLoaded || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
<Link href="/" className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
                <Upload className="h-5 w-5" />
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-xl font-semibold leading-tight">
                  PulseFiles
                </span>
                <a 
                  href="https://ipulse.one" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  by iPulse
                </a>
              </div>
            </Link>

            {/* Right side */}
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline">Nieuw Upload</span>
                </Button>
              </Link>
              <SignOutButton>
                <Button variant="ghost" size="sm" className="gap-2">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Uitloggen</span>
                </Button>
              </SignOutButton>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Hallo, {user?.firstName || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'daar'}! 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Beheer je gedeelde bestanden en API keys
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('files')}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeTab === 'files'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Files className="inline-block h-4 w-4 mr-2" />
            Mijn Bestanden
            {activeTab === 'files' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab('api');
              if (apiKeys.length === 0) fetchApiKeys();
            }}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeTab === 'api'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Key className="inline-block h-4 w-4 mr-2" />
            API Keys
            {activeTab === 'api' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
            )}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        {/* Files Tab */}
        {activeTab === 'files' && (
          <div>
            {loadingFiles ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Bestanden laden...</p>
              </div>
            ) : files.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full mb-6">
                  <Files className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Nog geen bestanden</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Je hebt nog geen bestanden gedeeld
                </p>
                <Link href="/">
                  <Button className="gap-2">
                    <Upload className="h-4 w-4" />
                    Upload je eerste bestand
                  </Button>
                </Link>
              </Card>
            ) : (
              <div className="grid gap-4">
                {files.map((file) => {
                  const expired = isExpired(file.expires_at);
                  return (
                    <Card key={file.id} className={`p-6 ${expired ? 'opacity-60' : ''}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center shrink-0">
                              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-lg truncate">{file.file_name}</h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {formatFileSize(file.file_size)} • {file.file_type}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mt-4">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>Geüpload: {formatDate(file.created_at)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>
                                {expired ? 'Verlopen' : `Verloopt: ${formatDate(file.expires_at)}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Download className="h-4 w-4" />
                              <span>{file.download_count}x gedownload</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyShareUrl(file.id)}
                            className="gap-2"
                          >
                            {copiedId === file.id ? (
                              <>
                                <Check className="h-4 w-4" />
                                Gekopieerd!
                              </>
                            ) : (
                              <>
                                <Copy className="h-4 w-4" />
                                Kopieer Link
                              </>
                            )}
                          </Button>
                          <Link href={`/download/${file.id}`} target="_blank">
                            <Button variant="outline" size="sm" className="gap-2">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* API Keys Tab */}
        {activeTab === 'api' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold mb-1">API Keys</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Gebruik API keys om programmatisch bestanden te delen
                </p>
              </div>
              <Button
                onClick={() => setShowNewKeyDialog(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Nieuwe Key
              </Button>
            </div>

            {/* New Key Dialog */}
            {showNewKeyDialog && (
              <Card className="p-6 mb-6 border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold text-lg mb-4">Nieuwe API Key aanmaken</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="keyName" className="mb-2 block">
                      Key Naam
                    </Label>
                    <Input
                      id="keyName"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="Bijv. Production App"
                      className="max-w-md"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={createApiKey} disabled={!newKeyName.trim()}>
                      Aanmaken
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setShowNewKeyDialog(false);
                      setNewKeyName('');
                    }}>
                      Annuleren
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Newly Created Key */}
            {newlyCreatedKey && (
              <Card className="p-6 mb-6 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center shrink-0">
                    <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-green-900 dark:text-green-100 mb-1">
                      API Key Aangemaakt!
                    </h3>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Kopieer deze key nu - je kunt hem later niet meer zien
                    </p>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-lg p-4 font-mono text-sm break-all">
                  {newlyCreatedKey.full_key}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={() => copyApiKey(newlyCreatedKey.full_key!, newlyCreatedKey.id)}
                    className="gap-2"
                  >
                    {copiedId === newlyCreatedKey.id ? (
                      <>
                        <Check className="h-4 w-4" />
                        Gekopieerd!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Kopieer Key
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setNewlyCreatedKey(null)}
                  >
                    Sluiten
                  </Button>
                </div>
              </Card>
            )}

            {/* API Keys List */}
            {loadingApiKeys ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">API Keys laden...</p>
              </div>
            ) : apiKeys.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full mb-6">
                  <Key className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Nog geen API Keys</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Maak je eerste API key aan om te beginnen
                </p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {apiKeys.map((key) => (
                  <Card key={key.id} className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                            <Key className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{key.name}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                              {key.key_preview}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mt-4">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>Aangemaakt: {formatDate(key.created_at)}</span>
                          </div>
                          {key.last_used && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>Laatst gebruikt: {formatDate(key.last_used)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteApiKey(key.id)}
                        className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                      >
                        <Trash2 className="h-4 w-4" />
                        Verwijderen
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
