import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Vercel cron jobs send a special header
function isValidCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  // If CRON_SECRET is not set, we can't verify the request securely.
  // However, blocking it might prevent the keep-alive from working if the user forgot to set it.
  // For a simple keep-alive that just does a SELECT 1, the security risk is low.
  // But to follow best practices, we should still require it or a specific key.
  
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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Simple query to keep Supabase active
    const { error } = await supabase.from('shared_files').select('id').limit(1);

    if (error) {
      console.error('Keep-alive ping error:', error);
      // We still return 200 because the "ping" (network request) happened, 
      // even if the query failed (e.g. table permission issues). 
      // Activity is activity.
      return NextResponse.json({ 
        success: false, 
        message: 'Ping attempted but DB returned error',
        error: error.message 
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Supabase kept alive', 
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
