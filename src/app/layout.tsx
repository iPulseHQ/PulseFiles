import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ClerkProvider } from '@clerk/nextjs';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { Databuddy } from '@databuddy/sdk/react';

export const metadata: Metadata = {
  title: "PulseFiles",
  description: "Upload and share files securely",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="google-adsense-account" content="ca-pub-5724591609111321" />
  {/* Prefer explicit PNG/ICO favicons for clearer browser tab rendering */}
  <link rel="icon" href="/favicon.ico" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
  {/* SVG as fallback */}
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-icon.png" />
  <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5724591609111321"
          crossOrigin="anonymous"
        />
      </head>
      <body className="font-sans antialiased">
        <ClerkProvider>
          <AuthProvider>
            <LanguageProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
              >
                {children}
                <Databuddy
                  clientId="kPYGRD-TUMGUcNMsZ1RHY"
                  trackHashChanges={true}
                  trackAttributes={true}
                  trackOutgoingLinks={true}
                  trackInteractions={true}
                  trackScrollDepth={true}
                  trackWebVitals={true}
                  trackErrors={true}
                  enableBatching={true}
                />
              </ThemeProvider>
            </LanguageProvider>
          </AuthProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
