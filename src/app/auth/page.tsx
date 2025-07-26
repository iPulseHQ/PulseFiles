'use client';

import { ThemeToggle } from '@/components/theme-toggle';
import { SignIn, SignUp } from '@clerk/nextjs';
import { Github, ArrowLeft, Heart, Info } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import React from 'react';
import { Button } from '@/components/ui/button';

export default function AuthPage() {
  // Redirect to Clerk hosted auth pages
  React.useEffect(() => {
    const clerkSignInUrl = `https://lucky-gannet-78.accounts.dev/sign-in?redirect_url=${encodeURIComponent(window.location.origin)}`;
    window.location.href = clerkSignInUrl;
  }, []);

  const [isSignUp, setIsSignUp] = useState(false);

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

      <div className="flex flex-col items-center gap-4">
        {/* Toggle between Sign In and Sign Up */}
        <div className="flex gap-2">
          <Button
            variant={!isSignUp ? "default" : "outline"}
            onClick={() => setIsSignUp(false)}
            size="sm"
          >
            Sign In
          </Button>
          <Button
            variant={isSignUp ? "default" : "outline"}
            onClick={() => setIsSignUp(true)}
            size="sm"
          >
            Sign Up
          </Button>
        </div>

        {/* Clerk Auth Components */}
        {isSignUp ? (
          <SignUp 
            routing="hash"
            redirectUrl="/"
            signInUrl="/auth"
          />
        ) : (
          <SignIn 
            routing="hash"
            redirectUrl="/"
            signUpUrl="/auth"
          />
        )}
      </div>

      {/* Footer Links */}
      <div className="absolute bottom-4 left-4 flex gap-3">
        <a
          href="https://github.com/pulsefilesapp/pulsefiles"
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