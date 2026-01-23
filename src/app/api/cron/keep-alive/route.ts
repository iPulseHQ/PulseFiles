import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// Vercel cron jobs send a special header
function isValidCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    // Fallback: Check for a custom API key if CRON_SECRET is missing
    const apiKey = request.headers.get('x-api-key');
    const adminKey = process.env.ADMIN_API_KEY;
    if (apiKey && adminKey && apiKey === adminKey) return true;

    console.warn('CRON_SECRET not set and no valid ADMIN_API_KEY provided');
    return false;
  }
  
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  // Check auth
  if (!isValidCronRequest(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Simple query to keep Neon database active
    await sql`SELECT 1`;

    return NextResponse.json({ 
      success: true, 
      message: 'Neon database kept alive', 
      timestamp: new Date().toISOString() 
    });

  } catch (error) {
    console.error('Keep-alive failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
