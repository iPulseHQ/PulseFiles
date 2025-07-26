'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ThemeToggle } from '@/components/theme-toggle';
import { useUser } from '@clerk/nextjs';
import { Save, ArrowLeft, Settings, Info } from 'lucide-react';
import Link from 'next/link';

export default function AccountPage() {
  const { user, isLoaded } = useUser();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return; // Wait for Clerk to load
    
    if (!user) {
      // Redirect to Clerk hosted login
      const clerkSignInUrl = `https://lucky-gannet-78.accounts.dev/sign-in?redirect_url=${encodeURIComponent(window.location.href)}`;
      window.location.href = clerkSignInUrl;
      return;
    }

    // Load current profile data from Clerk
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setDisplayName(`${user.firstName || ''} ${user.lastName || ''}`.trim());
    }
  }, [user, isLoaded, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Update user profile via Clerk
      await user.update({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });

      setSuccess('Profile updated successfully!');
    } catch (error) {
      setError('Failed to update profile');
      console.error('Profile update error:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isLoaded) {
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
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          
          <div className="flex items-center gap-3">
            <Link href="/info">
              <Button variant="ghost" size="sm">
                <Info className="h-4 w-4 mr-2" />
                Info
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Settings className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Account Settings</CardTitle>
            <CardDescription>
              Manage your profile information
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Email Address</Label>
              <Input
                value={user?.primaryEmailAddress?.emailAddress || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email address cannot be changed
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name (Optional)</Label>
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={`${firstName.trim()} ${lastName.trim()}` || 'Display name'}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to use &quot;First Name Last Name&quot;
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-sm text-muted-foreground">Preview</Label>
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm">
                    You will appear as: <span className="font-medium">
                      {displayName.trim() || `${firstName.trim()} ${lastName.trim()}` || 'Your Name'}
                    </span>
                  </p>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={saving}
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}