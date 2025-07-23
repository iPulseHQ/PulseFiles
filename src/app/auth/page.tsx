'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuth } from '@/contexts/AuthContext';
import { User, LogIn, Github, ArrowLeft, Heart, Info } from 'lucide-react';
import Link from 'next/link';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const { signIn, signUp, signInWithOtp } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!email) {
      setError('Please enter your email');
      return;
    }

    if (isLogin && useMagicLink) {
      // Magic link login - only need email
    } else if (isLogin && !useMagicLink) {
      // Regular login - need email + password
      if (!password) {
        setError('Please enter your password');
        return;
      }
    } else if (!isLogin) {
      // Signup - need all fields
      if (!password || !firstName || !lastName) {
        setError('Please fill in all fields');
        return;
      }
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isLogin && useMagicLink) {
        // Magic link login
        const { error } = await signInWithOtp(email);
        if (error) {
          setError(error.message);
        } else {
          setSuccess('Check your email for the magic link!');
        }
      } else if (isLogin && !useMagicLink) {
        // Regular login
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
        } else {
          router.push('/dashboard');
        }
      } else if (!isLogin) {
        // Signup
        const { error } = await signUp({
          email,
          password,
          firstName,
          lastName,
        });
        if (error) {
          setError(error.message);
        } else {
          setSuccess('Account created! Check your email for the confirmation link.');
        }
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4 flex items-center gap-3">
        <Link href="/info">
          <Button variant="ghost" size="sm">
            <Info className="h-4 w-4 mr-2" />
            Info
          </Button>
        </Link>
        <ThemeToggle />
      </div>
      
      {/* Back to upload button */}
      <div className="absolute top-4 left-4">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Upload
          </Button>
        </Link>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            {isLogin ? (
              <LogIn className="h-6 w-6 text-primary" />
            ) : (
              <User className="h-6 w-6 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </CardTitle>
          <CardDescription>
            {isLogin 
              ? 'Sign in to manage your files' 
              : 'Sign up to track your shared files'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
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

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name fields for signup */}
            {!isLogin && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
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
                  <Label htmlFor="lastName">Last Name</Label>
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
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>
            
            {/* Password field OR magic link toggle for login */}
            {isLogin ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Authentication</Label>
                  <button
                    type="button"
                    onClick={() => setUseMagicLink(!useMagicLink)}
                    className="text-sm text-primary hover:underline"
                  >
                    {useMagicLink ? 'Use password instead' : 'Use magic link instead'}
                  </button>
                </div>
                
                {!useMagicLink ? (
                  <div className="space-y-2">
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    We&apos;ll send you a magic link to sign in without a password.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? 'Loading...' : 
                isLogin ? 
                  (useMagicLink ? 'Send Magic Link' : 'Sign In') : 
                  'Create Account'
              }
            </Button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setSuccess('');
                setUseMagicLink(false); // Reset magic link when switching modes
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"
              }
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Footer Links */}
      <div className="absolute bottom-4 left-4 flex gap-3">
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
    </div>
  );
}