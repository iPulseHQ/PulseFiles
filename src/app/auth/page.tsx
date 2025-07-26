'use client';

import { ThemeToggle } from '@/components/theme-toggle';
import { SignIn, SignUp } from '@clerk/nextjs';
import { ArrowLeft, Info } from 'lucide-react';
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
    </div>
  );
}