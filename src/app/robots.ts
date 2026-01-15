import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://files.ipulse.one'
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard',
          '/account',
          '/admin',
          '/sign-in',
          '/sign-up',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
