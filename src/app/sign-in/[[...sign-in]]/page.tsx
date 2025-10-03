'use client';

import { SignIn } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { motion } from 'framer-motion';
import { Upload, FileCheck, Shield } from 'lucide-react';
import Image from 'next/image';
import { useTheme } from 'next-themes';

export default function SignInPage() {
  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === 'system' ? systemTheme : theme;

  const features = [
    {
      icon: Upload,
      title: 'Eenvoudig Delen',
      description: 'Upload en deel bestanden met één klik'
    },
    {
      icon: FileCheck,
      title: 'Veilig & Betrouwbaar',
      description: 'Je bestanden zijn veilig opgeslagen'
    },
    {
      icon: Shield,
      title: 'Privacy First',
      description: 'End-to-end encryptie voor al je bestanden'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="relative flex min-h-screen">
        {/* Left Side - Branding & Features */}
        <motion.div
          className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 xl:px-16"
          initial={{ x: -20 }}
          animate={{ x: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
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
                Welkom terug
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Log in om je bestanden te beheren en te delen met anderen.
              </p>
            </div>

            {/* Features */}
            <div className="space-y-6">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  className="flex items-start gap-4"
                  whileHover={{ x: 4 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Right Side - Auth Form */}
        <div className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <motion.div
            className="w-full max-w-md mx-auto"
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {/* Mobile Logo */}
            <motion.div
              className="lg:hidden flex items-center justify-center gap-3 mb-8"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div className="relative w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Upload className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">
                PulseFiles
              </h1>
            </motion.div>

            {/* Auth Card */}
            <div>
              <SignIn
                fallbackRedirectUrl="/"
                appearance={{
                  baseTheme: currentTheme === 'dark' ? dark : undefined,
                }}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
