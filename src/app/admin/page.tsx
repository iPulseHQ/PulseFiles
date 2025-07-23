'use client';

import { useState, useEffect } from 'react';
import { Shield, Trash2, BarChart3, Clock, Server, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ThemeToggle } from '@/components/theme-toggle';
import { EXPIRATION_OPTIONS, type ExpirationOption } from '@/lib/security';

interface CleanupStats {
  totalFiles: number;
  totalSize: number;
  expiredFiles: number;
  expiredSize: number;
  storageUsed: string;
  canFreeUp: string;
}

interface CleanupResultData {
  deletedFiles: number;
  deletedSize: number;
  errors: string[];
  duration: number;
}

export default function AdminPage() {
  const [apiKey, setApiKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [stats, setStats] = useState<CleanupStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [defaultExpiration, setDefaultExpiration] = useState<ExpirationOption>('7days');
  const [cleanupResults, setCleanupResults] = useState<CleanupResultData | null>(null);

  useEffect(() => {
    // Check if we have a stored API key
    const storedKey = localStorage.getItem('admin_api_key');
    if (storedKey) {
      setApiKey(storedKey);
      setIsAuthenticated(true);
      loadStats(storedKey);
    }
  }, []);

  const authenticate = () => {
    if (!apiKey.trim()) {
      setMessage('Please enter an API key');
      return;
    }
    
    localStorage.setItem('admin_api_key', apiKey);
    setIsAuthenticated(true);
    loadStats(apiKey);
  };

  const logout = () => {
    localStorage.removeItem('admin_api_key');
    setIsAuthenticated(false);
    setApiKey('');
    setStats(null);
    setMessage('');
  };

  const loadStats = async (key: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/cleanup', {
        headers: {
          'x-api-key': key
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          setMessage('Invalid API key');
          setIsAuthenticated(false);
          localStorage.removeItem('admin_api_key');
          return;
        }
        throw new Error('Failed to load stats');
      }

      const data = await response.json();
      setStats(data.stats);
      setMessage('');
    } catch (error) {
      setMessage('Failed to load statistics');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const runCleanup = async (action: string) => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({ action })
      });

      if (!response.ok) {
        throw new Error('Cleanup failed');
      }

      const data = await response.json();
      setCleanupResults(data.result);
      setMessage(`✅ ${data.action} completed successfully`);
      
      // Reload stats
      await loadStats(apiKey);
      
    } catch (error) {
      setMessage(`❌ Cleanup failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Admin Access</CardTitle>
            <CardDescription>
              Enter your admin API key to access system management
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter admin API key"
                onKeyPress={(e) => e.key === 'Enter' && authenticate()}
              />
            </div>
            
            <Button onClick={authenticate} className="w-full">
              <Shield className="mr-2 h-4 w-4" />
              Authenticate
            </Button>
            
            {message && (
              <Alert variant={message.includes('Invalid') ? 'destructive' : 'default'}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">System management and cleanup tools</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button onClick={logout} variant="outline">
              Logout
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Files</p>
                    <p className="text-2xl font-bold">{stats.totalFiles}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Storage Used</p>
                    <p className="text-2xl font-bold">{stats.storageUsed}</p>
                  </div>
                  <Server className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Expired Files</p>
                    <p className="text-2xl font-bold text-red-600">{stats.expiredFiles}</p>
                  </div>
                  <Clock className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Can Free Up</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.canFreeUp}</p>
                  </div>
                  <Trash2 className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Cron Setup Notice */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Automatic Cleanup Setup
            </CardTitle>
            <CardDescription>
              Configure automatic daily cleanup for your deployment platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>For Coolify/Docker deployments:</strong> The Vercel cron jobs don&apos;t work. 
                Set up external cron service (EasyCron.com) or GitHub Actions to call:
                <br />
                <code className="text-xs bg-muted px-1 py-0.5 rounded mt-1 inline-block">
                  GET {typeof window !== 'undefined' ? window.location.origin : ''}/api/cron/cleanup
                </code>
                <br />
                <small className="text-muted-foreground">
                  See COOLIFY-SETUP.md for detailed instructions.
                </small>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cleanup Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Cleanup Actions
              </CardTitle>
              <CardDescription>
                Manually trigger cleanup operations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <Button 
                  onClick={() => runCleanup('cleanup-expired')}
                  disabled={loading}
                  className="w-full justify-start"
                >
                  {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
                  Clean Expired Files
                </Button>
                
                <Button 
                  onClick={() => runCleanup('cleanup-orphaned')}
                  disabled={loading}
                  variant="outline"
                  className="w-full justify-start"
                >
                  {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Server className="mr-2 h-4 w-4" />}
                  Clean Orphaned Files
                </Button>
                
                <Button 
                  onClick={() => runCleanup('cleanup-all')}
                  disabled={loading}
                  variant="destructive"
                  className="w-full justify-start"
                >
                  {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  Full Cleanup
                </Button>
              </div>
              
              <Button 
                onClick={() => loadStats(apiKey)}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Refresh Stats
              </Button>
            </CardContent>
          </Card>

          {/* Expiration Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Default Expiration Settings
              </CardTitle>
              <CardDescription>
                Configure default file expiration times
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Default Expiration Time</Label>
                <select 
                  value={defaultExpiration}
                  onChange={(e) => setDefaultExpiration(e.target.value as ExpirationOption)}
                  className="w-full p-2 border rounded-md bg-background"
                >
                  {Object.entries(EXPIRATION_OPTIONS).map(([key, option]) => (
                    <option key={key} value={key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Changes will apply to new uploads. Existing files keep their original expiration.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>

        {/* Cleanup Results */}
        {cleanupResults && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Last Cleanup Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{cleanupResults.deletedFiles || 0}</p>
                  <p className="text-sm text-muted-foreground">Files Deleted</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {formatFileSize(cleanupResults.deletedSize || 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Space Freed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">{cleanupResults.duration || 0}ms</p>
                  <p className="text-sm text-muted-foreground">Duration</p>
                </div>
              </div>
              
              {cleanupResults.errors && cleanupResults.errors.length > 0 && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <details>
                      <summary>{cleanupResults.errors.length} errors occurred</summary>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        {cleanupResults.errors.map((error: string, index: number) => (
                          <li key={index} className="text-sm">{error}</li>
                        ))}
                      </ul>
                    </details>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Status Messages */}
        {message && (
          <Alert variant={message.includes('❌') ? 'destructive' : 'default'}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}