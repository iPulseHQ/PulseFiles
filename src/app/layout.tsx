import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ClerkProvider } from '@clerk/nextjs';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { Databuddy } from '@databuddy/sdk/react';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://files.ipulse.one';

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'PulseFiles - Veilig bestanden delen tot 10GB',
    template: '%s | PulseFiles',
  },
  description: 'Deel bestanden veilig en snel met end-to-end encryptie. Upload tot 10GB, stel wachtwoordbeveiliging in, bepaal download limieten en vervaldatums. Gratis en zonder account.',
  keywords: [
    'bestanden delen',
    'file sharing',
    'veilig uploaden',
    'grote bestanden versturen',
    'WeTransfer alternatief',
    'end-to-end encryptie',
    'wachtwoord beveiliging',
    'gratis file transfer',
    'bestanden verzenden',
    'secure file sharing',
  ],
  authors: [{ name: 'iPulse', url: 'https://ipulse.one' }],
  creator: 'iPulse',
  publisher: 'iPulse',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: '/',
    languages: {
      'nl-NL': '/',
      'en-US': '/',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'nl_NL',
    alternateLocale: 'en_US',
    url: baseUrl,
    siteName: 'PulseFiles',
    title: 'PulseFiles - Veilig bestanden delen tot 10GB',
    description: 'Deel bestanden veilig en snel met end-to-end encryptie. Upload tot 10GB, stel wachtwoordbeveiliging in, bepaal download limieten en vervaldatums.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'PulseFiles - Secure File Sharing',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PulseFiles - Veilig bestanden delen tot 10GB',
    description: 'Deel bestanden veilig en snel met end-to-end encryptie. Gratis, zonder account, tot 10GB.',
    images: ['/og-image.png'],
    creator: '@ipulse_one',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
  category: 'technology',
};

// JSON-LD Structured Data for rich search results
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'PulseFiles',
  description: 'Veilig bestanden delen met end-to-end encryptie. Upload tot 10GB, stel wachtwoordbeveiliging in, bepaal download limieten en vervaldatums.',
  url: baseUrl,
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Any',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'EUR',
  },
  featureList: [
    'End-to-end encryptie',
    'Tot 10GB uploads',
    'Wachtwoordbeveiliging',
    'Download limieten',
    'Aangepaste vervaldatums',
    'Geen account nodig',
  ],
  author: {
    '@type': 'Organization',
    name: 'iPulse',
    url: 'https://ipulse.one',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <meta name="google-adsense-account" content="ca-pub-5724591609111321" />
  {/* Prefer explicit PNG/ICO favicons for clearer browser tab rendering */}
  <link rel="icon" href="/favicon.ico" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
  {/* SVG as fallback */}
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-icon.png" />
  <link rel="manifest" href="/manifest.json" />
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
