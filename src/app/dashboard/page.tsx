'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/theme-toggle';
import { useUser, useAuth, SignOutButton } from '@clerk/nextjs';
import { Files, Upload, LogOut, Clock, Download, Share, Copy, Settings, Key, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

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
  full_key?: string; // Only present when newly created
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
    if (!isLoaded) return; // Wait for Clerk to load
    
    if (!user) {
      // Redirect to Clerk hosted login
      const clerkSignInUrl = `https://lucky-gannet-78.accounts.dev/sign-in?redirect_url=${encodeURIComponent(window.location.href)}`;
      window.location.href = clerkSignInUrl;
      return;
    }

    if (user) {
      fetchUserFiles();
      if (activeTab === 'api') {
        fetchApiKeys();
      }
    }
  }, [user, isLoaded, router, fetchUserFiles, activeTab, fetchApiKeys]);

  const getUserDisplayName = () => {
    return user?.firstName || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'User';
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

  const copyShareUrl = async (fileId: string) => {
    // Use environment variable for production URL, fallback to current origin for development
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const shareUrl = `${baseUrl}/download/${fileId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      // You could add a toast notification here
      console.log('Share URL copied to clipboard');
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date() > new Date(expiresAt);
  };

  if (!isLoaded || loadingFiles) {
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
          {/* Left side - Title and User */}
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Files className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">{getUserDisplayName()}</p>
            </div>
          </div>
          
          {/* Right side - Navigation and Actions */}
          <div className="flex items-center gap-2">
            {/* Navigation */}
            <a href="https://pulseguard.nl" target="_blank" rel="noopener noreferrer">
              <Image src="/logolight.png" alt="PulseGuard" width={120} height={32} className="h-8 w-auto" />
            </a>
            
            {/* Primary Actions */}
            <Link href="/">
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Upload New
              </Button>
            </Link>
            
            {/* Settings & User Actions */}
            <Link href="/account">
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Account
              </Button>
            </Link>
            
            <ThemeToggle />
            
            <SignOutButton redirectUrl="/">
              <Button variant="ghost" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </SignOutButton>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 bg-muted p-1 rounded-lg w-fit">
          <Button
            variant={activeTab === 'files' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('files')}
            className="gap-2"
          >
            <Files className="h-4 w-4" />
            My Files
          </Button>
          <Button
            variant={activeTab === 'api' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('api')}
            className="gap-2"
          >
            <Key className="h-4 w-4" />
            API Keys
          </Button>
        </div>

        {/* Files Tab */}
        {activeTab === 'files' && (
          <>
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
          </>
        )}

        {/* API Keys Tab */}
        {activeTab === 'api' && (
          <div className="space-y-6">
            {/* API Keys Header */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">API Keys</h2>
                <p className="text-muted-foreground text-sm">
                  Create API keys to programmatically share files
                </p>
              </div>
              <Button
                onClick={() => setShowNewKeyDialog(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Create API Key
              </Button>
            </div>

            {/* New API Key Dialog */}
            {showNewKeyDialog && (
              <Card>
                <CardHeader>
                  <CardTitle>Create New API Key</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="keyName">API Key Name</Label>
                    <Input
                      id="keyName"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="My App API Key"
                      maxLength={50}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={createApiKey} disabled={!newKeyName.trim()}>
                      Create Key
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowNewKeyDialog(false);
                        setNewKeyName('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Newly Created Key Display */}
            {newlyCreatedKey && (
              <Alert>
                <Key className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">API Key Created Successfully!</p>
                    <p className="text-sm">
                      Save this key securely - you won&apos;t be able to see it again.
                    </p>
                    <div className="flex items-center gap-2 p-2 bg-muted rounded font-mono text-sm">
                      <code className="flex-1">{newlyCreatedKey.full_key}</code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(newlyCreatedKey.full_key!);
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setNewlyCreatedKey(null)}
                    >
                      Got it
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* API Keys List */}
            {loadingApiKeys ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading API keys...</p>
              </div>
            ) : apiKeys.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <CardTitle className="text-xl mb-2">No API Keys</CardTitle>
                  <CardDescription className="mb-6">
                    Create your first API key to start sharing files programmatically
                  </CardDescription>
                  <Button onClick={() => setShowNewKeyDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create API Key
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {apiKeys.map((apiKey) => (
                  <Card key={apiKey.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h3 className="font-medium">{apiKey.name}</h3>
                          <p className="text-sm text-muted-foreground font-mono">
                            {apiKey.key_preview}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Created {formatDate(apiKey.created_at)}</span>
                            {apiKey.last_used && (
                              <span>Last used {formatDate(apiKey.last_used)}</span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteApiKey(apiKey.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* API Documentation */}
            <Card>
              <CardHeader>
                <CardTitle>API Documentation</CardTitle>
                <CardDescription>
                  Use the PulseFiles API to share files programmatically
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Share a File</h4>
                  <div className="bg-muted p-3 rounded text-sm font-mono overflow-x-auto">
                    <code>{`curl -X POST ${process.env.NEXT_PUBLIC_SITE_URL || 'https://pulsefiles.app'}/api/share \\
  -H "x-api-key: pf_your_api_key_here" \\
  -F "file=@document.pdf" \\
  -F "title=My Document" \\
  -F "expiration=7days"`}</code>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Response</h4>
                  <div className="bg-muted p-3 rounded text-sm font-mono">
                    <code>{`{
  "success": true,
  "shareUrl": "${process.env.NEXT_PUBLIC_SITE_URL || 'https://pulsefiles.app'}/download/abc123",
  "fileId": "abc123",
  "title": "My Document",
  "expiresAt": "2024-01-01T00:00:00.000Z"
}`}</code>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}