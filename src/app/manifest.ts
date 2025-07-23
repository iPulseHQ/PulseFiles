import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'OpenFiles - Secure File Sharing',
    short_name: 'OpenFiles',
    description: 'Upload and share files securely with end-to-end encryption',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0f172a',
    theme_color: '#3B82F6',
    scope: '/',
    categories: ['productivity', 'utilities'],
    lang: 'nl',
    icons: [
      {
        src: '/favicon-16.png',
        sizes: '16x16',
        type: 'image/png',
      },
      {
        src: '/favicon-32.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable any',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable any',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
      }
    ],
  }
}