'use client';

import { SignUp } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { motion } from 'framer-motion';
import { ArrowLeft, Zap, Clock, Star, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Upload } from 'lucide-react';

export default function SignUpPage() {
  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === 'system' ? systemTheme : theme;

  const benefits = [
    {
      icon: Zap,
      title: 'Snelle Uploads',
      description: 'Upload bestanden razendsnel met onze geoptimaliseerde infrastructuur'
    },
    {
      icon: Clock,
      title: 'Altijd Beschikbaar',
      description: 'Toegang tot je bestanden wanneer je maar wilt'
    },
    {
      icon: Star,
      title: 'Enterprise Grade',
      description: 'Betrouwbare bestandsopslag voor professionals'
    }
  ];

  const features = [
    'Veilige bestandsopslag',
    'Eenvoudig delen met links',
    'End-to-end encryptie',
    'Automatische backups',
    'Email notificaties',
    'Onbeperkte downloads'
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="relative flex min-h-screen">
        {/* Left Side - Branding & Benefits */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 xl:px-16">
          <div className="max-w-lg">
            {/* Logo & Title */}
            <div className="flex items-center gap-3 mb-8">
              <div className="relative w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <Upload className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  PulseFiles
                </h1>
                <p className="text-muted-foreground text-sm">Veilig Bestanden Delen</p>
              </div>
            </div>

            {/* Welcome Text */}
            <div className="mb-12">
              <h2 className="text-4xl xl:text-5xl font-bold text-foreground mb-4 leading-tight">
                Start vandaag
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                Maak een account aan om je bestanden veilig te delen.
              </p>

              {/* Feature List */}
              <div className="grid grid-cols-1 gap-3 mb-8">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3"
                  >
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-6">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4"
                >
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      {benefit.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-8">
          <div className="w-full max-w-md">
            {/* Back Button - Mobile Only */}
            <div className="lg:hidden mb-8">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Terug naar home</span>
              </Link>
            </div>

            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
              <div className="relative w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Upload className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">
                PulseFiles
              </h1>
            </div>

            {/* Auth Card */}
            <div>
              <SignUp
                fallbackRedirectUrl="/"
                appearance={{
                  baseTheme: currentTheme === 'dark' ? dark : undefined,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
