import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredFiles, cleanupOrphanedFiles, getCleanupStats } from '@/lib/cleanup';

// Simple API key authentication for admin operations
function isAuthorized(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key');
  const adminKey = process.env.ADMIN_API_KEY;
  
  if (!adminKey) {
    console.warn('ADMIN_API_KEY not set - admin operations disabled');
    return false;
  }
  
  return apiKey === adminKey;
}

export async function POST(request: NextRequest) {
  // Check authorization
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: 'Unauthorized - Invalid API key' },
      { status: 401 }
    );
  }

  try {
    const { action } = await request.json();

    switch (action) {
      case 'cleanup-expired':
        console.log('🧹 Manual cleanup triggered...');
        const expiredResult = await cleanupExpiredFiles();
        return NextResponse.json({
          success: true,
          action: 'cleanup-expired',
          result: expiredResult
        });

      case 'cleanup-orphaned':
        console.log('🔍 Manual orphaned cleanup triggered...');
        const orphanedResult = await cleanupOrphanedFiles();
        return NextResponse.json({
          success: true,
          action: 'cleanup-orphaned',
          result: orphanedResult
        });

      case 'cleanup-all':
        console.log('🧹 Full cleanup triggered...');
        const [expiredRes, orphanedRes] = await Promise.all([
          cleanupExpiredFiles(),
          cleanupOrphanedFiles()
        ]);
        
        return NextResponse.json({
          success: true,
          action: 'cleanup-all',
          result: {
            expired: expiredRes,
            orphaned: orphanedRes,
            totalDeleted: expiredRes.deletedFiles + orphanedRes.deletedFiles,
            totalFreed: expiredRes.deletedSize + orphanedRes.deletedSize
          }
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: cleanup-expired, cleanup-orphaned, or cleanup-all' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Cleanup API error:', error);
    return NextResponse.json(
      { error: 'Cleanup operation failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Check authorization
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: 'Unauthorized - Invalid API key' },
      { status: 401 }
    );
  }

  try {
    const stats = await getCleanupStats();
    
    if (!stats) {
      return NextResponse.json(
        { error: 'Failed to get cleanup statistics' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      stats,
      lastUpdate: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cleanup stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get cleanup statistics' },
      { status: 500 }
    );
  }
}