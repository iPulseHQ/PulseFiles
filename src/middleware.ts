import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher([
  '/',
  '/dashboard(.*)',
  '/admin(.*)',
  '/account(.*)',
  '/api/upload(.*)',
  '/api/upload-chunk(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect()

  const response = NextResponse.next();

  // Add security headers
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Content Security Policy with Clerk support
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.pulseguard.pro https://clerk.ipulse.one https://*.clerk.dev https://*.clerk.accounts.dev https://*.googleapis.com https://cdn.databuddy.cc",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https: wss: *.supabase.co https://o447951.ingest.sentry.io https://clerk.pulseguard.pro https://clerk.ipulse.one https://*.clerk.dev https://*.clerk.accounts.dev https://*.clerk.com wss://*.clerk.dev wss://*.clerk.accounts.dev https://cdn.databuddy.cc https://*.databuddy.cc",
    "frame-src 'self' https://clerk.pulseguard.pro https://clerk.ipulse.one https://*.clerk.dev https://*.clerk.accounts.dev",
    "worker-src 'self' blob:",
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);
  
  // Block access to sensitive files
  if (req.nextUrl.pathname.includes('/.env') || 
      req.nextUrl.pathname.includes('/.git') ||
      req.nextUrl.pathname.includes('/node_modules')) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // Rate limiting for API routes (basic implementation)
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    
    // Add basic bot detection
    const userAgent = req.headers.get('user-agent') || '';
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /python/i,
      /curl/i,
      /wget/i,
    ];
    
    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));
    
    if (isSuspicious && !userAgent.includes('Google') && !userAgent.includes('Bing')) {
      console.log(`Blocked suspicious request from ${ip}: ${userAgent}`);
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  // Add CORS headers for API routes
  if (req.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_SITE_URL || '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  return response;
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};