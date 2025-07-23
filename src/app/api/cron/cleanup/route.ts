import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredFiles, cleanupOrphanedFiles } from '@/lib/cleanup';

// Vercel cron jobs send a special header
function isValidCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    console.warn('CRON_SECRET not set - cron jobs disabled');
    return false;
  }
  
  return authHeader === `Bearer ${cronSecret}`;
}

// Alternative authentication for other platforms
function isAuthorizedCron(request: NextRequest): boolean {
  // Check for Vercel cron
  if (isValidCronRequest(request)) return true;
  
  // Check for manual trigger with admin key
  const apiKey = request.headers.get('x-api-key');
  const adminKey = process.env.ADMIN_API_KEY;
  
  return apiKey === adminKey;
}

export async function GET(request: NextRequest) {
  // Check if this is a valid cron request
  if (!isAuthorizedCron(request)) {
    return NextResponse.json(
      { error: 'Unauthorized - Invalid cron authentication' },
      { status: 401 }
    );
  }

  const startTime = Date.now();
  
  try {
    console.log('🕐 Scheduled cleanup started at:', new Date().toISOString());
    
    // Run both cleanup operations
    const [expiredResult, orphanedResult] = await Promise.all([
      cleanupExpiredFiles(),
      cleanupOrphanedFiles()
    ]);

    const totalDuration = Date.now() - startTime;
    const totalDeleted = expiredResult.deletedFiles + orphanedResult.deletedFiles;
    const totalFreed = expiredResult.deletedSize + orphanedResult.deletedSize;
    const allErrors = [...expiredResult.errors, ...orphanedResult.errors];

    // Log results
    console.log('📊 Scheduled cleanup completed:', {
      duration: `${totalDuration}ms`,
      deletedFiles: totalDeleted,
      freedSpace: `${(totalFreed / 1024 / 1024).toFixed(2)} MB`,
      errors: allErrors.length
    });

    // Return results
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      results: {
        expired: {
          deletedFiles: expiredResult.deletedFiles,
          deletedSize: expiredResult.deletedSize,
          errors: expiredResult.errors,
          duration: expiredResult.duration
        },
        orphaned: {
          deletedFiles: orphanedResult.deletedFiles,
          deletedSize: orphanedResult.deletedSize, 
          errors: orphanedResult.errors,
          duration: orphanedResult.duration
        },
        totals: {
          deletedFiles: totalDeleted,
          freedSpace: totalFreed,
          errors: allErrors
        }
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('❌ Scheduled cleanup failed:', errorMessage);
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
        duration
      },
      { status: 500 }
    );
  }
}

// Allow POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}